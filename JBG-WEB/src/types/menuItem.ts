export interface Unit {
  id: number;
  name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  short_name: Record<string, string>; // Object with language keys (1, 2, 3, default)
  unit_type: string;
}

export interface StockItem {
  stock_item_id: number;
  item_name: string; // JSON string with multilingual support
  unit_id: number;
  is_flavour: boolean;
  is_packaging: boolean;
  is_sugerfree: boolean;
  is_malay: boolean;
  unit?: Unit;
}

export interface MenuRecipe {
  id?: number;
  menu_id?: number;
  stock_id: number;
  is_default: boolean;
  is_flavour: boolean;
  is_malay: boolean;
  display_order?: number | null;
  quantity?: number | string | null;
  created_at?: string;
  updated_at?: string;
  stockItem?: StockItem;
}

export interface MenuItem {
  id: number;
  item_name: string; // JSON string with multilingual support
  description: string | null; // JSON string with multilingual support
  rate: string;
  hsn_code: string;
  is_active: boolean;
  category: string | null;
  flavour_quantity: number | null;
  created_at: string;
  updated_at: string;
  recipes: MenuRecipe[];
}

export interface MenuItemCreateRequest {
  item_name: Record<string, string>; // Object with language keys
  description?: Record<string, string>; // Object with language keys
  rate: number;
  hsn_code: string;
  flavour_quantity?: number;
  category?: string;
  recipes: {
    stock_id: number;
    is_default: boolean;
    is_flavour: boolean;
    is_malay: boolean;
    quantity?: number;
  }[];
}

export interface MenuItemUpdateRequest {
  item_name?: Record<string, string>; // Object with language keys
  description?: Record<string, string>; // Object with language keys
  rate?: number;
  hsn_code?: string;
  flavour_quantity?: number;
  category?: string;
  recipes?: {
    id?: number;
    stock_id: number;
    is_default: boolean;
    is_flavour: boolean;
    is_malay: boolean;
    quantity?: number;
  }[];
}

export interface MenuItemResponse {
  success: boolean;
  message: string;
  data: MenuItem;
}

export interface MenuItemsListResponse {
  success: boolean;
  message: string;
  data: {
    menuItems: MenuItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface MenuItemDeleteResponse {
  success: boolean;
  message: string;
}

export interface StockItemsResponse {
  stock_items: StockItem[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}