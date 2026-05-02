export interface Customer {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  short_name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  unit_type: string;
}

export interface CustomExtraItem {
  id: number;
  name: Record<string, string> | string;
  quantity: number;
  unit_type: 'gram' | 'ml' | 'piece';
  price: number;
}

export interface OutletStock {
  id: number;
  customer_id: number;
  customer: Customer;
  stock_id: number | null;
  quantity: string;
  invoice_quantity: string;
  minimum_quantity: string;
  is_extra_item: boolean;
  item_name: string; // JSON string with multilingual support
  hsn_code: string;
  amount: string;
  profile_image: string | null;
  unit_id: number | null;
  unit: Unit | null;
  production_cost: string | null;
  selling_cost: string;
  shelf_life_days: number | null;
  barcode_number: string | null;
  is_packaging: boolean;
  is_sugerfree: boolean;
  is_flavour: boolean;
  is_malay: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  extra_items?: CustomExtraItem[];
}

export interface StockItem {
  stock_item_id: number;
  hsn_code: string;
  item_name: string; // JSON string with multilingual support
  unit_id: number;
  quantity: string;
  profile_image: string | null;
  production_cost: string;
  selling_cost: string;
  shelf_life_days: number;
  barcode_number: string;
  is_packaging: boolean;
  is_sugerfree: boolean;
  is_flavour: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit: Unit;
}

export interface OutletStockCreateRequest {
  customer_id: number;
  stock_id?: number;
  quantity?: number;
  invoice_quantity?: number;
  minimum_quantity?: number;
  is_extra_item?: boolean;
  // Required only when stock_id is null or omitted (custom items)
  name?: Record<string, string>; // JSON object for multilingual support
  amount?: number;
  hsn_code?: string;
  profile_image?: File;
}

export interface OutletStockUpdateRequest {
  quantity?: number;
  invoice_quantity?: number;
  minimum_quantity?: number;
  is_extra_item?: boolean;
  movement_notes?: string;
  // Only allowed when stock_id is null (custom items)
  name?: Record<string, string>; // JSON object for multilingual support
  amount?: number;
  hsn_code?: string;
  profile_image?: File;
}

export interface CustomExtraItemCreateRequest {
  customer_id: number;
  stock_id: number;
  outlet_stock_id: number;
  quantity: number;
  price: number;
  name?: Record<string, string> | string;
}

export interface CustomExtraItemResponse {
  success: boolean;
  message: string;
  data: OutletStock;
}

export interface CustomExtraItemDeleteResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
  };
}

export interface OutletStockResponse {
  success: boolean;
  message: string;
  data: OutletStock;
}

export interface OutletStockListResponse {
  success: boolean;
  message: string;
  data: {
    stocks: OutletStock[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface StockItemsListResponse {
  success: boolean;
  message: string;
  data: {
    stock_items: StockItem[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}

export interface OutletStockDeleteResponse {
  success: boolean;
  message: string;
}

export interface StockMovement {
  movement_id: number;
  outlet_stock_id: number;
  customer_id: number;
  movement_type: string;
  quantity_changed: string;
  previous_quantity: string;
  new_quantity: string;
  reference_type: string;
  reference_id: number | null;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  outletStock: {
    id: number;
    name: string | null;
    stock_id: number | null;
    stockItem?: {
      stock_item_id: number;
      item_name: string;
    };
  };
}

export interface StockMovementsResponse {
  success: boolean;
  message: string;
  data: {
    movements: StockMovement[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}