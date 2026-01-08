
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Settings, 
  Scan, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  ArrowLeft,
  CheckCircle2,
  Package,
  History,
  LogOut,
  Edit,
  ChevronRight,
  Download,
  ShieldCheck,
  Store,
  Lock,
  Check,
  Smartphone,
  Landmark,
  Wallet,
  Loader2,
  Printer,
  Ticket,
  Tag,
  X,
  AlertTriangle,
  Users,
  Briefcase,
  ShoppingBag,
  Star,
  Gift,
  Trophy,
  QrCode,
  UserCheck,
  Coins,
  Globe,
  Banknote,
  Info
} from 'lucide-react';
import { loadData, saveData } from './storage';
import { Product, CartItem, SaleRecord, PaymentConfig, Reward, PaymentGatewayType } from './types';
import Scanner from './components/Scanner';

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { 
  style: 'currency', 
  currency: 'INR',
  maximumFractionDigits: 2 
}).format(n);

const MOCK_REWARDS: Reward[] = [
  { id: 'r1', title: 'Free Coffee', description: 'Redeem at the cafeteria', pointsRequired: 500, code: 'COFFEE-FREE' },
  { id: 'r2', title: '₹100 Gift Card', description: 'Valid on next purchase', pointsRequired: 1000, code: 'GIFT-100' },
  { id: 'r3', title: '50% Off Bakery', description: 'Single use coupon', pointsRequired: 300, code: 'BAKE-50' },
];

