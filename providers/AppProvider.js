'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, apiLogout } from '../lib/api/apiClient';
import { authService, organizationService } from '../lib/services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';

export const AppContext = createContext();

// All checkable permission flags categorized into General, System Settings, and Add-on Modules
export const PERMISSION_FLAGS = [
  // General Access
  { id: 'dashboard', label: 'Dashboard Analytics', isDefault: true },
  { id: 'audit_logs:view', label: 'System Audit Logs', isDefault: true },

  // System Settings
  { id: 'admin:employees', label: 'Manage Employee Page' },
  { id: 'admin:templates', label: 'Role Template' },
  { id: 'locations:manage', label: 'Office Location' },
  { id: 'settings:branding', label: 'Branding' },
  { id: 'settings:billing', label: 'Billing & Subscription' },

  // Attendance Management
  { id: 'attendance:staff', label: 'Attendance & Clocking' },
  { id: 'attendance:management_portal', label: 'Attendance Management Portal' },
  { id: 'attendance:admin', label: 'Attendance Rules Configuration' },
  { id: 'leaves:apply', label: 'Apply Leave Form' },
  { id: 'leaves:approve', label: 'Leave Approval Portal' },
  { id: 'leaves:manage', label: 'Configure Leave Types' },
  { id: 'holidays:view', label: 'View Holiday Calendar' },
  { id: 'holidays:manage', label: 'Configure Holidays' },
  { id: 'holidays:rules', label: 'Holiday Rule Engine' },

  // Project Management
  { id: 'tasks:create', label: 'Add Task Workspace' },
  { id: 'tasks:view', label: 'My Tasks View' },
];

export const MODULES_MAP = {
  general: {
    label: 'General Access',
    ids: ['dashboard', 'audit_logs:view']
  },
  settings: {
    label: 'System Settings',
    ids: [
      'admin:employees',
      'admin:templates',
      'locations:manage',
      'settings:branding',
      'settings:billing'
    ]
  },
  attendance: {
    label: 'Attendance Management',
    addonKey: 'attendance',
    ids: [
      'attendance:staff',
      'attendance:management_portal',
      'attendance:admin',
      'leaves:apply',
      'leaves:approve',
      'leaves:manage',
      'holidays:view',
      'holidays:manage',
      'holidays:rules'
    ]
  },
  tasks: {
    label: 'Project Management',
    addonKey: 'project',
    ids: ['tasks:create', 'tasks:view']
  }
};

const mapEmployee = (emp) => {
  if (!emp || typeof emp !== 'object') return null;
  return {
    ...emp,
    id: emp.id != null ? String(emp.id) : '',
  };
};

const mapLocation = (loc) => {
  if (!loc || typeof loc !== 'object') return null;
  return {
    ...loc,
    id: loc.id != null ? String(loc.id) : '',
  };
};

