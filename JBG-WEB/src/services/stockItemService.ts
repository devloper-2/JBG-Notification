import axios from 'axios';
import { 
  StockItemCreateRequest, 
  StockItemUpdateRequest,
  StockItemResponse,
  StockItemsListResponse,
  StockItemDeleteResponse,
  StockMovementsResponse,
  UnitsResponse
} from '../types/stockItem';
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
const stockItemApi = api;

class StockItemService {
  
  // Get all stock items
  async getStockItems(page = 1, limit = 10, search = ''): Promise<StockItemsListResponse> {
    try {
      console.log('Fetching stock items...');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await stockItemApi.get<StockItemsListResponse>(`/stock-items?${params}`);
      console.log('Stock items response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw error;
    }
  }

  // Get stock item by ID
  async getStockItemById(id: number): Promise<StockItemResponse> {
    try {
      console.log(`Fetching stock item with ID: ${id}`);
      const response = await stockItemApi.get<StockItemResponse>(`/stock-items/${id}`);
      console.log('Stock item response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stock item ${id}:`, error);
      throw error;
    }
  }

  // Create new stock item
  async createStockItem(stockItemData: StockItemCreateRequest): Promise<StockItemResponse> {
    try {
      console.log('Creating stock item:', stockItemData);

      const formData = new FormData();
      
      // Add basic fields
      formData.append('hsn_code', stockItemData.hsn_code);
      formData.append('item_name', JSON.stringify(stockItemData.item_name));
      formData.append('unit_id', stockItemData.unit_id.toString());
      formData.append('selling_cost', stockItemData.selling_cost.toString());
      formData.append('production_cost', stockItemData.production_cost.toString());
      formData.append('tax_percentage', stockItemData.tax_percentage.toString());
      formData.append('is_active', stockItemData.is_active.toString());
      formData.append('quantity', stockItemData.quantity.toString());
      formData.append('barcode_number', stockItemData.barcode_number);
      formData.append('is_packaging', stockItemData.is_packaging.toString());
      formData.append('is_sugerfree', stockItemData.is_sugerfree.toString());
      formData.append('is_flavour', stockItemData.is_flavour.toString());
      formData.append('is_malay', stockItemData.is_malay.toString());

      // Add image if provided
      if (stockItemData.profile_image) {
        formData.append('profile_image', stockItemData.profile_image);
      }

      const response = await stockItemApi.post<StockItemResponse>('/stock-items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Stock item created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating stock item:', error);
      throw error;
    }
  }

  // Update stock item
  async updateStockItem(id: number, stockItemData: StockItemUpdateRequest): Promise<StockItemResponse> {
    try {
      console.log(`Updating stock item ${id}:`, stockItemData);

      const formData = new FormData();
      
      // Add basic fields
      if (stockItemData.hsn_code) {
        formData.append('hsn_code', stockItemData.hsn_code);
      }
      formData.append('item_name', JSON.stringify(stockItemData.item_name));
      formData.append('unit_id', stockItemData.unit_id.toString());
      formData.append('selling_cost', stockItemData.selling_cost.toString());
      formData.append('production_cost', stockItemData.production_cost.toString());
      formData.append('tax_percentage', stockItemData.tax_percentage.toString());
      formData.append('is_active', stockItemData.is_active.toString());
      formData.append('quantity', stockItemData.quantity.toString());
      formData.append('barcode_number', stockItemData.barcode_number);
      formData.append('is_packaging', stockItemData.is_packaging.toString());
      formData.append('is_sugerfree', stockItemData.is_sugerfree.toString());
      formData.append('is_flavour', stockItemData.is_flavour.toString());
      formData.append('is_malay', stockItemData.is_malay.toString());

      // Handle image - if it's a File object, append it; if null, we're removing the image
      if (stockItemData.profile_image instanceof File) {
        formData.append('profile_image', stockItemData.profile_image);
      } else if (stockItemData.profile_image === null) {
        formData.append('remove_image', 'true');
      }

      const response = await stockItemApi.put<StockItemResponse>(`/stock-items/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Stock item updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating stock item ${id}:`, error);
      throw error;
    }
  }

  // Delete stock item
  async deleteStockItem(id: number): Promise<StockItemDeleteResponse> {
    try {
      console.log(`Deleting stock item ${id}`);
      const response = await stockItemApi.delete<StockItemDeleteResponse>(`/stock-items/${id}`);
      console.log('Stock item deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error deleting stock item ${id}:`, error);
      throw error;
    }
  }

  // Get stock movements for a stock item
  async getStockMovements(stockItemId: number, page = 1, limit = 10): Promise<StockMovementsResponse> {
    try {
      console.log(`Fetching stock movements for stock item ${stockItemId}`);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await stockItemApi.get<StockMovementsResponse>(`/stock-items/${stockItemId}/movements?${params}`);
      console.log('Stock movements response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stock movements for stock item ${stockItemId}:`, error);
      throw error;
    }
  }

  // Get units for dropdown
  async getUnits(): Promise<UnitsResponse> {
    try {
      console.log('Fetching units...');
      const response = await stockItemApi.get<UnitsResponse>('/get-unit');
      console.log('Units response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  }
}

export default new StockItemService();
