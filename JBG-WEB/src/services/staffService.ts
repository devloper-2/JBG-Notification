import { api } from '../utils/apiClient';

export interface Staff {
  id: number;
  customer_id: number;
  firstname: string;
  lastname: string;
  email?: string | null;
  phone_number?: string | null;
  role_id: number;
  employee_code?: string | null;
  salary_per_hour: string | number;
  documentUrl?: string | null;
  total_minutes?: number;
  total_hours?: number;
  total_billable_amount?: string;
  total_borrowed_amount?: string;
  net_payable_amount?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffListSummary {
  totalMinutes: number;
  totalHours: number;
  totalBillableAmount: string;
  totalBorrowedAmount: string;
  totalNetPayableAmount: string;
}

export interface AdminStaffResponse {
  success: boolean;
  count: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  filters: {
    startDate: string;
    endDate: string;
  };
  summary: StaffListSummary;
  data: Staff[];
}

export interface StaffCreateRequest {
  firstname: string;
  lastname: string;
  email?: string;
  password?: string;
  phone_number?: string;
  role_id: number;
  employee_code?: string;
  salary_per_hour?: number;
  document?: File;
}

export interface StaffUpdateRequest {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  phone_number?: string;
  role_id?: number;
  employee_code?: string;
  salary_per_hour?: number;
  document?: File;
}

export interface StaffImportRow {
  firstname: string;
  lastname: string;
  phone_number?: string;
  role_id?: number;
  employee_code?: string;
  salary_per_hour?: number;
}

export interface TimesheetImportRow {
  employee_code?: string;
  employee_name?: string;
  date: string;
  time: string;
  direction: string;
  mode?: string;
}

export interface TimesheetEntry {
  id: number;
  customer_id: number;
  user_id: number;
  work_date: string;
  clock_in_at: string;
  clock_out_at?: string | null;
  total_minutes: number;
  total_hours: number;
  entry_source: 'manual' | 'machine_import';
  mode?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyTimesheetTotal {
  work_date: string;
  total_minutes: number;
  total_hours: number;
  total_billable_amount: string;
  entries_count: number;
}

export interface TimesheetSummary {
  total_minutes: number;
  total_hours: number;
  total_billable_amount: string;
  total_borrowed_amount: string;
  net_payable_amount: string;
  days_worked: number;
}

export interface StaffTimesheetResponse {
  success: boolean;
  filters: {
    startDate: string;
    endDate: string;
  };
  staff: Staff;
  summary: TimesheetSummary;
  dailyTotals: DailyTimesheetTotal[];
  entries: TimesheetEntry[];
}

export interface Borrowing {
  id: number;
  customer_id: number;
  user_id: number;
  amount: string;
  borrow_date: string;
  note?: string | null;
  staff_name?: string | null;
  employee_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowingsResponse {
  success: boolean;
  filters: {
    startDate: string;
    endDate: string;
  };
  totalAmount: string;
  data: Borrowing[];
}

export interface BorrowingCreateRequest {
  user_id: number;
  amount: number;
  borrow_date: string;
  note?: string;
}

const appendFormData = (formData: FormData, data: StaffCreateRequest | StaffUpdateRequest) => {
  if (data.firstname !== undefined) {
    formData.append('firstname', data.firstname);
  }
  if (data.lastname !== undefined) {
    formData.append('lastname', data.lastname);
  }
  if (data.email !== undefined) {
    formData.append('email', data.email);
  }
  if (data.password !== undefined) {
    formData.append('password', data.password);
  }
  if (data.phone_number !== undefined) {
    formData.append('phone_number', data.phone_number);
  }
  if (data.role_id !== undefined) {
    formData.append('role_id', String(data.role_id));
  }
  if (data.employee_code !== undefined) {
    formData.append('employee_code', data.employee_code);
  }
  if (data.salary_per_hour !== undefined) {
    formData.append('salary_per_hour', String(data.salary_per_hour));
  }
  if (data.document) {
    formData.append('document', data.document);
  }
};

const staffService = {
  getStaffByOutlet: async (
    outletId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<AdminStaffResponse> => {
    const response = await api.get<AdminStaffResponse>(`/admin/staff/${outletId}`, { params });
    return response.data;
  },

  addStaff: async (
    outletId: number,
    data: StaffCreateRequest
  ): Promise<{ success: boolean; message: string; data: Staff }> => {
    const formData = new FormData();
    appendFormData(formData, data);
    const response = await api.post(`/admin/staff/${outletId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateStaff: async (
    outletId: number,
    staffId: number,
    data: StaffUpdateRequest
  ): Promise<{ success: boolean; message: string; data: Staff }> => {
    const formData = new FormData();
    appendFormData(formData, data);
    const response = await api.put(`/admin/staff/${outletId}/${staffId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteStaff: async (
    outletId: number,
    staffId: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/staff/${outletId}/${staffId}`);
    return response.data;
  },

  bulkImportStaff: async (
    outletId: number,
    rows: StaffImportRow[]
  ): Promise<{ success: boolean; message: string; data: Staff[] }> => {
    const response = await api.post(`/admin/staff/${outletId}/bulk`, { rows });
    return response.data;
  },

  getStaffTimesheet: async (
    outletId: number,
    staffId: number,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StaffTimesheetResponse> => {
    const response = await api.get<StaffTimesheetResponse>(`/admin/staff/${outletId}/${staffId}/timesheet`, { params });
    return response.data;
  },

  updateTimesheetEntry: async (
    outletId: number,
    staffId: number,
    entryId: number,
    data: {
      work_date?: string;
      clock_in_at?: string;
      clock_out_at?: string | null;
      mode?: string;
      note?: string;
    }
  ): Promise<{ success: boolean; message: string; data: TimesheetEntry }> => {
    const response = await api.put(`/admin/staff/${outletId}/${staffId}/timesheet/${entryId}`, data);
    return response.data;
  },

  importTimesheet: async (
    outletId: number,
    rows: TimesheetImportRow[]
  ): Promise<{ success: boolean; message: string; createdCount: number; skippedCount: number; warnings: string[] }> => {
    const response = await api.post(`/admin/staff/${outletId}/timesheet-import`, { rows });
    return response.data;
  },

  getBorrowingsByOutlet: async (
    outletId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      userId?: number;
    }
  ): Promise<BorrowingsResponse> => {
    const response = await api.get<BorrowingsResponse>(`/admin/staff/${outletId}/borrowings`, { params });
    return response.data;
  },

  addBorrowing: async (
    outletId: number,
    data: BorrowingCreateRequest
  ): Promise<{ success: boolean; message: string; data: Borrowing }> => {
    const response = await api.post(`/admin/staff/${outletId}/borrowings`, data);
    return response.data;
  },

  deleteBorrowing: async (
    outletId: number,
    borrowingId: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/staff/${outletId}/borrowings/${borrowingId}`);
    return response.data;
  },
};

export default staffService;