const isAuthDataEqual = (a, b) => {
  if (!a || !b) return false;
  if (
    a.id !== b.id ||
    a.isSuperAdmin !== b.isSuperAdmin ||
    a.designation !== b.designation ||
    a.organization !== b.organization ||
    a.is_active !== b.is_active ||
    a.employment_status !== b.employment_status
  ) {
    return false;
  }

  const logoA = a.organization_logo || '';
  const logoB = b.organization_logo || '';
  if (logoA !== logoB) return false;

  const subA = a.subscription || {};
  const subB = b.subscription || {};
  if (subA.subscriptionStatus !== subB.subscriptionStatus) {
    return false;
  }

  const permA = a.permissions || [];
  const permB = b.permissions || [];
  if (permA.length !== permB.length) return false;
  for (let i = 0; i < permA.length; i++) {
    if (permA[i] !== permB[i]) return false;
  }
  return true;
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [officePremises, setOfficePremises] = useState({ lat: 11.1143, lon: 76.2274 });
  const [officeLocations, setOfficeLocations] = useState([]);
  const [brandLogo, setBrandLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState(12);
  const [authStatus, setAuthStatus] = useState('loading');
  const isInitialized = authStatus !== 'loading';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionsRegistry, setPermissionsRegistry] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '', type: 'info' });

  const showAlert = useCallback((message, title = '', type = 'info') => {
    setAlertModal({ isOpen: true, message, title, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const fetchInitialData = useCallback(async (userObj) => {
    if (!userObj) return;
    try {
      const orgId = userObj.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';

      const [
        locationsData,
        settingsData,
        permissionsConfigData
      ] = await organizationService.fetchInitialData(orgQuery);

      if (Array.isArray(locationsData)) {
        setOfficeLocations(locationsData.map(mapLocation).filter(Boolean));

        if (locationsData.length > 0) {
          const primary = locationsData.find(loc => loc.isPrimary) || locationsData[0];
          setOfficePremises({ lat: primary.lat, lon: primary.lon });
        }
      }

      if (settingsData && typeof settingsData === 'object') {
        setBrandLogo(settingsData.brandLogo);
        setCompanyName(settingsData.companyName || '');
        setSubscriptionDays(settingsData.subscriptionDays);
      }

      if (permissionsConfigData) {
        setPermissionsRegistry(permissionsConfigData);
      }
    } catch (e) {
      console.warn('Failed to fetch platform records:', e);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.fetchMe();
      if (user && user.id) {
        const mappedUser = mapEmployee(user);

        if (!isAuthDataEqual(mappedUser, currentUserRef.current)) {
          setCurrentUser(mappedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
          }
        }

        if (user.subscription && user.subscription.daysRemaining !== subscriptionDaysRef.current) {
          setSubscriptionDays(user.subscription.daysRemaining);
        }
        setAuthStatus('authenticated');
      } else {
        setCurrentUser(null);
        setAuthStatus('unauthenticated');
      }
    } catch (e) {
      setCurrentUser(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  // Initialize session on mount - relies on HttpOnly sessionid cookie
  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      try {
        const user = await authService.fetchMe();
        if (cancelled) return;
        if (user && user.id) {
          const mappedUser = mapEmployee(user);
          setCurrentUser(mappedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
          }
          await fetchInitialData(mappedUser);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch (e) {
        if (cancelled) return;
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cubelogs_active_user');
        }
        setAuthStatus('unauthenticated');
      }
    };

    initSession();
    return () => { cancelled = true; };
  }, [fetchInitialData]);

  const currentUserRef = React.useRef(currentUser);
  const subscriptionDaysRef = React.useRef(subscriptionDays);
  const authStatusRef = React.useRef(authStatus);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { subscriptionDaysRef.current = subscriptionDays; }, [subscriptionDays]);
  useEffect(() => { authStatusRef.current = authStatus; }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const performSync = async () => {
      if (document.hidden || document.visibilityState === 'hidden') return;
      if (authStatusRef.current !== 'authenticated') return;
      await refreshUser();
    };

    const handleFocus = () => {
      performSync();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const interval = setInterval(() => {
      performSync();
    }, 300000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [authStatus, refreshUser]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const { user } = data || {};
      if (!user) {
        throw new Error(data?.error || data?.detail || 'Invalid email or password.');
      }
      const mappedUser = mapEmployee(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
      }

      setCurrentUser(mappedUser);
      setAuthStatus('authenticated');
      await fetchInitialData(mappedUser);
      return { success: true, user: mappedUser };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid email or password.' };
    }
  }, [fetchInitialData]);

  const magicLogin = useCallback(async (token) => {
    try {
      const data = await authService.magicLogin(token);
      const { user } = data || {};
      if (!user) {
        throw new Error(data?.error || data?.detail || 'Invalid or expired magic link.');
      }
      const mappedUser = mapEmployee(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
      }

      setCurrentUser(mappedUser);
      setAuthStatus('authenticated');
      await fetchInitialData(mappedUser);
      return { success: true, user: mappedUser };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired magic link.' };
    }
  }, [fetchInitialData]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
    if (typeof window !== 'undefined') {
      try {
        await apiLogout();
      } catch (e) { /* ignore */ }
      localStorage.removeItem('cubelogs_active_user');
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    try {
      const data = await authService.requestPasswordReset(email);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to request password reset.' };
    }
  }, []);

  const validateResetToken = useCallback(async (token) => {
    try {
      const data = await authService.validateResetToken(token);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired token.' };
    }
  }, []);

  const confirmPasswordReset = useCallback(async (token, password, passwordConfirm) => {
    try {
      const data = await authService.confirmPasswordReset(token, password, passwordConfirm);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to reset password.' };
    }
  }, []);

  const saveOfficePremises = useCallback((premises) => {
    setOfficePremises(premises);
  }, []);

  const saveOfficeLocations = useCallback(async (locations) => {
    try {
      const current = await organizationService.fetchLocations();
      for (const loc of current) {
        await organizationService.deleteLocation(loc.id);
      }

      const created = [];
      for (const loc of locations) {
        const { id, ...locData } = loc;
        const newLoc = await organizationService.createLocation(locData);
        created.push(mapLocation(newLoc));
      }
      setOfficeLocations(created);
      if (created.length > 0) {
        setOfficePremises({ lat: created[0].lat, lon: created[0].lon });
      }
    } catch (e) {
      console.error('Error saving locations:', e);
    }
  }, []);

  const saveBrandLogo = useCallback(async (logoData) => {
    try {
      const response = await organizationService.saveSettings({ brandLogo: logoData });
      setBrandLogo(response.brandLogo);
    } catch (e) {
      console.error('Error saving brand logo:', e);
    }
  }, []);

  const saveCompanyName = useCallback(async (name) => {
    try {
      const response = await organizationService.saveSettings({ companyName: name });
      setCompanyName(response.companyName);
    } catch (e) {
      console.error('Error saving company name:', e);
      throw e;
    }
  }, []);

  const updateAuthSession = useCallback((user) => {
    const mapped = mapEmployee(user);
    if (typeof window !== 'undefined') {
      if (mapped) {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mapped));
      } else {
        localStorage.removeItem('cubelogs_active_user');
      }
    }
    setCurrentUser(mapped);
  }, []);

  const confirmSubscription = useCallback(async (sessionId) => {
    try {
      const response = await organizationService.confirmSubscription(sessionId);

      const settingsData = await organizationService.fetchSettings();
      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);

      const user = await authService.fetchMe();
      updateAuthSession(user);

      return response;
    } catch (e) {
      console.error('Error confirming subscription:', e);
      throw e;
    }
  }, [updateAuthSession]);

  const completeOnboarding = useCallback(async (companyName, logoBase64, lat, lon, defaultWeeklyHolidays = []) => {
    try {
      const response = await organizationService.saveSettings({ 
        brandLogo: logoBase64, 
        companyName,
        default_weekly_holidays: defaultWeeklyHolidays
      });
      setBrandLogo(response.brandLogo);
      setCompanyName(response.companyName);

      await saveOfficeLocations([
        { name: companyName, lat, lon, radius: 100.0, isPrimary: true }
      ]);
    } catch (e) {
      console.error('Error completing onboarding:', e);
      throw e;
    }
  }, [saveOfficeLocations]);

  const renewSubscription = useCallback(async (packageName = null) => {
    try {
      const body = { subscriptionDays: 365 };
      if (packageName) {
        body.packageName = packageName;
      }
      const response = await organizationService.saveSettings(body);
      setSubscriptionDays(response.subscriptionDays);

      const user = await authService.fetchMe();
      updateAuthSession(user);
    } catch (e) {
      console.error('Error renewing subscription:', e);
    }
  }, [updateAuthSession]);

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  }, [currentUser]);

  const isFeatureUnlocked = useCallback((feature) => {
    if (!currentUser) return false;
    if (currentUser.subscription && currentUser.subscription.features) {
      return currentUser.subscription.features.includes(feature);
    }
    return currentUser.isSuperAdmin;
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    isInitialized,
    authStatus,
    refreshUser,
    login,
    magicLogin,
    logout,
    requestPasswordReset,
    validateResetToken,
    confirmPasswordReset,
    hasPermission,
    isFeatureUnlocked,
    sidebarOpen,
    setSidebarOpen,
    officePremises,
    saveOfficePremises,
    officeLocations,
    saveOfficeLocations,
    brandLogo,
    saveBrandLogo,
    companyName,
    saveCompanyName,
    subscriptionDays,
    renewSubscription,
    completeOnboarding,
    confirmSubscription,
    alertModal,
    showAlert,
    closeAlert,
    updateAuthSession,
    permissionsRegistry,
  }), [
    currentUser,
    isInitialized,
    authStatus,
    refreshUser,
    login,
    magicLogin,
    logout,
    requestPasswordReset,
    validateResetToken,
    confirmPasswordReset,
    hasPermission,
    isFeatureUnlocked,
    sidebarOpen,
    officePremises,
    saveOfficePremises,
    officeLocations,
    saveOfficeLocations,
    brandLogo,
    saveBrandLogo,
    companyName,
    saveCompanyName,
    subscriptionDays,
    renewSubscription,
    completeOnboarding,
    confirmSubscription,
    alertModal,
    showAlert,
    closeAlert,
    updateAuthSession,
    permissionsRegistry
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <CustomAlertModal />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
