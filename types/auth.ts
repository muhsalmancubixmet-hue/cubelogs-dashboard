export interface UserSubscription {
  subscriptionStatus: string;
  daysRemaining?: number;
  secondsRemaining?: number;
  warningActive?: boolean;
  features?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  designation?: string;
  isSuperAdmin: boolean;
  organization?: number | string;
  organization_logo?: string;
  permissions?: string[];
  subscription?: UserSubscription;
  is_active?: boolean;
  employment_status?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
