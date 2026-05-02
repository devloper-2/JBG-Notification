export interface Unit {
  id: number;
  name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  short_name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  unit_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawMaterial {
  raw_material_id: number;
  hsn_code: string;
  item_name: string; // JSON string with multilingual support
  unit_id: number;
  quantity: number;
  cost_price: string;
  min_stock_level: string;
  max_stock_level: string;
  shelf_life_days: number;
  profile_image: string | null;
  profile_image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit?: Unit;
}

export interface RawMaterialCreateRequest {
  hsn_code?: string;
  unit_id: number;
  item_name: Record<string, string>; // Object with language keys
  quantity: number;
  cost_price: number;
  shelf_life_days?: number;
  profile_image?: File;
  min_stock_level?: number;
  max_stock_level?: number;
}

export interface RawMaterialUpdateRequest {
  hsn_code: string;
  unit_id: number;
  item_name: Record<string, string>; // Object with language keys
  quantity: number;
  cost_price: number;
  shelf_life_days?: number;
  profile_image?: File | null;
  min_stock_level?: number;
  max_stock_level?: number;
}

export interface RawMaterialResponse {
  success: boolean;
  message: string;
  data: RawMaterial;
}

export interface RawMaterialsListResponse {
  success: boolean;
  message: string;
  data: {
    raw_materials: RawMaterial[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}

export interface RawMaterialDeleteResponse {
  success: boolean;
  message: string;
  data: null;
}

// Stock Movement interfaces
export interface StockMovement {
  movement_id: number;
  raw_material_id: number;
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
export interface RawMaterialFormData {
  hsn_code: string;
  unit_id: string; // Form inputs are strings initially
  item_name_default: string;
  item_name_1: string;
  item_name_2: string;
  quantity: string;
  cost_price: string;
  shelf_life_days: string;
  min_stock_level: string;
  max_stock_level: string;
  profile_image?: File | null;
  current_profile_image?: string | null;
}
