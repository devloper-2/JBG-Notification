import axios from 'axios';
import { 
  RawMaterialCreateRequest, 
  RawMaterialUpdateRequest,
  RawMaterialResponse,
  RawMaterialsListResponse,
  RawMaterialDeleteResponse,
  StockMovementsResponse
} from '../types/rawMaterial';
import { api } from '../utils/apiClient';

// Utility function to parse API error responses (shared with outlet service)
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
const rawMaterialApi = api;

class RawMaterialService {
  /**
   * Get all raw materials with pagination
   */
  async getRawMaterials(page: number = 1, limit: number = 10): Promise<RawMaterialsListResponse> {
    try {
      console.log(`Fetching raw materials - page: ${page}, limit: ${limit}`);
      const response = await rawMaterialApi.get('/raw-materials', {
        params: { page, limit }
      });
      console.log('Raw materials fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch raw materials:', error);
      throw error;
    }
  }

  /**
   * Create a new raw material
   */
  async createRawMaterial(data: RawMaterialCreateRequest): Promise<RawMaterialResponse> {
    try {
      console.log('Creating raw material:', data);
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add basic fields
      if (data.hsn_code !== undefined) {
        formData.append('hsn_code', data.hsn_code);
      }
      formData.append('unit_id', data.unit_id.toString());
      formData.append('item_name', JSON.stringify(data.item_name));
      formData.append('quantity', data.quantity.toString());
      formData.append('cost_price', data.cost_price.toString());
      
      if (data.shelf_life_days !== undefined) {
        formData.append('shelf_life_days', data.shelf_life_days.toString());
      }
      
      if (data.min_stock_level !== undefined) {
        formData.append('min_stock_level', data.min_stock_level.toString());
      }
      
      if (data.max_stock_level !== undefined) {
        formData.append('max_stock_level', data.max_stock_level.toString());
      }

      // Add profile image if provided
      if (data.profile_image) {
        formData.append('profile_image', data.profile_image);
      }

      const response = await rawMaterialApi.post('/raw-materials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Raw material created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create raw material:', error);
      throw error;
    }
  }

  /**
   * Update an existing raw material
   */
  async updateRawMaterial(id: number, data: RawMaterialUpdateRequest): Promise<RawMaterialResponse> {
    try {
      console.log(`Updating raw material ${id}:`, data);
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add basic fields
      formData.append('hsn_code', data.hsn_code);
      formData.append('unit_id', data.unit_id.toString());
      formData.append('item_name', JSON.stringify(data.item_name));
      formData.append('quantity', data.quantity.toString());
      formData.append('cost_price', data.cost_price.toString());
      
      if (data.shelf_life_days !== undefined) {
        formData.append('shelf_life_days', data.shelf_life_days.toString());
      }
      
      if (data.min_stock_level !== undefined) {
        formData.append('min_stock_level', data.min_stock_level.toString());
      }
      
      if (data.max_stock_level !== undefined) {
        formData.append('max_stock_level', data.max_stock_level.toString());
      }

      // Add profile image if provided
      if (data.profile_image) {
        formData.append('profile_image', data.profile_image);
      }

      const response = await rawMaterialApi.put(`/raw-materials/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Raw material updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to update raw material:', error);
      throw error;
    }
  }

  /**
   * Delete a raw material
   */
  async deleteRawMaterial(id: number): Promise<RawMaterialDeleteResponse> {
    try {
      console.log(`Deleting raw material ${id}`);
      const response = await rawMaterialApi.delete(`/raw-materials/${id}`);
      console.log('Raw material deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to delete raw material:', error);
      throw error;
    }
  }

  /**
   * Get raw material by ID
   */
  async getRawMaterial(id: number): Promise<RawMaterialResponse> {
    try {
      console.log(`Fetching raw material ${id}`);
      const response = await rawMaterialApi.get(`/raw-materials/${id}`);
      console.log('Raw material fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch raw material:', error);
      throw error;
    }
  }

  /**
   * Get stock movements for a raw material
   */
  async getStockMovements(id: number, page: number = 1, limit: number = 10): Promise<StockMovementsResponse> {
    try {
      console.log(`Fetching stock movements for raw material ${id}`);
      const response = await rawMaterialApi.get(`/raw-materials/${id}/stock-movements?page=${page}&limit=${limit}`);
      console.log('Stock movements fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stock movements:', error);
      throw error;
    }
  }
}

// Export singleton instance
const rawMaterialService = new RawMaterialService();
export default rawMaterialService;
