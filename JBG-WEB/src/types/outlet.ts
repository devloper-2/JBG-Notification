export interface BankDetail {
  id?: number;
  account_name: string;
  account_no: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  address: string;
  is_primary: boolean;
  is_active?: boolean;
}

export interface Tax {
  id?: number;
  tax_name: string;
  tax_value: number;
  is_active?: boolean;
}

export interface Outlet {
  id: number;
  name: string;
  address: string;
  logo: string | null;
  mobile: string;
  email: string | null;
  gst_no: string | null;
  pan_no: string | null;
  country_code: string;
  terms_condition: string | null;
  bank_details: BankDetail[];
  taxes?: Tax[];
}

export interface OutletCreateRequest {
  name: string;
  mobile: string;
  email?: string;
  gst_no?: string;
  pan_no?: string;
  country_code: string;
  address: string;
  pos_password?: string;
  terms_condition?: string;
  is_active?: boolean;
  bank_details?: BankDetail[];
  logo?: File;
}

export interface OutletUpdateRequest {
  name: string;
  mobile: string;
  email?: string;
  gst_no?: string | null;
  pan_no?: string | null;
  country_code: string;
  address: string;
  pos_password?: string;
  terms_condition?: string;
  is_active?: boolean;
  bank_details?: BankDetail[];
  taxes?: Tax[];
  logo?: File | null;
}

export interface OutletCreateResponse {
  message: string;
  customer: Outlet;
}

export interface OutletUpdateResponse {
  message: string;
  customer: Outlet;
}
