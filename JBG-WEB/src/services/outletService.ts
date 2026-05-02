import axios from 'axios';
import { Outlet, OutletUpdateRequest, OutletUpdateResponse, OutletCreateRequest, OutletCreateResponse } from '../types/outlet';
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
          // Example: "pan_no must be unique" -> field: "pan_no", message: "must be unique"
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
          if (error.type === 'field' && error.path && error.msg) {
            fieldErrors[error.path] = error.msg;
          } else if (error.msg) {
            // If no specific path, add to general errors
            fieldErrors.general = error.msg;
          }
        });
        return { message: 'Validation failed', fieldErrors };
      }

      // Handle simple message format
      if (response.message) {
        return { message: response.message, fieldErrors };
      }

      // Handle array of errors
      if (Array.isArray(response)) {
        const messages = response.map(err => typeof err === 'string' ? err : err.message || 'Unknown error').join(', ');
        return { message: messages, fieldErrors };
      }
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      return { message: 'Network error. Please check your connection and try again.', fieldErrors };
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return { message: 'Request timed out. Please try again.', fieldErrors };
    }
  }

  // Handle generic errors
  if (error.message) {
    return { message: error.message, fieldErrors };
  }

  return { message: defaultMessage, fieldErrors };
};

// Use shared API client with centralized token expiration handling
const outletApi = api;

class OutletService {
  /**
   * Create a new outlet/customer
   */
  async createOutlet(data: OutletCreateRequest): Promise<OutletCreateResponse> {
    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add basic fields
      formData.append('name', data.name);
      formData.append('mobile', data.mobile);
      if (data.email) formData.append('email', data.email);
      formData.append('address', data.address);
      formData.append('country_code', data.country_code);
      if (data.gst_no) formData.append('gst_no', data.gst_no);
      if (data.pan_no) formData.append('pan_no', data.pan_no);
      if (data.pos_password) formData.append('pos_password', data.pos_password);
      if (data.terms_condition) formData.append('terms_condition', data.terms_condition);
      
      // Add logo file if provided
      if (data.logo) {
        formData.append('logo', data.logo);
      }
      
      // Add bank details if provided
      if (data.bank_details && data.bank_details.length > 0) {
        data.bank_details.forEach((bank, index) => {
          formData.append(`bank_details[${index}][id]`, bank.id?.toString() || '0');
          formData.append(`bank_details[${index}][account_name]`, bank.account_name);
          formData.append(`bank_details[${index}][account_no]`, bank.account_no);
          formData.append(`bank_details[${index}][ifsc_code]`, bank.ifsc_code);
          formData.append(`bank_details[${index}][bank_name]`, bank.bank_name);
          if (bank.branch_name) formData.append(`bank_details[${index}][branch_name]`, bank.branch_name);
          if (bank.address) formData.append(`bank_details[${index}][address]`, bank.address);
          formData.append(`bank_details[${index}][is_primary]`, bank.is_primary.toString());
        });
      }

      const response = await outletApi.post<OutletCreateResponse>(
        '/customers',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating outlet:', error);
      throw new Error('Failed to create outlet. Please try again.');
    }
  }

  /**
   * Get all outlets/customers
   */
  async getOutlets(): Promise<Outlet[]> {
    try {
      const response = await outletApi.get<Outlet[]>('/get-customer-user');
      return response.data;
    } catch (error) {
      console.error('Error fetching outlets:', error);
      throw new Error('Failed to fetch outlets. Please try again.');
    }
  }

  /**
   * Update outlet details
   */
  async updateOutlet(outletId: number, data: OutletUpdateRequest): Promise<OutletUpdateResponse> {
    try {
      // Create FormData for multipart/form-data request to match API documentation
      const formData = new FormData();
      
      // Add basic fields
      formData.append('name', data.name);
      formData.append('mobile', data.mobile);
      if (data.email) formData.append('email', data.email);
      formData.append('address', data.address);
      formData.append('country_code', data.country_code);
      if (data.gst_no !== undefined) formData.append('gst_no', data.gst_no === null ? 'null' : data.gst_no);
      if (data.pan_no !== undefined) formData.append('pan_no', data.pan_no === null ? 'null' : data.pan_no);
      if (data.pos_password) formData.append('pos_password', data.pos_password);
      if (data.terms_condition) formData.append('terms_condition', data.terms_condition);
      
      // Add bank details if they exist
      if (data.bank_details) {
        data.bank_details.forEach((bank, index) => {
          if (bank.id) formData.append(`bank_details[${index}][id]`, bank.id.toString());
          formData.append(`bank_details[${index}][account_name]`, bank.account_name);
          formData.append(`bank_details[${index}][account_no]`, bank.account_no);
          formData.append(`bank_details[${index}][ifsc_code]`, bank.ifsc_code);
          formData.append(`bank_details[${index}][bank_name]`, bank.bank_name);
          if (bank.branch_name) formData.append(`bank_details[${index}][branch_name]`, bank.branch_name);
          if (bank.address) formData.append(`bank_details[${index}][address]`, bank.address);
          formData.append(`bank_details[${index}][is_primary]`, bank.is_primary.toString());
        });
      }
      
      // Add tax details if they exist
      if (data.taxes) {
        data.taxes.forEach((tax, index) => {
          if (tax.id !== undefined && tax.id !== null) formData.append(`taxes[${index}][id]`, tax.id.toString());
          formData.append(`taxes[${index}][tax_name]`, tax.tax_name);
          formData.append(`taxes[${index}][tax_value]`, tax.tax_value.toString());
          formData.append(`taxes[${index}][is_active]`, tax.is_active ? 'true' : 'false');
        });
      }
      
      // Add logo file if provided or null for removal
      if (data.logo !== undefined) {
        if (data.logo === null) {
          // Send empty string to indicate logo removal
          formData.append('logo', '');
        } else {
          // Send the file
          formData.append('logo', data.logo);
        }
      }

      const response = await outletApi.put<OutletUpdateResponse>(
        `/customer-update/${outletId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating outlet:', error);
      throw new Error('Failed to update outlet. Please try again.');
    }
  }

  /**
   * Delete outlet
   */
  async deleteOutlet(outletId: number): Promise<{ message: string }> {
    try {
      const response = await outletApi.delete<{ message: string }>(
        `/customers/${outletId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting outlet:', error);
      throw new Error('Failed to delete outlet. Please try again.');
    }
  }

  /**
   * Upload outlet logo
   */
  async uploadLogo(outletId: number, logoFile: File): Promise<{ logoUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await outletApi.post<{ logoUrl: string }>(
        `/customer-logo-upload/${outletId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw new Error('Failed to upload logo. Please try again.');
    }
  }

  /**
   * Delete a specific tax for an outlet
   */
  async deleteTax(outletId: number, taxId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await outletApi.delete<{ success: boolean; message: string }>(
        `/customers/${outletId}/taxes/${taxId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting tax:', error);
      throw new Error('Failed to delete tax. Please try again.');
    }
  }
}

export const outletService = new OutletService();
export default outletService;
