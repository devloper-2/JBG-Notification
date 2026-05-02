import axios from 'axios';
import { 
  MenuItemCreateRequest, 
  MenuItemUpdateRequest,
  MenuItemResponse,
  MenuItemsListResponse,
  MenuItemDeleteResponse,
  StockItemsResponse
} from '../types/menuItem';
import { api } from '../utils/apiClient';

// Utility function to parse API error responses
export const parseApiError = (error: any): { message: string; fieldErrors: Record<string, string> } => {
  const defaultMessage = 'An unexpected error occurred. Please try again.';
  const fieldErrors: Record<string, string> = {};

  if (!error) {
    return { message: defaultMessage, fieldErrors };
  }

  // Handle AxiosError
  if (axios.isAxiosError(error)) {
    const response = error.response?.data;

    if (response) {
      // Handle the specific error format: { message: string, details: string[] }
      if (response.message && Array.isArray(response.details)) {
        const message = response.message;
        response.details.forEach((detail: string) => {
          // Try to extract field name from error detail
          const fieldMatch = detail.match(/^(\w+)_(\w+)\s+(.+)$/);
          if (fieldMatch) {
            const [, prefix, field, errorMsg] = fieldMatch;
            const fieldName = `${prefix}_${field}`;
            fieldErrors[fieldName] = errorMsg;
          } else {
            // If we can't parse the field, add to general message
            fieldErrors.general = detail;
          }
        });
        return { message, fieldErrors };
      }

      // Handle validation errors format: { errors: { field: [messages] } }
      if (response.errors && typeof response.errors === 'object') {
        Object.entries(response.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            fieldErrors[field] = messages.join(', ');
          } else if (typeof messages === 'string') {
            fieldErrors[field] = messages;
          }
        });
        return { message: response.message || 'Validation failed', fieldErrors };
      }

      // Handle field errors array format: { errors: [{ type: "field", msg: "...", path: "field_name", ... }] }
      if (response.errors && Array.isArray(response.errors)) {
        response.errors.forEach((error: any) => {
          if (error.path && error.msg) {
            fieldErrors[error.path] = error.msg;
          }
        });
        return { message: response.message || 'Validation failed', fieldErrors };
      }

      // Simple message format
      if (response.message) {
        return { message: response.message, fieldErrors };
      }
    }

    // Network or other errors
    if (error.message) {
      return { message: error.message, fieldErrors };
    }
  }

  // Generic error handling
  if (error.message) {
    return { message: error.message, fieldErrors };
  }

  return { message: defaultMessage, fieldErrors };
};

// Use shared API client with centralized token expiration handling
const menuItemApi = api;

const menuItemService = {
  // Get all menu items
  async getMenuItems(): Promise<MenuItemsListResponse> {
    try {
      const response = await menuItemApi.get<MenuItemsListResponse>('/menu-items');
      console.log('Menu items fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  },

  // Get menu item by ID
  async getMenuItemById(id: number, outletId?: number | null): Promise<MenuItemResponse> {
    try {
      const params: Record<string, string> = {};
      if (outletId) {
        params.outlet_id = outletId.toString();
      }
      const response = await menuItemApi.get<MenuItemResponse>(`/menu-items/${id}`, { params });
      console.log('Menu item fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  },

  // Create new menu item
  async createMenuItem(data: MenuItemCreateRequest): Promise<MenuItemResponse> {
    try {
      console.log('Creating menu item with data:', data);
      const response = await menuItemApi.post<MenuItemResponse>('/menu-items', data);
      console.log('Menu item created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  },

  // Update menu item
  async updateMenuItem(id: number, data: MenuItemUpdateRequest): Promise<MenuItemResponse> {
    try {
      console.log('Updating menu item with ID:', id, 'and data:', data);
      const response = await menuItemApi.put<MenuItemResponse>(`/menu-items/${id}`, data);
      console.log('Menu item updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  },

  // Delete menu item
  async deleteMenuItem(id: number): Promise<MenuItemDeleteResponse> {
    try {
      console.log('Deleting menu item with ID:', id);
      const response = await menuItemApi.delete<MenuItemDeleteResponse>(`/menu-items/${id}`);
      console.log('Menu item deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  },

  // Get stock items for recipes (used in dropdowns)
  async getStockItems(): Promise<StockItemsResponse> {
    try {
      const response = await menuItemApi.get<{ success: boolean; message: string; data: StockItemsResponse }>('/stock-items', {
        params: {
          page: 1,
          limit: 10000
        }
      });
      console.log('Stock items API full response:', response.data);
      console.log('Stock items data:', response.data.data);
      console.log('Stock items array:', response.data.data.stock_items);
      
      // The API returns data wrapped in a data object
      return response.data.data;
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw error;
    }
  }
};

export default menuItemService;