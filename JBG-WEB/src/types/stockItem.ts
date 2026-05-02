export interface Unit {
  id: number;
  name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  short_name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  unit_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  stock_item_id: number;
  hsn_code: string;
  item_name: string; // JSON string with multilingual support
  unit_id: number;
  quantity: string;
  profile_image: string | null;
  profile_image_url?: string | null;
  production_cost: string;
  selling_cost: string;
  tax_percentage: string;
  shelf_life_days: number;
  barcode_number: string;
  is_packaging: boolean;
  is_flavour: boolean;
  is_sugerfree: boolean;
  is_malay: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit?: Unit;
}

export interface StockItemCreateRequest {
  hsn_code: string;
  item_name: Record<string, string>; // Object with language keys
  unit_id: number;
  selling_cost: number;
  production_cost: number;
  tax_percentage: number;
  is_active: boolean;
  quantity: number;
  barcode_number: string;
  is_packaging: boolean;
  is_flavour: boolean;
  is_sugerfree: boolean;
  is_malay: boolean;
  profile_image?: File;
}

export interface StockItemUpdateRequest {
  hsn_code?: string;
  item_name: Record<string, string>; // Object with language keys
  unit_id: number;
  selling_cost: number;
  production_cost: number;
  tax_percentage: number;
  is_active: boolean;
  quantity: number;
  barcode_number: string;
  is_packaging: boolean;
  is_flavour: boolean;
  is_sugerfree: boolean;
  is_malay: boolean;
  profile_image?: File | null;
}

export interface StockItemResponse {
  success: boolean;
  message: string;
  data: StockItem;
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

export interface StockItemDeleteResponse {
  success: boolean;
  message: string;
  data: null;
}

// Units API Response
export interface UnitsResponse {
  message: string;
  units: Unit[];
  count: number;
}

// Stock Movement interfaces
export interface StockMovement {
  movement_id: number;
  stock_item_id: number;
  movement_type: 'IN' | 'OUT';
  quantity_changed: string;
  previous_quantity: string;
  new_quantity: string;
  notes: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovementsResponse {
  success: boolean;
  message: string;
  data: {
    stock_movements: StockMovement[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}

// Helper interface for form handling
export interface StockItemFormData {
  hsn_code: string;
  unit_id: string; // Form inputs are strings initially
  item_name_default: string;
  item_name_en: string;
  item_name_hi: string;
  selling_cost: string;
  production_cost: string;
  tax_percentage: string;
  is_active: boolean;
  quantity: string;
  barcode_number: string;
  is_packaging: boolean;
  is_flavour: boolean;
  is_sugerfree: boolean;
  is_malay: boolean;
  profile_image?: File | null;
  current_profile_image?: string | null;
}
