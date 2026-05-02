import { api } from "../utils/apiClient";
import {
  CustomerInvoiceListResponse,
  CreateInvoicePayload,
  CreateInvoiceResponse,
  Invoice,
  InvoiceListResponse,
  UpdateInvoicePayload,
  UpdateInvoiceResponse,
} from "../types/invoice";

const invoiceService = {
  getInvoices: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
  }): Promise<InvoiceListResponse> => {
    const response = await api.get<InvoiceListResponse>("/invoices/list", {
      params,
    });
    return response.data;
  },

  getCustomerInvoices: async (params?: {
    page?: number;
    limit?: number;
    per_page?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    packaging_stock_item_id?: number;
    has_packaging?: boolean | string | number;
  }): Promise<CustomerInvoiceListResponse> => {
    const response = await api.get<CustomerInvoiceListResponse>(
      "/invoices/customer/list",
      { params }
    );
    return response.data;
  },

  getInvoiceByIdFromList: async (invoiceId: number): Promise<Invoice | null> => {
    const firstPageResponse = await invoiceService.getInvoices({
      page: 1,
      per_page: 50,
    });

    const firstMatch = firstPageResponse.data.invoices.find(
      (invoice) => invoice.invoice_id === invoiceId
    );

    if (firstMatch) {
      return firstMatch;
    }

    const totalPages = firstPageResponse.data.totalPages;

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await invoiceService.getInvoices({ page, per_page: 50 });
      const match = response.data.invoices.find(
        (invoice) => invoice.invoice_id === invoiceId
      );

      if (match) {
        return match;
      }
    }

    return null;
  },

  createInvoice: async (
    payload: CreateInvoicePayload
  ): Promise<CreateInvoiceResponse> => {
    const response = await api.post<CreateInvoiceResponse>(
      "/invoices/create",
      payload
    );
    return response.data;
  },

  updateInvoice: async (
    invoiceId: number,
    payload: UpdateInvoicePayload
  ): Promise<UpdateInvoiceResponse> => {
    const response = await api.put<UpdateInvoiceResponse>(
      `/invoices/${invoiceId}`,
      payload
    );
    return response.data;
  },

  sendInvoice: async (
    invoiceId: number
  ): Promise<{ success: boolean; message: string; data: Invoice }> => {
    const response = await api.patch<{ success: boolean; message: string; data: Invoice }>(
      `/invoices/${invoiceId}/send`
    );
    return response.data;
  },

  deleteInvoice: async (
    invoiceId: number
  ): Promise<{ success: boolean; message: string; data?: { message: string } }> => {
    const response = await api.delete<{
      success: boolean;
      message: string;
      data?: { message: string };
    }>(`/invoices/${invoiceId}`);
    return response.data;
  },
};

export default invoiceService;
