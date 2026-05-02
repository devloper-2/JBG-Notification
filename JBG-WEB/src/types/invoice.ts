export interface InvoiceCustomer {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  gst_no: string | null;
  address: string | null;
}

export interface InvoiceUnit {
  id: number;
  name: string;
  short_name: string;
}

export interface InvoiceStockItem {
  stock_item_id: number;
  item_name: string;
  hsn_code: string | null;
  quantity?: string;
  unit?: InvoiceUnit | null;
}

export interface InvoicePackagingUsage {
  id: number;
  packaging_stock_item_id: number;
  quantity_used: string;
  packagingStockItem?: InvoiceStockItem | null;
}

export interface InvoiceItem {
  item_id: number;
  invoice_id: number;
  stock_item_id: number;
  description: string;
  hsn_code: string | null;
  quantity: string;
  unit_price: string;
  unit_of_measurement: string | null;
  subtotal: string;
  tax_percentage: string;
  total_tax: string;
  total: string;
  created_at: string;
  updated_at: string;
  stockItem?: InvoiceStockItem | null;
  packagingUsage?: InvoicePackagingUsage | null;
}

export interface InvoicePayment {
  payment_id?: number;
  amount?: string;
  paid_at?: string;
  payment_method?: string;
}

export interface Invoice {
  invoice_id: number;
  invoice_number: string;
  sender_customer_id: number;
  receiver_customer_id: number;
  invoice_date: string;
  due_date: string;
  terms_and_conditions: string | null;
  subtotal: string;
  total_tax: string;
  discount_amount: string;
  discount_type: string;
  discount_percentage: string;
  shipping_charges: string;
  total: string;
  notes: string | null;
  status: string;
  signature_user_id: number | null;
  currency: string;
  reference_number: string | null;
  eway_bill_number?: string | null;
  vehicle_number?: string | null;
  created_at: string;
  updated_at: string;
  senderCustomer?: InvoiceCustomer | null;
  receiverCustomer?: InvoiceCustomer | null;
  signatureUser?: unknown;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface InvoiceListData {
  invoices: Invoice[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface InvoiceListResponse {
  success: boolean;
  message: string;
  data: InvoiceListData;
}

export interface CustomerInvoiceSummary {
  invoice_id: number;
  invoice_number: string;
  status: string;
  sender_customer_id: number;
  receiver_customer_id: number;
  invoice_date: string;
  total: string;
}

export interface CustomerInvoiceListData {
  invoices: CustomerInvoiceSummary[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CustomerInvoiceListResponse {
  success: boolean;
  message: string;
  data: CustomerInvoiceListData;
}

export interface CreateInvoicePayload {
  invoice: {
    sender_customer_id: number;
    receiver_customer_id: number;
    invoice_date: string;
    due_date: string;
    currency: string;
    discount_amount: number;
    shipping_charges: number;
    terms_and_conditions: string;
    notes: string;
    reference_number: string;
    eway_bill_number: string;
    vehicle_number: string;
  };
  items: Array<{
    stock_item_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    unit_of_measurement: string;
    packaging_stock_item_id?: number;
    packaging_quantity_used?: number;
  }>;
}

export interface CreateInvoiceResponse {
  success: boolean;
  message: string;
  data: Invoice;
}

export interface UpdateInvoicePayload {
  invoice: {
    sender_customer_id?: number;
    receiver_customer_id?: number;
    invoice_date?: string;
    due_date?: string;
    currency?: string;
    discount_amount?: number;
    shipping_charges?: number;
    terms_and_conditions?: string;
    notes?: string;
    reference_number?: string;
    eway_bill_number?: string;
    vehicle_number?: string;
  };
  items: Array<{
    item_id?: number;
    stock_item_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    unit_of_measurement: string;
    packaging_stock_item_id?: number;
    packaging_quantity_used?: number;
  }>;
}

export interface UpdateInvoiceResponse {
  success: boolean;
  message: string;
  data: Invoice;
}
