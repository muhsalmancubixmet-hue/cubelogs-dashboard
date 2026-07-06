'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
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

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [officePremises, setOfficePremises] = useState({ lat: 11.1143, lon: 76.2274 });
  const [officeLocations, setOfficeLocations] = useState([]);
  const [brandLogo, setBrandLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState(12);
  const [employeePhotos, setEmployeePhotos] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionsRegistry, setPermissionsRegistry] = useState(null);

  // Custom Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '', type: 'info' });

  const showAlert = (message, title = '', type = 'info') => {
    setAlertModal({ isOpen: true, message, title, type });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const fetchInitialData = async (userObj = null) => {
    try {
      const activeUser = userObj || currentUser;
      const orgId = activeUser?.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';

      const [
        templatesData,
        employeesData,
        attendanceData,
        tasksData,
        leaveTypesData,
        leavesData,
        holidaysData,
        schedulesData,
        locationsData,
        settingsData,
        permissionsConfigData
      ] = await Promise.all([
        apiFetch(`/templates/${orgQuery}`),
        apiFetch(`/employees/${orgQuery}`),
        apiFetch(`/attendance/${orgQuery}`),
        apiFetch(`/tasks/${orgQuery}`),
        apiFetch(`/leave-types/${orgQuery}`),
        apiFetch(`/leaves/${orgQuery}`),
        apiFetch(`/holidays/${orgQuery}`),
        apiFetch(`/schedules/${orgQuery}`),
        apiFetch(`/locations/${orgQuery}`),
        apiFetch(`/settings/current/${orgQuery}`),
        apiFetch(`/permissions/config/?t=${Date.now()}`),
      ]);

      setTemplates(templatesData.map(mapTemplate));
      setEmployees(employeesData.map(mapEmployee));
      setAttendanceLogs(attendanceData.map(mapAttendance));
      setTasks(tasksData.map(mapTask));
      setLeaveTypes(leaveTypesData.map(mapLeaveType));
      setLeaves(leavesData.map(mapLeave));
      setHolidays(holidaysData.map(mapHoliday));
      setSchedules(schedulesData.map(mapSchedule));
      setOfficeLocations(locationsData.map(mapLocation));

      if (locationsData.length > 0) {
        const primary = locationsData.find(loc => loc.isPrimary) || locationsData[0];
        setOfficePremises({ lat: primary.lat, lon: primary.lon });
      }

      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);
      setPermissionsRegistry(permissionsConfigData);
      console.log(" permissionsConfigData base", permissionsConfigData)
      console.log(" permissionsRegistry base", permissionsRegistry)
      // Cache profile photos mapping locally
      const photoMap = {};
      employeesData.forEach(emp => {
        if (emp.profilePhoto) {
          photoMap[String(emp.id)] = emp.profilePhoto;
        }
      });
      setEmployeePhotos(photoMap);
    } catch (e) {
      console.warn('Failed to fetch platform records:', e);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('cubelogs_access_token');
        if (token) {
          try {
            const user = await apiFetch('/auth/me/');
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
  }, []);

  // Periodic subscription & session refresh polling
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        const user = await apiFetch('/auth/me/');
        const mappedUser = mapEmployee(user);

        // Update currentUser state (which contains the subscription object)
        setCurrentUser(mappedUser);
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));

        // Also update subscriptionDays if it changes
        if (user.subscription) {
          setSubscriptionDays(user.subscription.daysRemaining);
        }
      } catch (e) {
        console.warn('Periodic profile fetch failed:', e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Auth Operations
  const login = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

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
  };

  const magicLogin = async (token) => {
    try {
      const data = await apiFetch('/auth/magic-login/', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

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
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cubelogs_access_token');
      localStorage.removeItem('cubelogs_refresh_token');
      localStorage.removeItem('cubelogs_active_user');
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const data = await apiFetch('/auth/password-reset/request/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to request password reset.' };
    }
  };

  const validateResetToken = async (token) => {
    try {
      const data = await apiFetch('/auth/password-reset/validate/', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired token.' };
    }
  };

  const confirmPasswordReset = async (token, password, passwordConfirm) => {
    try {
      const data = await apiFetch('/auth/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to reset password.' };
    }
  };

  // Templates CRUD
  const saveTemplate = async (template) => {
    try {
      let saved;
      if (template.id) {
        saved = await apiFetch(`/templates/${template.id}/`, {
          method: 'PUT',
          body: JSON.stringify(template),
        });
        setTemplates(prev => prev.map(t => t.id === template.id ? mapTemplate(saved) : t));
      } else {
        saved = await apiFetch('/templates/', {
          method: 'POST',
          body: JSON.stringify(template),
        });
        setTemplates(prev => [...prev, mapTemplate(saved)]);
      }
      const freshEmployees = await apiFetch('/employees/');
      setEmployees(freshEmployees.map(mapEmployee));
    } catch (e) {
      console.error('Error saving template:', e);
    }
  };

  const deleteTemplate = async (id) => {
    try {
      await apiFetch(`/templates/${id}/`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Error deleting template:', e);
    }
  };

  // Employees CRUD
  const saveEmployee = async (employee) => {
    try {
      let saved;
      if (employee.id) {
        saved = await apiFetch(`/employees/${employee.id}/`, {
          method: 'PUT',
          body: JSON.stringify(employee),
        });
        setEmployees(prev => prev.map(emp => emp.id === employee.id ? mapEmployee(saved) : emp));
      } else {
        const requestData = {
          ...employee,
          password: employee.password || (employee.email.split('@')[0] + '123'),
        };
        saved = await apiFetch('/employees/', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
        setEmployees(prev => [...prev, mapEmployee(saved)]);
      }

      const mappedSaved = mapEmployee(saved);
      if (mappedSaved.profilePhoto) {
        setEmployeePhotos(prev => ({ ...prev, [mappedSaved.id]: mappedSaved.profilePhoto }));
      } else {
        setEmployeePhotos(prev => {
          const next = { ...prev };
          delete next[mappedSaved.id];
          return next;
        });
      }

      if (currentUser && currentUser.id === mappedSaved.id) {
        setCurrentUser(mappedSaved);
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedSaved));
      }
    } catch (e) {
      console.error('Error saving employee:', e);
      throw e;
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await apiFetch(`/employees/${id}/`, { method: 'DELETE' });
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      setEmployeePhotos(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error('Error deleting employee:', e);
    }
  };

  // Attendance Clocking
  const clockIn = async (employeeId, verificationData = null) => {
    try {
      const response = await apiFetch('/attendance/clock-in/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId), verificationData }),
      });
      setAttendanceLogs(prev => [mapAttendance(response), ...prev]);
    } catch (e) {
      console.error('Clock-in failed:', e);
      showAlert(e.message || 'Clock-in failed.', 'Clock-In Blocked', 'error');
    }
  };

  const clockOut = async (employeeId) => {
    try {
      const response = await apiFetch('/attendance/clock-out/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId) }),
      });
      setAttendanceLogs(prev => prev.map(log => (log.employeeId === employeeId && !log.clockOut) ? mapAttendance(response) : log));
    } catch (e) {
      console.error('Clock-out failed:', e);
      showAlert(e.message || 'Clock-out failed.', 'Clock-Out Blocked', 'error');
    }
  };

  const adjustAttendance = async (logId, changes) => {
    try {
      const response = await apiFetch(`/attendance/${logId}/`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      setAttendanceLogs(prev => prev.map(log => log.id === logId ? mapAttendance(response) : log));
    } catch (e) {
      console.error('Error adjusting attendance:', e);
    }
  };

  // Tasks CRUD
  const saveTask = async (task) => {
    try {
      const payload = {
        title: task.title,
        description: task.description,
        assignedTo: parseInt(task.assignedTo),
        assignedName: task.assignedName,
        dueDate: task.dueDate,
        status: task.status,
      };

      let saved;
      if (task.id) {
        saved = await apiFetch(`/tasks/${task.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setTasks(prev => prev.map(t => t.id === task.id ? mapTask(saved) : t));
      } else {
        saved = await apiFetch('/tasks/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setTasks(prev => [mapTask(saved), ...prev]);
      }
    } catch (e) {
      console.error('Error saving task:', e);
    }
  };

  const deleteTask = async (id) => {
    try {
      await apiFetch(`/tasks/${id}/`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  };

  // Leaves CRUD
  const applyLeave = async (leave) => {
    try {
      const ltObj = leaveTypes.find(lt => lt.id === leave.leaveType || lt.name === leave.leaveType);

      const payload = {
        employee: parseInt(leave.employeeId),
        employeeName: employees.find(e => e.id === leave.employeeId)?.name || 'Employee',
        leaveType: ltObj ? parseInt(ltObj.id) : null,
        leaveTypeName: ltObj ? ltObj.name : leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate || leave.startDate,
        dayType: leave.dayType,
        reason: leave.reason,
        duration: leave.dayType === 'Half Day' ? 0.5 : 1.0,
      };

      const response = await apiFetch('/leaves/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setLeaves(prev => [mapLeave(response), ...prev]);
    } catch (e) {
      console.error('Error applying leave:', e);
    }
  };

  const updateLeaveStatus = async (id, status) => {
    try {
      const response = await apiFetch(`/leaves/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setLeaves(prev => prev.map(l => l.id === id ? mapLeave(response) : l));
    } catch (e) {
      console.error('Error updating leave status:', e);
    }
  };

  // Holidays CRUD
  const saveHoliday = async (holiday) => {
    try {
      let saved;
      if (holiday.id) {
        saved = await apiFetch(`/holidays/${holiday.id}/`, {
          method: 'PUT',
          body: JSON.stringify(holiday),
        });
        setHolidays(prev => prev.map(h => h.id === holiday.id ? mapHoliday(saved) : h));
      } else {
        saved = await apiFetch('/holidays/', {
          method: 'POST',
          body: JSON.stringify(holiday),
        });
        setHolidays(prev => [...prev, mapHoliday(saved)]);
      }
    } catch (e) {
      console.error('Error saving holiday:', e);
    }
  };

  const deleteHoliday = async (id) => {
    try {
      await apiFetch(`/holidays/${id}/`, { method: 'DELETE' });
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error('Error deleting holiday:', e);
    }
  };

  // Leave Types CRUD
  const saveLeaveType = async (leaveType) => {
    try {
      let saved;
      if (leaveType.id) {
        saved = await apiFetch(`/leave-types/${leaveType.id}/`, {
          method: 'PUT',
          body: JSON.stringify(leaveType),
        });
        setLeaveTypes(prev => prev.map(lt => lt.id === leaveType.id ? mapLeaveType(saved) : lt));
      } else {
        saved = await apiFetch('/leave-types/', {
          method: 'POST',
          body: JSON.stringify(leaveType),
        });
        setLeaveTypes(prev => [...prev, mapLeaveType(saved)]);
      }
    } catch (e) {
      console.error('Error saving leave type:', e);
    }
  };

  const deleteLeaveType = async (id) => {
    try {
      await apiFetch(`/leave-types/${id}/`, { method: 'DELETE' });
      setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
    } catch (e) {
      console.error('Error deleting leave type:', e);
    }
  };

  // Schedules CRUD
  const saveSchedule = async (scheduleData) => {
    try {
      const exists = schedules.find(s => s.designation === scheduleData.designation);
      let saved;
      if (exists) {
        saved = await apiFetch(`/schedules/${exists.id}/`, {
          method: 'PUT',
          body: JSON.stringify(scheduleData),
        });
        setSchedules(prev => prev.map(s => s.designation === scheduleData.designation ? mapSchedule(saved) : s));
      } else {
        saved = await apiFetch('/schedules/', {
          method: 'POST',
          body: JSON.stringify(scheduleData),
        });
        setSchedules(prev => [...prev, mapSchedule(saved)]);
      }
    } catch (e) {
      console.error('Error saving schedule:', e);
    }
  };

  // Locations CRUD
  const saveOfficePremises = (premises) => {
    setOfficePremises(premises);
  };

  const saveOfficeLocations = async (locations) => {
    try {
      const current = await apiFetch('/locations/');
      for (const loc of current) {
        await apiFetch(`/locations/${loc.id}/`, { method: 'DELETE' });
      }

      const created = [];
      for (const loc of locations) {
        const { id, ...locData } = loc; // strip local id
        const newLoc = await apiFetch('/locations/', {
          method: 'POST',
          body: JSON.stringify(locData),
        });
        created.push(mapLocation(newLoc));
      }
      setOfficeLocations(created);
      if (created.length > 0) {
        setOfficePremises({ lat: created[0].lat, lon: created[0].lon });
      }
    } catch (e) {
      console.error('Error saving locations:', e);
    }
  };

  // Branding & Settings
  const saveBrandLogo = async (logoData) => {
    try {
      const response = await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify({ brandLogo: logoData }),
      });
      setBrandLogo(response.brandLogo);
    } catch (e) {
      console.error('Error saving brand logo:', e);
    }
  };

  const saveCompanyName = async (name) => {
    try {
      const response = await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify({ companyName: name }),
      });
      setCompanyName(response.companyName);
    } catch (e) {
      console.error('Error saving company name:', e);
      throw e;
    }
  };

  const confirmSubscription = async (sessionId) => {
    try {
      const response = await apiFetch('/subscription/confirm/', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });

      // Refresh settings state
      const settingsData = await apiFetch('/settings/current/');
      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);

      // Refresh current user to update permissions/active features
      const user = await apiFetch('/auth/me/');
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
  };

  const completeOnboarding = async (companyName, logoBase64, lat, lon, defaultWeeklyHolidays = ["Sunday"]) => {
    try {
      // 1. Save brand logo, company name, and default weekly holidays
      const response = await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify({ 
          brandLogo: logoBase64, 
          companyName,
          default_weekly_holidays: defaultWeeklyHolidays
        }),
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
  };

  const renewSubscription = async (packageName = null) => {
    try {
      const body = { subscriptionDays: 365 };
      if (packageName) {
        body.packageName = packageName;
      }
      const response = await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSubscriptionDays(response.subscriptionDays);

      // Instantly refresh current user data to sync feature gates in frontend context
      const user = await apiFetch('/auth/me/');
      updateAuthSession(
        localStorage.getItem('cubelogs_access_token'),
        localStorage.getItem('cubelogs_refresh_token'),
        user
      );
    } catch (e) {
      console.error('Error renewing subscription:', e);
    }
  };

  const updateAuthSession = (access, refresh, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cubelogs_access_token', access);
      localStorage.setItem('cubelogs_refresh_token', refresh);
      localStorage.setItem('cubelogs_active_user', JSON.stringify(mapEmployee(user)));
    }
    setCurrentUser(mapEmployee(user));
  };

  // Permission Check Helper
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };

  // Feature Gating Helper (Based on active subscription package features)
  const isFeatureUnlocked = (feature) => {
    if (!currentUser) return false;
    if (currentUser.subscription && currentUser.subscription.features) {
      return currentUser.subscription.features.includes(feature);
    }
    return currentUser.isSuperAdmin;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        templates,
        employees,
        attendanceLogs,
        tasks,
        leaves,
        holidays,
        isInitialized,
        login,
        magicLogin,
        logout,
        requestPasswordReset,
        validateResetToken,
        confirmPasswordReset,
        saveTemplate,
        deleteTemplate,
        saveEmployee,
        deleteEmployee,
        clockIn,
        clockOut,
        adjustAttendance,
        saveTask,
        deleteTask,
        applyLeave,
        updateLeaveStatus,
        saveHoliday,
        deleteHoliday,
        leaveTypes,
        saveLeaveType,
        deleteLeaveType,
        schedules,
        saveSchedule,
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
        employeePhotos,
        alertModal,
        showAlert,
        closeAlert,
        updateAuthSession,
        permissionsRegistry,
      }}>
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
