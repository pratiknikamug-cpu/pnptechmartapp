
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

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  code: string;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  items: CartItem[];
  total: number;
  taxTotal: number;
  timestamp: number;
  tokenId: string;
  billAccessCode: string;
  status: 'pending' | 'paid' | 'verified'; // 'verified' is when staff scans the token
  gatewayUsed: PaymentGatewayType;
}

export type PaymentGatewayType = 
  | 'DIRECT_UPI' 
  | 'RAZORPAY_GATEWAY' 
  | 'GOOGLE_PAY' 
  | 'COUNTER_PAY' 
  | 'CARD' 
  | 'NETBANKING' 
  | 'CRYPTO' 
  | 'E_WALLET';

export interface PaymentConfig {
  storeName: string;
  storeAddress: string;
  gstin: string;
  upiId: string;
  phoneNumber: string;
  qrCodeData: string | null; 
  gatewayType: PaymentGatewayType;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  lastInvoiceIndex: number;
  managerPin: string; 
  staffPin: string; 
}

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  STAFF = 'staff'
}
