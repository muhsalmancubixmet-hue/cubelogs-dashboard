export interface Employee {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  designation?: string;
  phone_number?: string;
  isSuperAdmin: boolean;
  is_staff?: boolean;
  organization?: number | string;
  permissions?: string[];
}
