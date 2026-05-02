import { api } from '../utils/apiClient';
import { OrderListResponse } from '../types/order';

/**
 * Order Service
 * Handles all order-related API calls
 */
const orderService = {
  /**
   * Get all orders for a customer
   * @param customerId - The customer ID
   * @param params - Optional query parameters for filtering, sorting, pagination
   * @returns Promise with order list response
   */
  getOrders: async (
    customerId: number,
    params?: {
      page?: number;
      per_page?: number;
      startDate?: string;
      endDate?: string;
      orderType?: string;
      paymentMethod?: string;
      status?: string;
      search_term?: string;
      min_amount?: number;
      max_amount?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
    }
  ): Promise<OrderListResponse> => {
    const response = await api.get<OrderListResponse>(
      `/orders/${customerId}/all`,
      { params }
    );
    return response.data;
  },

  /**
   * Get all orders for a specific outlet/customer (Admin view)
   * @param customerId - The customer/outlet ID
   * @param params - Optional query parameters for filtering, sorting, pagination
   * @returns Promise with order list response
   */
  getOrdersByOutlet: async (
    customerId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      orderType?: string;
      paymentMethod?: string;
      status?: string;
      search_term?: string;
    }
  ): Promise<{ success: boolean; count: number; data: any[] }> => {
    const response = await api.get<{ success: boolean; count: number; data: any[] }>(
      `/find-orders/${customerId}`,
      { params }
    );
    return response.data;
  },
};

export default orderService;

/**
 * Parse API error into a user-friendly format
 */
export const parseApiError = (error: any): { message: string; fieldErrors: Record<string, string> } => {
  if (error.response?.data) {
    const data = error.response.data;
    
    // Handle validation errors with field-specific messages
    if (data.errors && typeof data.errors === 'object') {
      return {
        message: data.message || 'Validation failed',
        fieldErrors: data.errors,
      };
    }
    
    // Handle general error messages
    if (data.message) {
      return {
        message: data.message,
        fieldErrors: {},
      };
    }
  }
  
  // Default error message
  return {
    message: 'An unexpected error occurred. Please try again.',
    fieldErrors: {},
  };
};
