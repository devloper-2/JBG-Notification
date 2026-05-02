import axios from 'axios';
import {
  OutletMenuCreateRequest,
  OutletMenuUpdateRequest,
  OutletMenuResponse,
  OutletMenuListResponse,
  FlavourDisplayOrderUpdateRequest,
  FlavourDisplayOrderUpdateResponse,
} from '../types/outletMenu';
import { api } from '../utils/apiClient';

// Use shared API client with centralized token expiration handling
const outletMenuApi = api;



class OutletMenuService {
  // Test method to check token authentication
  async testTokenCall(): Promise<any> {
    try {
      const response = await outletMenuApi.get('/outlet-menu-items?page=1&limit=1');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOutletMenuItems(page: number = 1, limit: number = 10, outletId?: number | null): Promise<OutletMenuListResponse> {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Add outlet filter if specified
      if (outletId) {
        params.append('outlet_id', outletId.toString());
      }
      
      const response = await outletMenuApi.get(`/outlet-menu-items?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOutletMenuItem(data: OutletMenuCreateRequest): Promise<OutletMenuResponse> {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await outletMenuApi.post('/outlet-menu-items', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateOutletMenuItem(id: number, data: OutletMenuUpdateRequest): Promise<OutletMenuResponse> {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await outletMenuApi.put(`/outlet-menu-items/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteOutletMenuItem(id: number): Promise<{ success: boolean; message: string }> {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await outletMenuApi.delete(`/outlet-menu-items/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateFlavourDisplayOrder(
    outletMenuItemId: number,
    data: FlavourDisplayOrderUpdateRequest
  ): Promise<FlavourDisplayOrderUpdateResponse> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await outletMenuApi.put(
        `/outlet-menu-items/${outletMenuItemId}/flavour-display-order`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'An error occurred';
      const customError = new Error(message);
      // Attach the full error response for detailed error handling
      (customError as any).response = error.response;
      return customError;
    }
    return error instanceof Error ? error : new Error('An unknown error occurred');
  }
}

// Error parsing utility similar to other services
export const parseApiError = (error: any): { message: string; fieldErrors: Record<string, string> } => {
  if (error?.response?.data) {
    const errorData = error.response.data;

    if (Array.isArray(errorData.errors)) {
      const fieldErrors: Record<string, string> = {};
      errorData.errors.forEach((item: any) => {
        if (item?.path && item?.msg) {
          fieldErrors[item.path] = item.msg;
        }
      });

      return {
        message: errorData.message || 'Validation failed',
        fieldErrors
      };
    }
    
    // Handle validation errors with field-specific messages
    if (errorData.errors && typeof errorData.errors === 'object') {
      const fieldErrors: Record<string, string> = {};
      
      Object.keys(errorData.errors).forEach(field => {
        const fieldError = errorData.errors[field];
        if (Array.isArray(fieldError) && fieldError.length > 0) {
          fieldErrors[field] = fieldError[0];
        } else if (typeof fieldError === 'string') {
          fieldErrors[field] = fieldError;
        }
      });
      
      return {
        message: errorData.message || 'Validation failed',
        fieldErrors
      };
    }
    
    // Handle general error messages
    return {
      message: errorData.message || 'An error occurred',
      fieldErrors: {}
    };
  }
  
  return {
    message: error?.message || 'An unknown error occurred',
    fieldErrors: {}
  };
};

const outletMenuService = new OutletMenuService();
export default outletMenuService;