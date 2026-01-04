
export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  tax: number; // percentage
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  items: CartItem[];
  total: number;
  taxTotal: number;
  timestamp: number;
  tokenId: string;
  billAccessCode: string; // The unique code generated for the customer
  status: 'pending' | 'paid';
}

export type PaymentGatewayType = 'DIRECT_UPI' | 'RAZORPAY_GATEWAY' | 'GOOGLE_PAY' | 'COUNTER_PAY';

export interface PaymentConfig {
  storeName: string;
  storeAddress: string;
  gstin: string;
  upiId: string;
  phoneNumber: string;
  qrCodeData: string | null; // base64
  gatewayType: PaymentGatewayType;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  lastInvoiceIndex: number;
  managerPin: string; // Secure manager-set PIN
}

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin'
}

export interface AppState {
  products: Product[];
  sales: SaleRecord[];
  activeToken: string | null;
  paymentConfig: PaymentConfig;
}
