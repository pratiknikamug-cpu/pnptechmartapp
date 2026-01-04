
import { Product, SaleRecord, PaymentConfig } from './types';

const STORAGE_KEY = 'quickmart_data';

interface SavedData {
  products: Product[];
  sales: SaleRecord[];
  paymentConfig: PaymentConfig;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Premium Coffee 250g', barcode: '111', price: 125.00, tax: 5, stock: 100 },
  { id: '2', name: 'Fresh Milk 1L', barcode: '222', price: 65.00, tax: 0, stock: 50 },
  { id: '3', name: 'Organic Banana 1kg', barcode: '333', price: 80.00, tax: 0, stock: 150 },
  { id: '4', name: 'Whole Wheat Bread', barcode: '444', price: 45.00, tax: 5, stock: 40 },
];

const INITIAL_PAYMENT: PaymentConfig = {
  storeName: 'QuickMart Superstore',
  storeAddress: 'Shop 42, Green Valley Plaza, Sector 12, New Delhi - 110001',
  gstin: '07AAAAA0000A1Z5',
  upiId: 'quickmart@upi',
  phoneNumber: '9876543210',
  qrCodeData: null,
  gatewayType: 'COUNTER_PAY',
  razorpayKeyId: '',
  razorpayKeySecret: '',
  lastInvoiceIndex: 1000,
  managerPin: '' // Must be set by manager first
};

export const loadData = (): SavedData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { products: INITIAL_PRODUCTS, sales: [], paymentConfig: INITIAL_PAYMENT };
  }
  const parsed = JSON.parse(stored);
  return {
    ...parsed,
    paymentConfig: { ...INITIAL_PAYMENT, ...parsed.paymentConfig }
  };
};

export const saveData = (data: SavedData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
