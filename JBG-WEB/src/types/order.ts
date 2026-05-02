export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  extra_item_id: number | null;
  menu_item_name: {
    default: string;
    hindi: string;
  };
  menu_item_details: Array<{
    id: number;
    name: {
      default: string;
      hindi: string;
    };
    value: string;
  }> | null;
  hsn_code: string;
  quantity: number;
  unit_price: string;
  extras_json: any | null;
  stock_deducted: boolean;
  stock_deducted_at: string | null;
  item_total: string;
  item_note: string | null;
  is_extra_item: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer_id: number;
  bill_no: number;
  token_no: number;
  table_no: string;
  customer_name: string;
  phone: string;
  gst_no: string;
  vehicle_no: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'online';
  payment_method: 'cash' | 'card' | 'upi' | 'online';
  subtotal: string;
  discount: string;
  cgst_rate: string;
  sgst_rate: string;
  cgst_amount: string;
  sgst_amount: string;
  total_tax: string;
  final_total: string;
  order_datetime: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  note: string | null;
  daily_balance_sheet_unique_id: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  summary: {
    items_count: number;
    total_quantity: number;
  };
}

export interface OrderPagination {
  current_page: number;
  per_page: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  next_page: number | null;
  prev_page: number | null;
}

export interface OrderAggregates {
  total_amount: number;
  total_subtotal: number;
  total_discount: number;
  total_tax: number;
  total_orders: number;
}

export interface OrderFilters {
  start_date: string | null;
  end_date: string | null;
  order_type: string;
  payment_method: string;
  status: string;
  search_term: string | null;
  min_amount: number | null;
  max_amount: number | null;
}

export interface OrderSorting {
  sort_by: string;
  sort_order: 'ASC' | 'DESC';
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  pagination: OrderPagination;
  aggregates: OrderAggregates;
  filters: OrderFilters;
  sorting: OrderSorting;
}