const App: React.FC = () => {
  const [initialData] = useState(() => loadData());
  
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [sales, setSales] = useState<SaleRecord[]>(initialData.sales);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(initialData.paymentConfig);
  const [points, setPoints] = useState(750);
  
  const [view, setView] = useState<'home' | 'cart' | 'checkout' | 'token' | 'receipt' | 'admin' | 'admin_sales' | 'admin_products' | 'admin_payment' | 'manager_setup' | 'processing_payment' | 'terminal_select' | 'auth_prompt' | 'rewards' | 'verify_result'>('home');
  const [targetRole, setTargetRole] = useState<'staff' | 'manager' | null>(null);
  const [authenticatedRole, setAuthenticatedRole] = useState<'staff' | 'manager' | null>(null);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'cart' | 'admin' | 'verify'>('cart');
  const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
  const [verificationResult, setVerificationResult] = useState<SaleRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  
  const [setupManagerPin, setSetupManagerPin] = useState('');
  const [setupStaffPin, setSetupStaffPin] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentGatewayType>('DIRECT_UPI');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [resumeScanner, setResumeScanner] = useState(false);

  useEffect(() => {
    saveData({ products, sales, paymentConfig });
  }, [products, sales, paymentConfig]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.tax / 100)), 0);
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }, [cart]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleScan = (barcode: string): { success: boolean, name?: string, price?: number } => {
    if (scannerMode === 'cart') {
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        setCart(prev => {
          const existing = prev.find(item => item.id === product.id);
          if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
          }
          return [...prev, { ...product, quantity: 1 }];
        });
        return { success: true, name: product.name, price: product.price };
      }
    } else if (scannerMode === 'admin') {
      const existingProduct = products.find(p => p.barcode === barcode);
      setIsScannerOpen(false);
      setResumeScanner(true); 
      if (existingProduct) {
        setIsNewProduct(false);
        setEditingProduct(existingProduct);
        return { success: true, name: existingProduct.name, price: existingProduct.price };
      } else {
        setIsNewProduct(true);
        setEditingProduct({ id: '', name: 'New Product', barcode, price: 0, tax: 0, stock: 0 });
        return { success: true, name: 'New Item', price: 0 };
      }
    } else if (scannerMode === 'verify') {
      const sale = sales.find(s => s.tokenId.includes(barcode) || s.tokenId === barcode);
      setIsScannerOpen(false);
      if (sale) {
        setVerificationResult(sale);
        setView('verify_result');
        return { success: true, name: 'Token Verified', price: sale.total };
      } else {
        alert("Invalid Token: No matching sale record found.");
        return { success: false };
      }
    }
    return { success: false };
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const processPayment = () => {
    setView('processing_payment');
    
    setTimeout(() => {
      const newInvoiceNo = `INV/${new Date().getFullYear()}/${paymentConfig.lastInvoiceIndex + 1}`;
      const tokenId = `QT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      
      const newSale: SaleRecord = {
        id: Math.random().toString(36).substring(7),
        invoiceNo: newInvoiceNo,
        items: [...cart],
        total: totals.total,
        taxTotal: totals.taxTotal,
        timestamp: Date.now(),
        tokenId,
        billAccessCode: 'PAID',
        status: 'paid',
        gatewayUsed: paymentMethod
      };

      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(ci => ci.id === p.id);
        return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
      }));

      setSales(prev => [newSale, ...prev]);
      setPaymentConfig(prev => ({ ...prev, lastInvoiceIndex: prev.lastInvoiceIndex + 1 }));
      setPoints(prev => prev + Math.floor(totals.total / 10)); 
      setCart([]);
      setActiveSale(newSale);
      setView('receipt');
      showToast("Payment Processed Successfully");
    }, 2500);
  };

  const verifyToken = () => {
    if (verificationResult) {
      setSales(prev => prev.map(s => s.id === verificationResult.id ? { ...s, status: 'verified' } : s));
      showToast("Customer Verification Completed");
      setView('admin');
    }
  };

  const handleTerminalAccess = (role: 'staff' | 'manager') => {
    setTargetRole(role);
    setPinInput('');
    if (!paymentConfig.managerPin) {
      setView('manager_setup');
      setTargetRole('manager');
    } else {
      setView('auth_prompt');
    }
  };

  const handleAuth = () => {
    const correctPin = targetRole === 'manager' ? paymentConfig.managerPin : paymentConfig.staffPin;
    if (pinInput === correctPin) {
      setAuthenticatedRole(targetRole);
      setView('admin');
      setPinInput('');
    } else {
      alert("Invalid Security PIN");
      setPinInput('');
    }
  };

  const saveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated = {
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      tax: parseFloat(formData.get('tax') as string),
      stock: parseInt(formData.get('stock') as string),
    };

    if (isNewProduct) {
      const newP: Product = {
        ...editingProduct!,
        ...updated,
        id: Math.random().toString(36).substring(7),
      };
      setProducts(prev => [...prev, newP]);
      showToast("New Product Registered");
    } else {
      setProducts(prev => prev.map(p => p.id === editingProduct!.id ? { ...p, ...updated } : p));
      showToast("Registry Updated");
    }
    setEditingProduct(null);
  };

  const renderReceiptView = () => {
    if (!activeSale) return null;
    const { items, total, taxTotal, invoiceNo, timestamp, tokenId, gatewayUsed } = activeSale;

    return (
      <div className="h-full flex flex-col bg-gray-100 animate-in slide-in-from-bottom duration-500 overflow-hidden">
        <header className="p-6 pt-12 flex justify-between items-center bg-white border-b border-gray-200">
          <button onClick={() => setView('home')} className="p-3 bg-gray-50 rounded-2xl active:scale-90 transition-transform"><ArrowLeft size={24}/></button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
             <CheckCircle2 size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">Digital Bill Verified</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Store Header */}
            <div className="p-8 pb-6 border-b border-dashed border-gray-300 relative text-center">
              <div className="w-16 h-16 bg-gray-950 text-white rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Store size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase leading-tight">{paymentConfig.storeName}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{paymentConfig.storeAddress}</p>
              <div className="mt-4 flex flex-col gap-1">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">GSTIN: {paymentConfig.gstin}</p>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">PH: {paymentConfig.phoneNumber}</p>
              </div>
              {/* Decorative side cuts */}
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gray-100 rounded-full"></div>
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-gray-100 rounded-full"></div>
            </div>

            {/* Bill Info */}
            <div className="p-8 py-6 border-b border-gray-100 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
              <div className="flex flex-col gap-1">
                <span>Inv: #{invoiceNo.split('/')[2]}</span>
                <span>Date: {new Date(timestamp).toLocaleDateString()}</span>
              </div>
              <div className="text-right flex flex-col gap-1">
                <span>Time: {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Method: {gatewayUsed}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-8 py-6 receipt-font text-[11px]">
              <div className="flex justify-between font-black border-b border-gray-200 pb-2 mb-4 uppercase tracking-tighter text-gray-400">
                <span className="flex-[3]">Description</span>
                <span className="flex-1 text-center">Qty</span>
                <span className="flex-[2] text-right">Amount</span>
              </div>
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between leading-snug">
                    <span className="flex-[3] font-bold text-gray-800 uppercase">{it.name}</span>
                    <span className="flex-1 text-center text-gray-600">{it.quantity}</span>
                    <span className="flex-[2] text-right font-bold text-gray-950">{fmt(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="p-8 py-6 bg-gray-50 border-t border-b border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Subtotal</span>
                <span>{fmt(total - taxTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Tax (GST)</span>
                <span>{fmt(taxTotal)}</span>
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className="text-xs font-black text-gray-950 uppercase tracking-widest">Net Payable</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{fmt(total)}</span>
              </div>
            </div>

            {/* Security Section / Exit Token */}
            <div className="p-8 pt-10 pb-12 bg-gray-950 text-white flex flex-col items-center">
              <div className="flex items-center gap-2 mb-8 opacity-40">
                <ShieldCheck size={14} />
                <p className="text-[9px] font-black uppercase tracking-[0.4em]">Secure Exit Clearance</p>
              </div>
              
              <div className="bg-white p-5 rounded-3xl mb-8 shadow-2xl transition-transform active:scale-95 cursor-pointer">
                <QrCode size={180} className="text-gray-950" />
              </div>
              
              <p className="text-xs font-black text-emerald-400/60 uppercase tracking-[0.3em] mb-2">Gate Token ID</p>
              <p className="text-4xl font-black tracking-[0.3em] font-mono text-emerald-400 mb-8">{tokenId.split('-')[1]}</p>
              
              <div className="w-full border-t border-white/10 pt-8 text-center">
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mb-2">Verified Digital Signature</p>
                <p className="text-[9px] font-black text-white/20 italic">Thank you for shopping at QuickMart</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 md:p-8 bg-white border-t border-gray-200 grid grid-cols-2 gap-4">
          <button className="py-5 bg-white border border-gray-200 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex flex-col items-center justify-center gap-2 hover:bg-gray-50 shadow-sm">
            <Download size={20} className="text-gray-400"/>
            Save E-Bill
          </button>
          <button onClick={() => setView('home')} className="py-5 bg-emerald-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-600/20">
            <ShoppingBag size={20}/>
            Done
          </button>
        </div>
      </div>
    );
  };

  const renderRewards = () => (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="p-8 pt-16 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('home')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black text-gray-950 tracking-tighter">My Rewards</h1>
        </div>
        <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-2xl shadow-emerald-600/20">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Loyalty Points</p>
            <p className="text-4xl font-black tracking-tighter mt-1">{points}</p>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md">
            <Trophy size={32} />
          </div>
        </div>
      </header>
      <div className="flex-1 p-8 space-y-6 overflow-y-auto">
        {MOCK_REWARDS.map(reward => (
          <div key={reward.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center gap-6 shadow-sm">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${points >= reward.pointsRequired ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-300'}`}>
              <Gift size={28} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-gray-950 text-sm leading-tight">{reward.title}</h4>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{reward.pointsRequired} Points Required</p>
            </div>
            <button 
              disabled={points < reward.pointsRequired}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${points >= reward.pointsRequired ? 'bg-gray-950 text-white active:scale-95' : 'bg-gray-100 text-gray-300'}`}
            >
              Redeem
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVerifyResult = () => (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
      {verificationResult ? (
        <div className="w-full max-w-xs text-center">
          <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ${verificationResult.status === 'verified' ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <Check size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-950 tracking-tighter mb-2">Token Valid</h2>
          <p className="text-gray-400 font-bold text-sm mb-10 uppercase tracking-widest">Sale Verified for {verificationResult.invoiceNo}</p>
          
          <div className="bg-gray-50 rounded-[2rem] p-6 mb-10 text-left space-y-4">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
              <span>Items</span>
              <span className="text-gray-950">{verificationResult.items.length}</span>
            </div>
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
              <span>Total Paid</span>
              <span className="text-emerald-600">{fmt(verificationResult.total)}</span>
            </div>
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
              <span>Gateway</span>
              <span className="text-gray-950">{verificationResult.gatewayUsed}</span>
            </div>
          </div>

          <button 
            onClick={verifyToken}
            className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 mb-4"
          >
            Mark as Cleared
          </button>
          <button onClick={() => setView('admin')} className="text-xs font-black text-gray-400 uppercase tracking-widest">Dismiss</button>
        </div>
      ) : (
        <div className="text-center">
          <X size={64} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-950">Invalid Token</h2>
          <button onClick={() => setView('admin')} className="mt-8 text-xs font-black text-gray-400 uppercase tracking-widest">Back to Dashboard</button>
        </div>
      )}
    </div>
  );

  const renderAdminPayment = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="p-6 pt-12 flex items-center gap-4 bg-white border-b border-gray-100">
        <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Gateway Settings</h1>
      </header>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
          <div>
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 mb-4 block">Default Store Gateway</label>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'DIRECT_UPI', label: 'Direct UPI', icon: <Smartphone size={20}/>, desc: 'Instant bank transfer' },
                { id: 'RAZORPAY_GATEWAY', label: 'Razorpay', icon: <CreditCard size={20}/>, desc: 'Cards, Netbanking, Wallets' },
                { id: 'COUNTER_PAY', label: 'Counter Pay', icon: <Store size={20}/>, desc: 'Walk-in cash payment' }
              ].map(gw => (
                <button 
                  key={gw.id}
                  onClick={() => setPaymentConfig(prev => ({ ...prev, gatewayType: gw.id as any }))}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${paymentConfig.gatewayType === gw.id ? 'border-emerald-600 bg-emerald-50' : 'border-gray-50 bg-gray-50/50'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentConfig.gatewayType === gw.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {gw.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-gray-950 text-sm">{gw.label}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{gw.desc}</p>
                  </div>
                  {paymentConfig.gatewayType === gw.id && <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white"><Check size={14}/></div>}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setView('admin'); showToast("Gateway Settings Updated"); }} className="w-full py-6 bg-gray-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl">Save Changes</button>
        </div>
      </div>
    </div>
  );

  const renderAdminHome = () => (
    <div className={`h-full flex flex-col ${authenticatedRole === 'manager' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
      <header className="p-8 pt-16 flex items-center justify-between text-white">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">{authenticatedRole} Portal</h1>
          <p className="text-white/60 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Verified Operator</p>
        </div>
        <button onClick={() => { setAuthenticatedRole(null); setView('terminal_select'); }} className="p-4 bg-white/10 text-white rounded-[2rem] border border-white/20 active:scale-90 transition-all"><LogOut size={22} /></button>
      </header>
      
      <div className="flex-1 bg-white rounded-t-[4rem] px-8 py-10 space-y-8 overflow-y-auto">
        <div className="grid grid-cols-2 gap-6">
          <button onClick={() => setView('admin_products')} className="bg-white border-2 border-gray-50 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm transition-all">
            <div className={`w-16 h-16 ${authenticatedRole === 'manager' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner`}><Package size={32} /></div>
            <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Inventory</span>
          </button>
          
          <button 
            onClick={() => { setScannerMode('verify'); setIsScannerOpen(true); }}
            className="bg-white border-2 border-gray-100 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm transition-all"
          >
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><UserCheck size={32} /></div>
            <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Verify Token</span>
          </button>
          
          {authenticatedRole === 'manager' && (
            <>
              <button onClick={() => setView('admin_sales')} className="bg-white border-2 border-gray-50 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm transition-all">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><History size={32} /></div>
                <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Sales Audit</span>
              </button>
              <button onClick={() => setView('admin_payment')} className="bg-white border-2 border-gray-50 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm transition-all">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><Settings size={32} /></div>
                <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Gateway</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderCustomerHome = () => (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <header className="p-8 pt-16 flex items-center justify-between z-10">
        <div>
          <h1 className="text-4xl font-black text-gray-950 tracking-tighter">{paymentConfig.storeName || 'QuickMart'}</h1>
          <div className="flex gap-2 items-center mt-2">
            <span className="text-emerald-600 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-1"><CheckCircle2 size={12}/> Open</span>
            <button onClick={() => setView('rewards')} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1 uppercase tracking-widest"><Star size={10} fill="currentColor"/> {points} Pts</button>
          </div>
        </div>
        <button onClick={() => setView('terminal_select')} className="p-4 bg-gray-50 text-gray-400 rounded-3xl border border-gray-100 active:scale-90"><ShieldCheck size={24}/></button>
      </header>

      <div className="flex-1 px-8 overflow-y-auto pb-44">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="w-32 h-32 bg-gray-50 text-gray-200 rounded-[3rem] flex items-center justify-center mb-10 shadow-inner">
              <ShoppingCart size={64} />
            </div>
            <h2 className="text-2xl font-black text-gray-950 tracking-tighter mb-4">Start Shopping</h2>
            <p className="text-gray-400 font-bold text-sm max-w-[240px]">Scan products to add them to your cart. Skip the checkout lines forever.</p>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Basket ({cart.length})</h3>
                <button onClick={() => setView('cart')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Summary <ChevronRight size={12}/></button>
             </div>
             {cart.map(item => (
                <div key={item.id} className="bg-white border border-gray-100 p-5 rounded-[2.5rem] flex items-center gap-5 shadow-sm animate-in slide-in-from-right duration-300">
                   <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300"><Package size={24}/></div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-950 text-xs truncate leading-tight">{item.name}</h4>
                      <p className="text-emerald-600 font-black text-xs mt-1">{fmt(item.price)} <span className="text-gray-400">x{item.quantity}</span></p>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center active:scale-90"><Minus size={14}/></button>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center active:scale-90"><Plus size={14}/></button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 pt-10 bg-gradient-to-t from-white via-white pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          {cart.length > 0 && (
            <button 
              onClick={() => setView('cart')}
              className="flex-1 h-20 bg-emerald-600 text-white rounded-[2.5rem] flex items-center justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-emerald-500/20"
            >
              <div className="text-left">
                <p className="text-emerald-200 text-[9px] font-black uppercase tracking-widest">Total</p>
                <p className="text-xl font-black">{fmt(totals.total)}</p>
              </div>
              <ChevronRight size={24} />
            </button>
          )}
          <button 
            onClick={() => { setScannerMode('cart'); setIsScannerOpen(true); }}
            className={`h-20 bg-gray-950 text-white rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all ${cart.length === 0 ? 'w-full' : 'w-20'}`}
          >
            <Scan size={32} />
            {cart.length === 0 && <span className="text-lg font-black uppercase tracking-widest">Scan Items</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-screen relative bg-white overflow-hidden shadow-2xl flex flex-col border-x border-gray-100">
      <div className="flex-1 relative overflow-hidden">
        {view === 'home' && renderCustomerHome()}
        {view === 'rewards' && renderRewards()}
        {view === 'cart' && (
          <div className="h-full flex flex-col bg-gray-50">
            <header className="p-6 pt-12 flex items-center justify-between bg-white border-b border-gray-100">
              <button onClick={() => setView('home')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24}/></button>
              <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Review Order</h1>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase">{cart.length} Items</span>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-5 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400"><Package size={28}/></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-950 text-sm truncate mb-1">{item.name}</h4>
                    <p className="text-emerald-600 font-black text-lg">{fmt(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Minus size={14}/></button>
                    <span className="font-black text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Plus size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white p-8 border-t border-gray-100 space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Payable</span>
                <span className="text-3xl font-black text-gray-950">{fmt(totals.total)}</span>
              </div>
              <button onClick={() => setView('checkout')} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Select Payment</button>
            </div>
          </div>
        )}
        {view === 'checkout' && (
          <div className="h-full flex flex-col bg-white overflow-hidden">
            <header className="p-6 pt-12 flex items-center gap-4 border-b border-gray-200">
              <button onClick={() => setView('cart')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24}/></button>
              <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Choose Payment</h1>
            </header>
            <div className="flex-1 p-8 overflow-y-auto pb-10">
              <div className="text-center mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Amount</p>
                <h2 className="text-5xl font-black text-gray-950 tracking-tighter mt-2">{fmt(totals.total)}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'DIRECT_UPI', label: 'UPI / QR', icon: <Smartphone size={24}/> },
                  { id: 'CARD', label: 'Card Payment', icon: <CreditCard size={24}/> },
                  { id: 'NETBANKING', label: 'Net Banking', icon: <Landmark size={24}/> },
                  { id: 'CRYPTO', label: 'Crypto', icon: <Coins size={24}/> },
                  { id: 'GOOGLE_PAY', label: 'Google Pay', icon: <Globe size={24}/> },
                  { id: 'E_WALLET', label: 'Wallets', icon: <Wallet size={24}/> },
                  { id: 'COUNTER_PAY', label: 'At Counter', icon: <Banknote size={24}/> },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id as PaymentGatewayType)}
                    className={`p-6 rounded-[2.5rem] border-2 flex flex-col items-center justify-center gap-4 transition-all active:scale-95 ${paymentMethod === option.id ? 'border-emerald-600 bg-emerald-50' : 'border-gray-50 bg-gray-50/30'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentMethod === option.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                      {option.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${paymentMethod === option.id ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {option.label}
                    </span>
                    {paymentMethod === option.id && <div className="absolute top-4 right-4"><CheckCircle2 size={16} className="text-emerald-600"/></div>}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-gray-50 rounded-[2.5rem] flex items-center gap-4 border border-gray-100">
                 <ShieldCheck size={20} className="text-emerald-600" />
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Secured via end-to-end {paymentMethod.replace('_', ' ')} protocol</p>
              </div>
            </div>
            <div className="p-8 bg-white border-t border-gray-100">
              <button onClick={processPayment} className="w-full py-7 bg-gray-950 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3">
                <Lock size={20}/>
                Pay {fmt(totals.total)}
              </button>
            </div>
          </div>
        )}
        {view === 'processing_payment' && (
          <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center">
            <div className="relative mb-12">
              <Loader2 size={80} className="text-emerald-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck size={32} className="text-emerald-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-950 tracking-tighter mb-4">Verifying Payment</h2>
            <p className="text-gray-400 font-bold text-sm">Contacting {paymentMethod.replace('_', ' ')} Gateway...</p>
          </div>
        )}
        {view === 'receipt' && renderReceiptView()}
        {view === 'admin' && renderAdminHome()}
        {view === 'admin_products' && (
          <div className="flex flex-col h-full bg-gray-50">
            <header className="p-6 pt-12 flex items-center justify-between bg-white border-b border-gray-100">
              <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24}/></button>
              <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Inventory</h1>
              <button onClick={() => { setScannerMode('admin'); setIsScannerOpen(true); }} className="px-5 py-3 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Add SKU</button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {products.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center gap-5">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${p.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><Package size={24}/></div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm truncate">{p.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.barcode} • {p.stock} units</p>
                   </div>
                   <button onClick={() => { setIsNewProduct(false); setEditingProduct(p); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl"><Edit size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {view === 'admin_sales' && (
          <div className="flex flex-col h-full bg-gray-50">
            <header className="p-6 pt-12 flex items-center gap-4 bg-white border-b border-gray-100">
              <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24}/></button>
              <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Audit Trail</h1>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {sales.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-black text-lg text-emerald-600">{s.invoiceNo}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{new Date(s.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-gray-950">{fmt(s.total)}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${s.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{s.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {s.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                        <span>{it.name} x{it.quantity}</span>
                        <span>{fmt(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {view === 'admin_payment' && renderAdminPayment()}
        {view === 'verify_result' && renderVerifyResult()}
        {view === 'terminal_select' && (
           <div className="h-full bg-white flex flex-col p-8 animate-in slide-in-from-bottom duration-500">
            <button onClick={() => setView('home')} className="p-3 bg-gray-50 rounded-2xl self-start mb-12"><ArrowLeft size={24} /></button>
            <h1 className="text-4xl font-black text-gray-950 tracking-tighter mb-2">Internal Hub</h1>
            <p className="text-gray-400 font-bold text-sm mb-12 uppercase tracking-widest">Select Control Level</p>
            <div className="grid gap-6">
              <button onClick={() => handleTerminalAccess('staff')} className="bg-white border-2 border-gray-100 p-8 rounded-[3rem] text-left active:scale-95 transition-all">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><Users size={32} /></div>
                <h3 className="text-2xl font-black text-gray-950 tracking-tight">Staff Portal</h3>
                <p className="text-xs font-bold text-gray-400 mt-2">Inventory & Token Verification</p>
              </button>
              <button onClick={() => handleTerminalAccess('manager')} className="bg-white border-2 border-gray-100 p-8 rounded-[3rem] text-left active:scale-95 transition-all">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6"><Briefcase size={32} /></div>
                <h3 className="text-2xl font-black text-gray-950 tracking-tight">Manager Portal</h3>
                <p className="text-xs font-bold text-gray-400 mt-2">Executive Audit & Global Settings</p>
              </button>
            </div>
          </div>
        )}
        {view === 'auth_prompt' && (
           <div className="h-full bg-white flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
            <div className={`w-24 h-24 ${targetRole === 'manager' ? 'bg-emerald-600' : 'bg-blue-600'} text-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl`}><Lock size={44} /></div>
            <h1 className="text-3xl font-black mb-3 text-gray-950 tracking-tighter">Identity Check</h1>
            <p className="text-gray-400 mb-12 text-center text-[10px] font-black uppercase tracking-[0.2em]">{targetRole} PIN Required</p>
            <div className="w-full max-w-xs space-y-10">
              <input type="password" inputMode="numeric" maxLength={6} value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="w-full text-center text-6xl tracking-[0.5em] py-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] outline-none font-black text-gray-950 shadow-inner" placeholder="••••" />
              <div className="flex flex-col gap-4">
                <button onClick={handleAuth} className={`w-full py-6 ${targetRole === 'manager' ? 'bg-emerald-600' : 'bg-blue-600'} text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest`}>Log In</button>
                <button onClick={() => setView('terminal_select')} className="w-full py-4 bg-transparent text-gray-400 rounded-3xl font-black uppercase text-xs tracking-widest">Back</button>
              </div>
            </div>
          </div>
        )}
        {view === 'manager_setup' && (
           <div className="h-full bg-white flex flex-col p-8 animate-in slide-in-from-top duration-500 overflow-y-auto">
            <button onClick={() => setView('terminal_select')} className="p-3 bg-gray-50 rounded-2xl self-start mb-8"><ArrowLeft size={24} /></button>
            <h1 className="text-4xl font-black text-gray-950 tracking-tighter mb-4">Initial Setup</h1>
            <p className="text-gray-400 font-bold text-sm mb-12">Initialize security credentials for your terminal.</p>
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] ml-2">Manager PIN</label>
                <input type="password" inputMode="numeric" maxLength={6} value={setupManagerPin} onChange={(e) => setSetupManagerPin(e.target.value)} className="w-full text-center text-4xl tracking-[0.5em] py-6 bg-emerald-50 border border-emerald-100 rounded-3xl outline-none font-black" placeholder="••••" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] ml-2">Staff PIN</label>
                <input type="password" inputMode="numeric" maxLength={6} value={setupStaffPin} onChange={(e) => setSetupStaffPin(e.target.value)} className="w-full text-center text-4xl tracking-[0.5em] py-6 bg-blue-50 border border-blue-100 rounded-3xl outline-none font-black" placeholder="••••" />
              </div>
              <button onClick={() => { 
                setPaymentConfig(prev => ({ ...prev, managerPin: setupManagerPin, staffPin: setupStaffPin }));
                setAuthenticatedRole('manager');
                setView('admin');
                showToast("Security Initialized");
              }} className="w-full py-6 bg-gray-950 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest">Deploy Credentials</button>
            </div>
          </div>
        )}

        {isScannerOpen && (
          <Scanner 
            onScan={handleScan} 
            onClose={() => setIsScannerOpen(false)} 
            title={scannerMode === 'admin' ? "Registry Scan" : scannerMode === 'verify' ? "Token Verification" : "Product Scan"}
          />
        )}
      </div>

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4">
          <div className="bg-gray-950 text-white px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl border border-white/10">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast}</span>
          </div>
        </div>
      )}
      
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[3.5rem] sm:rounded-[3.5rem] p-12 shadow-2xl border-t-8 border-gray-950 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-black text-gray-950 tracking-tighter">{isNewProduct ? 'New SKU' : 'Edit SKU'}</h2>
                {isNewProduct && <p className="text-emerald-600 font-black text-[10px] uppercase mt-2 tracking-widest">Identify Scanned Item</p>}
              </div>
              {resumeScanner && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><Scan size={24} /></div>}
            </div>
            <form onSubmit={saveProduct} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name</label>
                <input name="name" defaultValue={editingProduct.name} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2">Barcode</label>
                  <input name="barcode" value={editingProduct.barcode} readOnly className="w-full mt-2 px-6 py-5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-black rounded-2xl opacity-60" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price</label>
                  <input name="price" type="number" step="0.01" defaultValue={editingProduct.price} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tax %</label>
                  <input name="tax" type="number" step="0.1" defaultValue={editingProduct.tax} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct.stock} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black" />
                </div>
              </div>
              <div className="flex gap-4 pt-10">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-6 bg-gray-100 text-gray-500 rounded-3xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-6 bg-gray-950 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
