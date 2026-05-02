export interface OutletMenuItem {
  outlet_menu_item_id: number;
  outlet_id: number;
  menu_item_id: number;
  custom_price: string;
  swigy_price?: string;
  zomato_price?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  outlet: {
    id: number;
    name: string;
    email: string;
    mobile: string;
    address?: string;
  };
  menu_item: {
    id: number;
    item_name: string;
    description: string;
    rate: string;
    hsn_code: string;
    category: string | null;
    is_active: boolean;
  };
}

export interface OutletMenuCreateRequest {
  outlet_id: number;
  menu_item_id: number;
  custom_price: string;
  swigy_price?: string;
  zomato_price?: string;
  display_order: number;
  is_active?: boolean;
}

export interface OutletMenuUpdateRequest {
  outlet_id?: number;
  menu_item_id?: number;
  custom_price?: string;
  swigy_price?: string;
  zomato_price?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface OutletMenuResponse {
  success: boolean;
  message: string;
  data: OutletMenuItem;
}

export interface OutletMenuListResponse {
  success: boolean;
  message: string;
  data: {
    items: OutletMenuItem[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FlavourDisplayOrderRecipe {
  menu_recipe_id: number;
  display_order: number;
}

export interface FlavourDisplayOrderUpdateRequest {
  recipe_ids: number[];
}

export interface FlavourDisplayOrderUpdateResponse {
  success: boolean;
  message: string;
  data: FlavourDisplayOrderRecipe[];
}