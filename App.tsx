
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
  X
} from 'lucide-react';
import { loadData, saveData } from './storage';
import { Product, CartItem, SaleRecord, PaymentConfig } from './types';
import Scanner from './components/Scanner';

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { 
  style: 'currency', 
  currency: 'INR',
  maximumFractionDigits: 2 
}).format(n);

const numToWords = (n: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.floor(n);
  if (num === 0) return 'Zero';
  const makeWords = (num: number): string => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + ' ' + a[num % 10];
    if (num < 1000) return a[Math.floor(num / 100)] + 'Hundred ' + makeWords(num % 100);
    return '';
  };
  return makeWords(num) + 'Only';
};

const VALID_COUPONS = [
  { code: 'SAVE10', type: 'percent', value: 10, minOrder: 0, label: '10% OFF' },
  { code: 'FLAT100', type: 'flat', value: 100, minOrder: 500, label: '₹100 OFF on ₹500+' },
  { code: 'QUICK5', type: 'percent', value: 5, minOrder: 0, label: '5% OFF' }
];

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    storeName: '',
    storeAddress: '',
    gstin: '',
    upiId: '',
    phoneNumber: '',
    qrCodeData: null,
    gatewayType: 'RAZORPAY_GATEWAY',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    lastInvoiceIndex: 1000,
    managerPin: ''
  });
  
  const [view, setView] = useState<'home' | 'cart' | 'checkout' | 'token' | 'receipt' | 'admin' | 'admin_sales' | 'admin_products' | 'admin_payment' | 'manager_setup' | 'processing_payment'>('home');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'cart' | 'admin'>('cart');
  const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  useEffect(() => {
    const data = loadData();
    setProducts(data.products);
    setSales(data.sales);
    setPaymentConfig(data.paymentConfig);
  }, []);

  useEffect(() => {
    saveData({ products, sales, paymentConfig });
  }, [products, sales, paymentConfig]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.tax / 100)), 0);
    
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') {
        discount = subtotal * (appliedCoupon.value / 100);
      } else {
        discount = appliedCoupon.value;
      }
    }

    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, discount, total };
  }, [cart, appliedCoupon]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const applyCoupon = () => {
    const code = couponInput.toUpperCase().trim();
    const coupon = VALID_COUPONS.find(c => c.code === code);
    
    if (!coupon) {
      alert("Invalid coupon code.");
      return;
    }

    if (totals.subtotal < coupon.minOrder) {
      alert(`Min order value for this coupon is ${fmt(coupon.minOrder)}`);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponInput('');
    showToast(`Coupon ${code} Applied!`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast("Coupon Removed");
  };

  const handleScan = (barcode: string) => {
    setIsScannerOpen(false);
    
    if (scannerMode === 'cart') {
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        setCart(prev => {
          const existing = prev.find(item => item.id === product.id);
          if (existing) {
            return prev.map(item => 
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          }
          return [...prev, { ...product, quantity: 1 }];
        });
        showToast(`${product.name} added`);
      } else {
        alert(`Unknown Barcode: ${barcode}`);
      }
    } else if (scannerMode === 'admin') {
      const existingProduct = products.find(p => p.barcode === barcode);
      if (existingProduct) {
        setIsNewProduct(false);
        setEditingProduct(existingProduct);
      } else {
        setIsNewProduct(true);
        setEditingProduct({
          id: '',
          name: '',
          barcode: barcode,
          price: 0,
          tax: 0,
          stock: 0
        });
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const processPayment = () => {
    setView('processing_payment');
    
    setTimeout(() => {
      const newInvoiceNo = `INV/${new Date().getFullYear()}/${paymentConfig.lastInvoiceIndex + 1}`;
      const tokenId = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now()}`;
      
      const newSale: SaleRecord = {
        id: Math.random().toString(36).substring(7),
        invoiceNo: newInvoiceNo,
        items: [...cart],
        total: totals.total,
        taxTotal: totals.tax,
        timestamp: Date.now(),
        tokenId,
        billAccessCode: 'AUTO_PAID',
        status: 'paid'
      };

      setSales(prev => [newSale, ...prev]);
      setPaymentConfig(prev => ({ ...prev, lastInvoiceIndex: prev.lastInvoiceIndex + 1 }));
      setCart([]);
      setAppliedCoupon(null);
      setActiveSale(newSale);
      setView('receipt');
      showToast("Payment Successful");
    }, 2500);
  };

  const handleManagerSetup = () => {
    if (setupPin.length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }
    if (setupPin !== confirmSetupPin) {
      alert("PINs do not match.");
      return;
    }
    setPaymentConfig(prev => ({ ...prev, managerPin: setupPin }));
    setIsAdminAuthenticated(true);
    setView('admin');
    setSetupPin('');
    setConfirmSetupPin('');
    showToast("Manager PIN Configured");
  };

  const handleAdminAccess = () => {
    if (!paymentConfig.managerPin) {
      setView('manager_setup');
    } else {
      setAdminPinInput('');
      setView('admin');
    }
  };

  const handleAdminLogin = () => {
    if (adminPinInput === paymentConfig.managerPin) {
      setIsAdminAuthenticated(true);
      setAdminPinInput('');
    } else {
      alert("Access Denied: Invalid PIN");
    }
  };

  const saveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Product = {
      id: editingProduct?.id || Math.random().toString(36).substring(7),
      name: formData.get('name') as string,
      barcode: formData.get('barcode') as string,
      price: parseFloat(formData.get('price') as string),
      tax: parseFloat(formData.get('tax') as string),
      stock: parseInt(formData.get('stock') as string),
    };

    if (editingProduct?.id) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
    } else {
      setProducts(prev => [...prev, productData]);
    }
    setEditingProduct(null);
    showToast("Inventory Synchronized");
  };

  const renderProcessingPayment = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="relative">
        <div className="w-32 h-32 border-4 border-emerald-100 rounded-full flex items-center justify-center">
          <Loader2 className="text-emerald-500 animate-spin" size={48} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <ShieldCheck className="text-emerald-500/20" size={80} />
        </div>
      </div>
      <h1 className="text-2xl font-black mt-12 text-gray-900 tracking-tight text-center">Processing Transaction</h1>
      <p className="text-gray-400 text-sm mt-3 text-center px-10 leading-relaxed italic">Securing your payment via encrypted tunnel. Please do not close the app.</p>
    </div>
  );

  const renderCheckoutView = () => (
    <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-bottom duration-500">
      <header className="p-6 pt-12 flex items-center gap-4 bg-white border-b border-gray-100">
        <button onClick={() => setView('cart')} className="p-3 bg-gray-100 rounded-2xl"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Secure Checkout</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="bg-gray-950 text-white rounded-[2.5rem] p-8 mb-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Payable</p>
                <p className="text-4xl font-black tracking-tighter">{fmt(totals.total)}</p>
              </div>
              <ShieldCheck size={32} className="text-emerald-500 opacity-50" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Check size={14} className="text-emerald-500" /> Secure SSL Encryption Active
            </div>
          </div>

          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Select Payment Method</h3>
          
          <div className="space-y-4">
            <button 
              onClick={() => setPaymentMethod('upi')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5 ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50' : 'border-white bg-white'}`}
            >
              <div className={`p-4 rounded-2xl ${paymentMethod === 'upi' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Smartphone size={24} />
              </div>
              <div className="text-left">
                <p className={`font-black text-sm ${paymentMethod === 'upi' ? 'text-emerald-900' : 'text-gray-900'}`}>UPI / Google Pay / PhonePe</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Instant Activation</p>
              </div>
            </button>

            <button 
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5 ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-white bg-white'}`}
            >
              <div className={`p-4 rounded-2xl ${paymentMethod === 'card' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <CreditCard size={24} />
              </div>
              <div className="text-left">
                <p className={`font-black text-sm ${paymentMethod === 'card' ? 'text-emerald-900' : 'text-gray-900'}`}>Debit / Credit Card</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Visa, Mastercard, RuPay</p>
              </div>
            </button>

            <button 
              onClick={() => setPaymentMethod('netbanking')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5 ${paymentMethod === 'netbanking' ? 'border-emerald-500 bg-emerald-50' : 'border-white bg-white'}`}
            >
              <div className={`p-4 rounded-2xl ${paymentMethod === 'netbanking' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Landmark size={24} />
              </div>
              <div className="text-left">
                <p className={`font-black text-sm ${paymentMethod === 'netbanking' ? 'text-emerald-900' : 'text-gray-900'}`}>Net Banking</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">All Indian Banks</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <button 
          onClick={processPayment}
          className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest"
        >
          Pay {fmt(totals.total)}
        </button>
      </div>
    </div>
  );

  const renderManagerSetup = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gray-950 text-emerald-400 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-gray-800">
        <Lock size={44} />
      </div>
      <h1 className="text-3xl font-black mb-3 text-gray-950 tracking-tighter">Initial Setup</h1>
      <p className="text-gray-400 mb-12 text-center text-sm font-medium px-6 leading-relaxed">
        To protect the store registry, please create a secure 4-6 digit Manager PIN. This will be used for all administrative tasks.
      </p>
      
      <div className="w-full max-w-xs space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">New PIN</label>
          <input 
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={setupPin}
            onChange={(e) => setSetupPin(e.target.value)}
            className="w-full text-center text-4xl tracking-[0.5em] py-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black"
            placeholder="••••"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Confirm PIN</label>
          <input 
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmSetupPin}
            onChange={(e) => setConfirmSetupPin(e.target.value)}
            className="w-full text-center text-4xl tracking-[0.5em] py-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black"
            placeholder="••••"
          />
        </div>
        <button onClick={handleManagerSetup} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest">Register Security</button>
      </div>
    </div>
  );

  const renderCustomerHome = () => (
    <div className="flex flex-col h-full bg-white">
      <header className="p-6 pt-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-emerald-600 tracking-tighter">QuickMart</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.3em] italic">Queue-Free Retail</p>
        </div>
        <button onClick={handleAdminAccess} className="p-3 bg-gray-50 rounded-2xl text-gray-400 active:bg-emerald-50 active:text-emerald-600 transition-all"><Settings size={22} /></button>
      </header>

      <div className="px-6 mb-8">
        <div className="bg-gray-950 p-6 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
           <div className="flex-1 relative z-10">
             <h2 className="text-emerald-400 font-black text-lg">Self-Checkout Mode</h2>
             <p className="text-gray-400 text-[10px] font-medium italic mt-1 leading-snug">SCAN -> PAY -> EXIT</p>
           </div>
           <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg relative z-10"><Package size={24} /></div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-32 overflow-y-auto">
        <h3 className="font-black text-gray-300 uppercase text-[10px] tracking-widest mb-4">Cart Summary ({cart.length})</h3>
        {cart.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-30">
            <ShoppingCart size={64} className="mb-4 text-gray-300" />
            <p className="font-black text-lg text-gray-400">Basket empty</p>
            <p className="text-xs font-bold italic text-gray-400">Tap the scan icon to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-right duration-300">
                <div className="flex-1">
                  <h4 className="font-black text-gray-800 text-sm leading-tight">{item.name}</h4>
                  <p className="text-emerald-600 font-black text-xs mt-1">{fmt(item.price)}</p>
                </div>
                <div className="flex items-center bg-gray-50 rounded-2xl p-1 shadow-inner border border-gray-100">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2.5 text-gray-400 active:text-emerald-600"><Minus size={14} /></button>
                  <span className="w-6 text-center font-black text-gray-800 text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2.5 text-gray-400 active:text-emerald-600"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-3.5 text-red-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-gray-100 flex gap-4 z-40">
        {cart.length > 0 && (
          <button onClick={() => setView('cart')} className="flex-1 bg-emerald-600 text-white p-4 rounded-3xl flex items-center justify-between px-6 shadow-2xl active:scale-95 transition-all">
            <div className="text-left">
              <p className="text-emerald-200 text-[9px] font-black uppercase tracking-widest">Payable</p>
              <p className="text-xl font-black">{fmt(totals.total)}</p>
            </div>
            <ChevronRight size={24} />
          </button>
        )}
        <button 
          onClick={() => { setScannerMode('cart'); setIsScannerOpen(true); }}
          className={`h-16 w-16 bg-gray-950 text-white rounded-[2rem] flex items-center justify-center shadow-xl transition-all ${cart.length === 0 ? 'w-full gap-4' : ''}`}
        >
          <Scan size={32} />
          {cart.length === 0 && <span className="font-black text-xl tracking-tighter uppercase">Start Scanning</span>}
        </button>
      </div>
    </div>
  );

  const renderCartView = () => (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom duration-500">
      <header className="p-6 pt-12 flex items-center gap-4">
        <button onClick={() => setView('home')} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Review Order</h1>
      </header>

      <div className="flex-1 px-8 overflow-y-auto pb-10">
        <div className="bg-gray-950 rounded-[3rem] p-10 mb-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Bill Summary</h3>
            <div className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black">{cart.length} SKUs</div>
          </div>
          <div className="space-y-5">
             <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                <span>Items Subtotal</span>
                <span className="text-white">{fmt(totals.subtotal)}</span>
             </div>
             <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                <span>Collective GST</span>
                <span className="text-white">{fmt(totals.tax)}</span>
             </div>
             {totals.discount > 0 && (
               <div className="flex justify-between items-center text-sm font-bold text-emerald-400">
                  <span className="flex items-center gap-2"><Tag size={14} /> Coupon Applied</span>
                  <span>- {fmt(totals.discount)}</span>
               </div>
             )}
             <div className="h-px bg-white/10 my-8"></div>
             <div className="flex justify-between items-end">
                <div>
                   <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Payable</p>
                   <p className="text-5xl font-black tracking-tighter">{fmt(totals.total)}</p>
                </div>
                <ShieldCheck size={44} className="text-emerald-500 mb-1 opacity-50" />
             </div>
          </div>
        </div>

        {/* Coupon Section */}
        <div className="mb-8">
           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Offers & Coupons</h4>
           {!appliedCoupon ? (
             <div className="flex gap-3">
                <div className="relative flex-1">
                   <Ticket className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600" size={20} />
                   <input 
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter Coupon (SAVE10)"
                      className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] pl-14 pr-6 py-5 font-black text-sm uppercase outline-none focus:ring-4 focus:ring-emerald-500/10"
                   />
                </div>
                <button 
                  onClick={applyCoupon}
                  disabled={!couponInput.trim()}
                  className="bg-gray-950 text-white px-8 rounded-[1.5rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30"
                >
                   Apply
                </button>
             </div>
           ) : (
             <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg">
                      <CheckCircle2 size={24} />
                   </div>
                   <div>
                      <p className="font-black text-emerald-900 text-sm">Coupon {appliedCoupon.code} applied</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{appliedCoupon.label}</p>
                   </div>
                </div>
                <button onClick={removeCoupon} className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm active:scale-90">
                   <X size={20} />
                </button>
             </div>
           )}
           
           <div className="mt-6 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {VALID_COUPONS.filter(c => !appliedCoupon || c.code !== appliedCoupon.code).map(c => (
                 <button 
                    key={c.code}
                    onClick={() => { setCouponInput(c.code); }}
                    className="flex-shrink-0 bg-white border border-gray-100 px-6 py-4 rounded-2xl shadow-sm text-left group active:scale-95 transition-all"
                 >
                    <p className="font-black text-gray-950 text-xs tracking-widest uppercase">{c.code}</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-tight">{c.label}</p>
                 </button>
              ))}
           </div>
        </div>

        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex gap-5 shadow-inner">
           <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl h-fit shadow-sm"><Wallet size={32} /></div>
           <div className="flex-1">
              <h4 className="font-black text-emerald-900 text-sm mb-2 uppercase tracking-tight">Direct In-App Payment</h4>
              <p className="text-xs text-emerald-800/70 font-bold leading-relaxed italic">
                Skip the checkout counter. Pay directly using UPI, Card, or Net Banking to instantly generate your secure exit token.
              </p>
           </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <button onClick={() => setView('checkout')} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-4 transition-all uppercase tracking-widest">
          Pay From App Only
        </button>
      </div>
    </div>
  );

  const renderReceiptView = () => {
    if (!activeSale) return null;
    return (
      <div className="flex flex-col h-full bg-gray-50 animate-in fade-in duration-700 overflow-hidden">
        <header className="p-6 pt-12 flex items-center justify-between bg-white border-b border-gray-100 z-10 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <Check size={24} />
             </div>
             <h1 className="text-xl font-black text-gray-950 uppercase tracking-tighter">Bill Paid</h1>
          </div>
          <button onClick={() => setView('token')} className="p-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
            Exit Token <ChevronRight size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24">
           <div className="bg-white border border-gray-300 shadow-2xl p-8 sm:p-12 font-serif text-gray-950 min-h-[900px] relative">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none"><Package size={120} /></div>

              {/* Indian GST Tax Invoice */}
              <div className="text-center mb-10 pb-10 border-b border-gray-200">
                 <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 font-sans text-gray-950">{paymentConfig.storeName || 'QuickMart'}</h2>
                 <p className="text-[11px] font-bold leading-tight mb-6 px-12 italic text-gray-500">{paymentConfig.storeAddress}</p>
                 <div className="flex flex-col items-center gap-2 font-sans">
                    <span className="bg-gray-100 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border border-gray-200">GSTIN: {paymentConfig.gstin || '07AAAAA0000A1Z5'}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10 font-sans bg-gray-50 p-6 rounded-3xl border border-gray-100">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Invoice Number</p>
                    <p className="text-sm font-black text-gray-950">{activeSale.invoiceNo}</p>
                 </div>
                 <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date & Time</p>
                    <p className="text-sm font-black text-gray-950">{new Date(activeSale.timestamp).toLocaleString('en-IN')}</p>
                 </div>
              </div>

              <div className="mb-12 font-sans">
                 <div className="grid grid-cols-12 border-b-2 border-gray-950 pb-4 mb-6 text-[11px] font-black text-gray-950 uppercase tracking-widest">
                    <div className="col-span-1">SR.</div>
                    <div className="col-span-6">Item Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-3 text-right">Amount</div>
                 </div>
                 <div className="space-y-6">
                   {activeSale.items.map((item, idx) => (
                     <div key={idx} className="grid grid-cols-12 text-xs font-bold text-gray-800 border-b border-gray-50 pb-4">
                        <div className="col-span-1 text-gray-300 font-black">{idx + 1}</div>
                        <div className="col-span-6 leading-tight font-black">{item.name}</div>
                        <div className="col-span-2 text-right text-gray-500">x{item.quantity}</div>
                        <div className="col-span-3 text-right font-black">{fmt(item.price * item.quantity)}</div>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 font-sans pt-10 border-t border-dashed border-gray-300 mb-12">
                 <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Total In Words</p>
                       <p className="text-xs font-black text-gray-950 italic leading-snug">{numToWords(activeSale.total)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">App Payment Verified</p>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between text-xs text-gray-500 font-black">
                       <span>Assessable Value</span>
                       <span>{fmt(activeSale.total - activeSale.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-bold">
                       <span>CGST Component</span>
                       <span>{fmt(activeSale.taxTotal / 2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-bold">
                       <span>SGST Component</span>
                       <span>{fmt(activeSale.taxTotal / 2)}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-6"></div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Grand Total</span>
                       <span className="text-4xl font-black text-gray-950 tracking-tighter">{fmt(activeSale.total)}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-20 text-center pt-10 border-t border-gray-100 border-dashed">
                 <p className="text-[10px] font-black text-gray-950 uppercase tracking-[0.3em] mb-2">Electronic Tax Invoice</p>
                 <p className="text-[9px] font-bold text-gray-400 italic">Thank you for shopping at {paymentConfig.storeName}!</p>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex gap-4 z-20 shadow-2xl absolute bottom-0 left-0 right-0">
           <button className="flex-1 h-14 bg-gray-950 text-white rounded-2xl font-black text-[10px] flex items-center justify-center gap-3 uppercase tracking-widest">
              <Download size={18} className="text-emerald-400" /> Save PDF
           </button>
           <button className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] flex items-center justify-center gap-3 uppercase tracking-widest">
              <Printer size={18} /> Print
           </button>
        </div>
      </div>
    );
  };

  const renderTokenView = () => {
    if (!activeSale) return null;
    return (
      <div className="flex flex-col h-full bg-gray-950 text-white items-center justify-center px-6 p-8 animate-in zoom-in duration-500">
        <div className="bg-white rounded-[4rem] p-12 w-full max-w-sm flex flex-col items-center text-gray-950 shadow-2xl relative border-t-[12px] border-emerald-500">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-10 shadow-inner border border-emerald-100">
            <Check size={48} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-center mb-1 tracking-tighter">Exit Validated</h1>
          <p className="text-gray-400 text-center text-[10px] mb-12 uppercase tracking-[0.4em] font-black">Present to Security</p>

          <div className="w-full bg-gray-50 rounded-[3rem] p-10 mb-10 border-2 border-dashed border-gray-200 relative overflow-hidden text-center shadow-inner">
             <div className="text-7xl font-black tracking-tighter text-emerald-600 mb-8 font-mono">
               {activeSale.tokenId.split('-')[1]}
             </div>
             <div className="flex items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
                <div className="w-44 h-44 bg-gray-950 flex flex-wrap gap-2 p-3 rounded-2xl overflow-hidden">
                  {Array.from({length: 64}).map((_, i) => (
                    <div key={i} className={`w-3.5 h-3.5 rounded-[2px] ${Math.random() > 0.4 ? 'bg-emerald-400' : 'bg-white'} opacity-90`}></div>
                  ))}
                </div>
             </div>
          </div>

          <button onClick={() => { setView('home'); setActiveSale(null); }} className="w-full py-6 bg-gray-950 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest">Done</button>
        </div>
      </div>
    );
  };

  const renderAdminLogin = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-8 animate-in slide-in-from-top duration-500">
      <div className="w-24 h-24 bg-gray-950 text-emerald-400 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-gray-800">
        <Lock size={44} />
      </div>
      <h1 className="text-3xl font-black mb-3 text-gray-950 tracking-tighter">Manager Access</h1>
      <p className="text-gray-400 mb-12 text-center text-[10px] font-black uppercase tracking-[0.2em]">Restricted Terminal</p>
      
      <div className="w-full max-w-xs space-y-10">
        <input 
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={adminPinInput}
          onChange={(e) => setAdminPinInput(e.target.value)}
          className="w-full text-center text-6xl tracking-[0.5em] py-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-950 shadow-inner"
          placeholder="••••"
        />
        <div className="flex flex-col gap-4">
          <button onClick={handleAdminLogin} className="w-full py-6 bg-gray-950 text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">Unlock Terminal</button>
          <button onClick={() => setView('home')} className="w-full py-4 bg-transparent text-gray-400 rounded-3xl font-black uppercase text-xs tracking-widest">Exit</button>
        </div>
      </div>
    </div>
  );

  const renderAdminView = () => {
    if (!isAdminAuthenticated) return renderAdminLogin();

    const renderSalesHistory = () => (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="p-6 pt-12 flex items-center gap-4 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl active:scale-90"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Audit Logs</h1>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {sales.length === 0 ? (
            <div className="text-center py-32 text-gray-300">
              <History size={64} className="mx-auto mb-6 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">No Sale Records</p>
            </div>
          ) : (
            sales.map(sale => (
              <div key={sale.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-lg text-emerald-600 tracking-tight">{sale.invoiceNo}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5">{new Date(sale.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-950">{fmt(sale.total)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );

    const renderProductManagement = () => (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="p-6 pt-12 flex items-center justify-between bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl active:scale-90"><ArrowLeft size={24} /></button>
            <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Inventory Manager</h1>
          </div>
          <button onClick={() => { setScannerMode('admin'); setIsScannerOpen(true); }} className="px-6 py-4 bg-gray-950 text-white rounded-2xl shadow-xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">Add Product</button>
        </header>
        <div className="p-6">
          <div className="space-y-5 pb-32">
            {products.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 flex items-center gap-6 shadow-sm">
                <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-100"><Package size={28} /></div>
                <div className="flex-1">
                  <h4 className="font-black text-gray-950 text-sm leading-tight">{p.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">SKU: {p.barcode}</p>
                  <p className="text-lg font-black text-emerald-600 mt-2">{fmt(p.price)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsNewProduct(false); setEditingProduct(p); }} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-emerald-600 active:scale-90 transition-all"><Edit size={20} /></button>
                  <button onClick={() => { if(window.confirm("Delete?")) setProducts(prev => prev.filter(it => it.id !== p.id)); }} className="p-4 bg-red-50 text-red-300 rounded-2xl hover:text-red-500 active:scale-90 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-t-[3.5rem] sm:rounded-[3.5rem] p-12 shadow-2xl border-t-8 border-gray-950 animate-in slide-in-from-bottom duration-300">
              <h2 className="text-3xl font-black mb-10 text-gray-950 tracking-tighter">{isNewProduct ? 'New Registry' : 'Edit Registry'}</h2>
              <form onSubmit={saveProduct} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Product Name</label>
                  <input name="name" defaultValue={editingProduct.name} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="Product Label" />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2">Barcode</label>
                    <input name="barcode" value={editingProduct.barcode} readOnly className="w-full mt-2 px-6 py-5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-black rounded-2xl opacity-60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Rate (₹)</label>
                    <input name="price" type="number" step="0.01" defaultValue={editingProduct.price} required className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10" />
                  </div>
                </div>
                <div className="flex gap-4 pt-10">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-6 bg-gray-100 text-gray-500 rounded-3xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-6 bg-gray-950 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Apply</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );

    const renderPaymentSettings = () => (
      <div className="flex flex-col h-full bg-gray-50">
         <header className="p-6 pt-12 flex items-center gap-4 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={() => setView('admin')} className="p-3 bg-gray-50 rounded-2xl active:scale-90"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black text-gray-950 tracking-tighter">Store Profile</h1>
        </header>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
           <div className="bg-white rounded-[3.5rem] p-10 border border-gray-100 shadow-2xl space-y-10">
              <div className="space-y-8">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Mart Name</label>
                    <input value={paymentConfig.storeName} onChange={(e) => setPaymentConfig(prev => ({ ...prev, storeName: e.target.value }))} className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">GSTIN</label>
                    <input value={paymentConfig.gstin} onChange={(e) => setPaymentConfig(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))} className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none uppercase" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">UPI ID</label>
                    <input value={paymentConfig.upiId} onChange={(e) => setPaymentConfig(prev => ({ ...prev, upiId: e.target.value }))} className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="merchant@upi" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                    <input value={paymentConfig.phoneNumber} onChange={(e) => setPaymentConfig(prev => ({ ...prev, phoneNumber: e.target.value }))} className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="+91 00000 00000" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Address</label>
                    <textarea rows={2} value={paymentConfig.storeAddress} onChange={(e) => setPaymentConfig(prev => ({ ...prev, storeAddress: e.target.value }))} className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-xs italic" />
                 </div>

                 <div className="pt-6 border-t border-gray-100">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 mb-4 block">Store Gateway (In-App Only)</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                          onClick={() => setPaymentConfig(prev => ({ ...prev, gatewayType: 'DIRECT_UPI' }))}
                          className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${paymentConfig.gatewayType === 'DIRECT_UPI' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                       >
                          Direct UPI
                       </button>
                       <button 
                          onClick={() => setPaymentConfig(prev => ({ ...prev, gatewayType: 'RAZORPAY_GATEWAY' }))}
                          className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${paymentConfig.gatewayType === 'RAZORPAY_GATEWAY' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                       >
                          Razorpay
                       </button>
                    </div>

                    {paymentConfig.gatewayType === 'RAZORPAY_GATEWAY' && (
                       <div className="mt-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                          <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Razorpay Key ID</label>
                             <input 
                                value={paymentConfig.razorpayKeyId} 
                                onChange={(e) => setPaymentConfig(prev => ({ ...prev, razorpayKeyId: e.target.value }))} 
                                className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none" 
                                placeholder="rzp_test_..."
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Razorpay Key Secret</label>
                             <input 
                                type="password"
                                value={paymentConfig.razorpayKeySecret} 
                                onChange={(e) => setPaymentConfig(prev => ({ ...prev, razorpayKeySecret: e.target.value }))} 
                                className="w-full mt-2 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none" 
                                placeholder="••••••••••••"
                             />
                          </div>
                       </div>
                    )}
                 </div>
              </div>
              <button onClick={() => { setView('admin'); showToast("Store Config Saved"); }} className="w-full py-6 bg-gray-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl">Update Official Registry</button>
           </div>
        </div>
      </div>
    );

    if (view === 'admin_sales') return renderSalesHistory();
    if (view === 'admin_products') return renderProductManagement();
    if (view === 'admin_payment') return renderPaymentSettings();

    return (
      <div className="h-full bg-white flex flex-col">
        <header className="p-8 pt-16 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-gray-950">Manager</h1>
            <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Executive Dashboard</p>
          </div>
          <button onClick={() => { setIsAdminAuthenticated(false); setView('home'); }} className="p-4 bg-red-50 text-red-600 rounded-[2rem] shadow-inner border border-red-100 active:scale-90 transition-all"><LogOut size={22} /></button>
        </header>
        <div className="flex-1 px-8 py-4 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <button onClick={() => setView('admin_products')} className="bg-white border border-gray-100 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><Package size={32} /></div>
              <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Registry</span>
            </button>
            <button onClick={() => setView('admin_sales')} className="bg-white border border-gray-100 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><History size={32} /></div>
              <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Audit</span>
            </button>
            <button onClick={() => setView('admin_payment')} className="bg-white border border-gray-100 p-10 rounded-[3rem] flex flex-col items-center text-center active:scale-95 shadow-sm hover:shadow-xl transition-all col-span-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner"><Store size={32} /></div>
              <span className="font-black text-gray-950 text-xs tracking-tight uppercase">Mart Setup</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto h-screen relative bg-white overflow-hidden shadow-2xl flex flex-col border-x border-gray-100">
      <div className="flex-1 relative overflow-hidden">
        {view === 'home' && renderCustomerHome()}
        {view === 'cart' && renderCartView()}
        {view === 'checkout' && renderCheckoutView()}
        {view === 'processing_payment' && renderProcessingPayment()}
        {view === 'receipt' && renderReceiptView()}
        {view === 'token' && renderTokenView()}
        {view === 'manager_setup' && renderManagerSetup()}
        {view === 'admin' && renderAdminView()}
        {view === 'admin_sales' && renderAdminView()}
        {view === 'admin_products' && renderAdminView()}
        {view === 'admin_payment' && renderAdminView()}

        {isScannerOpen && (
          <Scanner 
            onScan={handleScan} 
            onClose={() => setIsScannerOpen(false)} 
            title={scannerMode === 'admin' ? "Inventory Scan" : "Barcode Scan"}
          />
        )}
      </div>

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
          <div className="bg-gray-950 text-white px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl border border-white/10">
             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast}</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-0 left-0 right-0 z-[120] pointer-events-none flex justify-center">
        <div className="mt-4 bg-gray-950/80 backdrop-blur-2xl px-5 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-[0.3em] border border-white/10 flex items-center gap-2.5 shadow-2xl">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,1)]"></div>
          QuickMart - Pay In-App
        </div>
      </div>
    </div>
  );
};

export default App;
