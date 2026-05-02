import axios from 'axios';
import { 
  OutletStockCreateRequest, 
  OutletStockUpdateRequest,
  OutletStockResponse,
  OutletStockListResponse,
  OutletStockDeleteResponse,
  StockMovementsResponse,
  StockItemsListResponse,
  CustomExtraItemCreateRequest,
  CustomExtraItemResponse,
  CustomExtraItemDeleteResponse
} from '../types/outletStock';
import { Customer } from '../types/outletStock';
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
const outletStockApi = api;

const outletStockService = {
  // Get customer list
  async getCustomers(): Promise<Customer[]> {
    try {
      console.log('Making API call to get customers');
      const response = await outletStockApi.get<Customer[]>('/get-customer-user');
      console.log('Customers API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Get stock items for dropdown
  async getStockItems(): Promise<StockItemsListResponse> {
    try {
      console.log('Making API call to get stock items');
      const response = await outletStockApi.get<StockItemsListResponse>('/stock-items?page=1&limit=10000');
      console.log('Stock items API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw error;
    }
  },

  // Get outlet stock list with static pagination (page=1, limit=10000)
  async getOutletStockList(params?: { 
    customer_id?: number; 
  }): Promise<OutletStockListResponse> {
    try {
      console.log('Making API call to get outlet stock list with params:', params);
      
      // Always use static page=1 and limit=10000 for outlet stock list
      const requestParams = {
        page: 1,
        limit: 10000,
        ...(params && { customer_id: params.customer_id })
      };
      
      const response = await outletStockApi.get<OutletStockListResponse>('/outlet-stock/list', {
        params: requestParams
      });
      console.log('Outlet stock list API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching outlet stock list:', error);
      throw error;
    }
  },

  // Create outlet stock
  async createOutletStock(data: OutletStockCreateRequest): Promise<OutletStockResponse> {
    try {
      console.log('Making API call to create outlet stock with data:', data);
      
      const formData = new FormData();
      
      // Add required fields
      formData.append('customer_id', data.customer_id.toString());
      
      // Add optional fields if provided
      if (data.stock_id !== undefined) {
        formData.append('stock_id', data.stock_id.toString());
      }
      if (data.quantity !== undefined) {
        formData.append('quantity', data.quantity.toString());
      }
      if (data.invoice_quantity !== undefined) {
        formData.append('invoice_quantity', data.invoice_quantity.toString());
      }
      if (data.minimum_quantity !== undefined) {
        formData.append('minimum_quantity', data.minimum_quantity.toString());
      }
      if (data.is_extra_item !== undefined) {
        formData.append('is_extra_item', data.is_extra_item.toString());
      }
      
      // Add custom item fields if stock_id is not provided
      if (!data.stock_id) {
        if (data.name) {
          formData.append('name', JSON.stringify(data.name));
        }
        if (data.amount !== undefined) {
          formData.append('amount', data.amount.toString());
        }
        if (data.hsn_code) {
          formData.append('hsn_code', data.hsn_code);
        }
      }
      
      // Add profile image if provided
      if (data.profile_image) {
        formData.append('profile_image', data.profile_image);
      }
      
      const response = await outletStockApi.post<OutletStockResponse>('/outlet-stock/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Create outlet stock API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating outlet stock:', error);
      throw error;
    }
  },

  // Update outlet stock
  async updateOutletStock(id: number, data: OutletStockUpdateRequest): Promise<OutletStockResponse> {
    try {
      console.log('Making API call to update outlet stock with ID:', id, 'and data:', data);
      
      const formData = new FormData();
      
      // Add optional fields if provided
      if (data.quantity !== undefined) {
        formData.append('quantity', data.quantity.toString());
      }
      if (data.invoice_quantity !== undefined) {
        formData.append('invoice_quantity', data.invoice_quantity.toString());
      }
      if (data.minimum_quantity !== undefined) {
        formData.append('minimum_quantity', data.minimum_quantity.toString());
      }
      if (data.is_extra_item !== undefined) {
        formData.append('is_extra_item', data.is_extra_item.toString());
      }
      if (data.movement_notes) {
        formData.append('movement_notes', data.movement_notes);
      }
      
      // Add custom item fields (only allowed when stock_id is null)
      if (data.name) {
        formData.append('name', JSON.stringify(data.name));
      }
      if (data.amount !== undefined) {
        formData.append('amount', data.amount.toString());
      }
      if (data.hsn_code) {
        formData.append('hsn_code', data.hsn_code);
      }
      
      // Add profile image if provided
      if (data.profile_image) {
        formData.append('profile_image', data.profile_image);
      }
      
      const response = await outletStockApi.put<OutletStockResponse>(`/outlet-stock/update/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Update outlet stock API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating outlet stock:', error);
      throw error;
    }
  },

  // Delete outlet stock
  async deleteOutletStock(id: number): Promise<OutletStockDeleteResponse> {
    try {
      console.log('Making API call to delete outlet stock with ID:', id);
      const response = await outletStockApi.delete<OutletStockDeleteResponse>(`/outlet-stock/${id}`);
      console.log('Delete outlet stock API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting outlet stock:', error);
      throw error;
    }
  },

  // Get stock movements
  async getStockMovements(outletId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<StockMovementsResponse> {
    try {
      console.log('Making API call to get stock movements for outlet ID:', outletId, 'with params:', params);
      const response = await outletStockApi.get<StockMovementsResponse>(`/outlet-stock-movements/outlet/${outletId}`, {
        params
      });
      console.log('Stock movements API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      throw error;
    }
  },

  // Create custom extra item
  async createCustomExtraItem(data: CustomExtraItemCreateRequest): Promise<CustomExtraItemResponse> {
    try {
      console.log('Making API call to create custom extra item with data:', data);
      
      const payload = {
        customer_id: data.customer_id,
        stock_id: data.stock_id,
        outlet_stock_id: data.outlet_stock_id,
        quantity: data.quantity,
        price: data.price,
      };

      // Add name if provided, otherwise it will be auto-generated
      if (data.name) {
        if (typeof data.name === 'string') {
          (payload as any).name = data.name;
        } else {
          (payload as any).name = data.name;
        }
      }

      const response = await outletStockApi.post<CustomExtraItemResponse>('/outlet-stock/create-custom-extra', payload);
      
      console.log('Create custom extra item API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating custom extra item:', error);
      throw error;
    }
  },

  // Delete custom extra item
  async deleteCustomExtraItem(id: number): Promise<CustomExtraItemDeleteResponse> {
    try {
      console.log('Making API call to delete custom extra item with ID:', id);
      const response = await outletStockApi.delete<CustomExtraItemDeleteResponse>(`/outlet-stock/delete-custom-extra/${id}`);
      console.log('Delete custom extra item API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting custom extra item:', error);
      throw error;
    }
  },
};

export default outletStockService;