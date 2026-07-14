'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { authService, organizationService } from '../lib/services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';

export const AppContext = createContext();

// All checkable permission flags
export const PERMISSION_FLAGS = [
  { id: 'dashboard', label: 'My Dashboard Analytics' },
  { id: 'admin:templates', label: 'Manage Templates (Admin Panel)' },
  { id: 'admin:employees', label: 'Manage Employees (Onboard / Edit)' },
  { id: 'attendance:staff', label: 'Clock-In / Clock-Out Dashboard' },
  { id: 'attendance:admin', label: 'Real-time Global Attendance Monitor' },
  { id: 'attendance:management_portal', label: 'Attendance Management Portal' },
  { id: 'tasks:create', label: 'Add Task Workspace (Assign tasks)' },
  { id: 'tasks:view', label: 'My Tasks View (Track objectives)' },
  { id: 'leaves:apply', label: 'Apply Leave Form' },
  { id: 'leaves:approve', label: 'Leave Approval Portal' },
  { id: 'leaves:manage', label: 'Manage Leave Types (Rules & Allowances)' },
  { id: 'holidays:manage', label: 'Configure System Holidays' },
  { id: 'holidays:view', label: 'View Holiday Calendar' },
  { id: 'locations:manage', label: 'Manage Locations (Latitude/Longitude)' },
  { id: 'settings:branding', label: 'Manage Branding (Change Logo)' },
  { id: 'settings:billing', label: 'Manage Billing & Subscriptions' },
];

// Model mapping helpers to ensure front-end type compatibility (string IDs and FKs)
const mapEmployee = (emp) => ({
  ...emp,
  id: String(emp.id),
});

const mapTemplate = (t) => ({
  ...t,
  id: String(t.id),
});

const mapAttendance = (log) => ({
  ...log,
  id: String(log.id),
  employeeId: String(log.employee),
});

const mapTask = (t) => ({
  ...t,
  id: String(t.id),
  assignedTo: String(t.assignedTo),
});

const mapLeaveType = (lt) => ({
  ...lt,
  id: String(lt.id),
});

const mapLeave = (l) => ({
  ...l,
  id: String(l.id),
  employeeId: String(l.employee),
  leaveTypeId: String(l.leaveType),
  leaveType: l.leaveTypeName, // UI expects this to be the category string name
});

const mapHoliday = (h) => ({
  ...h,
  id: String(h.id),
});

const mapSchedule = (s) => ({
  ...s,
  id: String(s.id),
});

const mapLocation = (loc) => ({
  ...loc,
  id: String(loc.id),
});

