import { api } from '../utils/apiClient';

export interface Expense {
  id: number;
  customer_id: number;
  description: string;
  amount: string;
  category_id?: number | null;
  daily_balance_sheet_unique_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: number;
  customer_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminExpensesResponse {
  success: boolean;
  count: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalAmount: string;
  data: Expense[];
}

export interface ExpenseCreateRequest {
  description: string;
  amount: number;
  category_id?: number;
}

export interface ExpenseUpdateRequest {
  description?: string;
  amount?: number;
  category_id?: number | null;
}

export interface OutletExpenseCreateRequest extends ExpenseCreateRequest {
  customer_id: number;
  daily_balance_sheet_unique_id?: string;
}

interface OutletExpensesResponse {
  success: boolean;
  count?: number;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  data?: Expense[];
  starting_balance?: number;
  message?: string;
}

interface ExpenseCategoriesResponse {
  success: boolean;
  count: number;
  data: ExpenseCategory[];
}

const expenseService = {
  getExpensesByOutlet: async (
    outletId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<AdminExpensesResponse> => {
    const response = await api.get<AdminExpensesResponse>(
      `/admin/expenses/${outletId}`,
      { params }
    );
    return response.data;
  },

  addExpense: async (
    outletId: number,
    data: ExpenseCreateRequest
  ): Promise<{ success: boolean; message: string; data: Expense }> => {
    const response = await api.post(`/admin/expenses/${outletId}`, data);
    return response.data;
  },

  updateExpense: async (
    outletId: number,
    expenseId: number,
    data: ExpenseUpdateRequest
  ): Promise<{ success: boolean; message: string; data: Expense }> => {
    const response = await api.put(`/admin/expenses/${outletId}/${expenseId}`, data);
    return response.data;
  },

  deleteExpense: async (
    outletId: number,
    expenseId: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/expenses/${outletId}/${expenseId}`);
    return response.data;
  },

  getOutletExpenses: async (
    customerId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      daily_balance_sheet_unique_id?: string;
    }
  ): Promise<OutletExpensesResponse> => {
    const response = await api.get<OutletExpensesResponse>(
      `/get-expenses/${customerId}`,
      { params }
    );
    return response.data;
  },

  addOutletExpense: async (
    data: OutletExpenseCreateRequest
  ): Promise<{ success: boolean; message: string; data: Expense }> => {
    const response = await api.post('/add_expense', data);
    return response.data;
  },

  updateOutletExpense: async (
    expenseId: number,
    data: ExpenseUpdateRequest
  ): Promise<{ success: boolean; message: string; data: Expense }> => {
    const response = await api.put(`/update-expense/${expenseId}`, data);
    return response.data;
  },

  deleteOutletExpense: async (
    expenseId: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/delete-expense/${expenseId}`);
    return response.data;
  },

  getExpenseCategories: async (customerId: number): Promise<ExpenseCategoriesResponse> => {
    const response = await api.get<ExpenseCategoriesResponse>(`/get-expense-categories/${customerId}`);
    return response.data;
  },

  addExpenseCategory: async (
    customerId: number,
    name: string
  ): Promise<{ success: boolean; message: string; data: ExpenseCategory }> => {
    const response = await api.post('/add-expense-category', {
      customer_id: customerId,
      name,
    });
    return response.data;
  },

  updateExpenseCategory: async (
    customerId: number,
    categoryId: number,
    name: string
  ): Promise<{ success: boolean; message: string; data: ExpenseCategory }> => {
    const response = await api.put(`/update-expense-category/${customerId}/${categoryId}`, {
      name,
    });
    return response.data;
  },

  deleteExpenseCategory: async (
    customerId: number,
    categoryId: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/delete-expense-category/${customerId}/${categoryId}`);
    return response.data;
  },
};

export default expenseService;
