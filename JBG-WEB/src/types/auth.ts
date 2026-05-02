export interface AuthUser {
  id: number;
  customer_id: number;
  is_admin: boolean;
  firstname: string;
  lastname: string;
  email: string;
  role_id: number;
  is_active: boolean;
  phone_number: string;
  country_code: string;
  address: string;
  gender: string;
  dob: string;
  profile_image: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