const isUserEqual = (a, b) => {
  if (!a || !b) return false;
  if (
    a.id !== b.id ||
    a.email !== b.email ||
    a.name !== b.name ||
    a.profilePhoto !== b.profilePhoto ||
    a.organization !== b.organization
  ) {
    return false;
  }
  const subA = a.subscription || {};
  const subB = b.subscription || {};
  if (
    subA.subscriptionStatus !== subB.subscriptionStatus ||
    subA.daysRemaining !== subB.daysRemaining ||
    subA.secondsRemaining !== subB.secondsRemaining ||
    subA.warningActive !== subB.warningActive
  ) {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionsRegistry, setPermissionsRegistry] = useState(null);

  // Custom Alert Modal State
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

      setOfficeLocations(locationsData.map(mapLocation));

      if (locationsData.length > 0) {
        const primary = locationsData.find(loc => loc.isPrimary) || locationsData[0];
        setOfficePremises({ lat: primary.lat, lon: primary.lon });
      }

      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);
      setPermissionsRegistry(permissionsConfigData);
    } catch (e) {
      console.warn('Failed to fetch platform records:', e);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('cubelogs_access_token');
        if (token) {
          try {
            const user = await authService.fetchMe();
            const mappedUser = mapEmployee(user);
            setCurrentUser(mappedUser);
            localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
            await fetchInitialData(mappedUser);
          } catch (e) {
            console.warn('Session restoration failed:', e);
            localStorage.removeItem('cubelogs_access_token');
            localStorage.removeItem('cubelogs_refresh_token');
            localStorage.removeItem('cubelogs_active_user');
          }
        }
      }
      setIsInitialized(true);
    };

    initSession();
  }, [fetchInitialData]);

  // Periodic subscription & session refresh polling
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        const user = await authService.fetchMe();
        const mappedUser = mapEmployee(user);

        // Update currentUser state only if data actually changed
        if (!isUserEqual(mappedUser, currentUser)) {
          setCurrentUser(mappedUser);
          localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
        }

        // Also update subscriptionDays if it changes
        if (user.subscription && user.subscription.daysRemaining !== subscriptionDays) {
          setSubscriptionDays(user.subscription.daysRemaining);
        }
      } catch (e) {
        console.warn('Periodic profile fetch failed:', e);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser, subscriptionDays]);

  // Auth Operations
  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password);

      const { access, refresh, user } = data;
      localStorage.setItem('cubelogs_access_token', access);
      localStorage.setItem('cubelogs_refresh_token', refresh);
      localStorage.setItem('cubelogs_active_user', JSON.stringify(mapEmployee(user)));

      const mappedUser = mapEmployee(user);
      setCurrentUser(mappedUser);
      await fetchInitialData(mappedUser);
      return { success: true, user: mapEmployee(user) };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid email or password.' };
    }
  }, [fetchInitialData]);

  const magicLogin = useCallback(async (token) => {
    try {
      const data = await authService.magicLogin(token);

      const { access, refresh, user } = data;
      localStorage.setItem('cubelogs_access_token', access);
      localStorage.setItem('cubelogs_refresh_token', refresh);
      localStorage.setItem('cubelogs_active_user', JSON.stringify(mapEmployee(user)));

      const mappedUser = mapEmployee(user);
      setCurrentUser(mappedUser);
      await fetchInitialData(mappedUser);
      return { success: true, user: mapEmployee(user) };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired magic link.' };
    }
  }, [fetchInitialData]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cubelogs_access_token');
      localStorage.removeItem('cubelogs_refresh_token');
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

  // CRUD operations moved to their respective component pages

  // Locations CRUD
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
        const { id, ...locData } = loc; // strip local id
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

  // Branding & Settings
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

  const updateAuthSession = useCallback((access, refresh, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cubelogs_access_token', access);
      localStorage.setItem('cubelogs_refresh_token', refresh);
      localStorage.setItem('cubelogs_active_user', JSON.stringify(mapEmployee(user)));
    }
    setCurrentUser(mapEmployee(user));
  }, []);

  const confirmSubscription = useCallback(async (sessionId) => {
    try {
      const response = await organizationService.confirmSubscription(sessionId);

      // Refresh settings state
      const settingsData = await organizationService.fetchSettings();
      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);

      // Refresh current user to update permissions/active features
      const user = await authService.fetchMe();
      updateAuthSession(
        localStorage.getItem('cubelogs_access_token'),
        localStorage.getItem('cubelogs_refresh_token'),
        user
      );

      return response;
    } catch (e) {
      console.error('Error confirming subscription:', e);
      throw e;
    }
  }, [updateAuthSession]);

  const completeOnboarding = useCallback(async (companyName, logoBase64, lat, lon, defaultWeeklyHolidays = []) => {
    try {
      // 1. Save brand logo, company name, and default weekly holidays
      const response = await organizationService.saveSettings({ 
        brandLogo: logoBase64, 
        companyName,
        default_weekly_holidays: defaultWeeklyHolidays
      });
      setBrandLogo(response.brandLogo);
      setCompanyName(response.companyName);

      // 2. Save office locations
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

      // Instantly refresh current user data to sync feature gates in frontend context
      const user = await authService.fetchMe();
      updateAuthSession(
        localStorage.getItem('cubelogs_access_token'),
        localStorage.getItem('cubelogs_refresh_token'),
        user
      );
    } catch (e) {
      console.error('Error renewing subscription:', e);
    }
  }, [updateAuthSession]);

  // Permission Check Helper
  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  }, [currentUser]);

  // Feature Gating Helper (Based on active subscription package features)
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
