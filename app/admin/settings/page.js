'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useApp, PERMISSION_FLAGS, MODULES_MAP } from '@/context/AppContext';
import { apiFetch } from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';
import { useSearchParams, useRouter } from 'next/navigation';
import TemplatesTab from '@/components/admin/settings/TemplatesTab';
import LocationsTab from '@/components/admin/settings/LocationsTab';
import BrandingTab from '@/components/admin/settings/BrandingTab';
import BillingTab from '@/components/admin/settings/BillingTab';
import AttendanceRulesTab from '@/components/admin/settings/AttendanceRulesTab';
import PayrollSettingsTab from '@/components/admin/settings/PayrollSettingsTab';


const FEATURE_LABELS = {
  'dashboard': 'Dashboard Analytics',
  'audit_logs:view': 'System Audit Logs',
  'admin:employees': 'Manage Employee Page',
  'admin:templates': 'Role Template',
  'locations:manage': 'Office Location',
  'settings:branding': 'Branding',
  'settings:billing': 'Billing & Subscription',
  'attendance:staff': 'Attendance & Clocking',
  'attendance:management_portal': 'Attendance Management Portal',
  'attendance:admin': 'Attendance Rules Configuration',
  'leaves:apply': 'Apply Leave Form',
  'leaves:approve': 'Leave Approval Portal',
  'leaves:manage': 'Configure Leave Types',
  'holidays:view': 'View Holiday Calendar',
  'holidays:manage': 'Configure Holidays',
  'holidays:rules': 'Holiday Rule Engine',
  'project_tasks:create': 'Create Project Tasks',
  'project_tasks:view_all': 'View All Project Tasks',
  'project_tasks:view_own': 'View Assigned Project Tasks',
};

const WalletIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
  </svg>
);

const PLANS = [
  {
    name: 'Starter',
    price: '2,999',
    period: '/mo',
    desc: 'Perfect for small growing teams to automate attendance tracking.',
    features: [
      'My Dashboard Analytics',
      'Daily Attendance Clocking',
      'Apply Leaves Portal',
      '1 Geofenced Office Location',
      'Up to 15 Employees Limit'
    ]
  },
  {
    name: 'Professional',
    price: '5,999',
    period: '/mo',
    desc: 'Advanced controls and analytics for medium-sized operations.',
    features: [
      'Everything in Starter',
      'Biometric Photo Verification',
      'Shift & Hours Scheduling',
      'Multi-Location Geofences',
      'Up to 50 Employees Limit'
    ],
    popular: true
  },
  {
    name: 'Business',
    price: '11,999',
    period: '/mo',
    desc: 'Full suite of compliance, auditing, and limitless expansion.',
    features: [
      'Everything in Professional',
      'Admin Audit Logs Feed',
      'Role Templates Engine',
      'Unlimited Office Locations',
      'Unlimited Employees Limit',
      '24/7 Dedicated Support'
    ]
  }
];

import {
  TemplatesIcon,
  LocationIcon,
  BrandLogo,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  WarningIcon,
  CloseIcon,
  ClockIcon,
  CameraIcon,
  DollarIcon
} from '@/components/Icons';
import ConfirmModal from '@/components/ConfirmModal';

function SettingsHubContent() {
  const {
    currentUser,
    authStatus,
    brandLogo,
    saveBrandLogo,
    companyName,
    saveCompanyName,
    confirmSubscription,
    verifyPayment,
    subscriptionDays,
    renewSubscription,
    hasPermission,
    showAlert,
    refreshUser
  } = useApp();

  const searchParams = useSearchParams();
  const router = useRouter();

  const [templates, setTemplates] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);

  const fetchSettingsData = async () => {
    try {
      const [rolesData, locationsData] = await Promise.all([
        apiFetch('/roles/').catch(err => {
          console.warn('Could not load roles dependency:', err);
          return [];
        }),
        apiFetch('/locations/').catch(err => {
          console.warn('Could not load locations dependency:', err);
          return [];
        })
      ]);
      const rolesList = Array.isArray(rolesData) ? rolesData : (rolesData?.results || []);
      const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData?.results || []);
      setTemplates(rolesList.map(r => ({
        ...r,
        id: String(r.id),
        name: r.name,
        permissions: Array.isArray(r.permissions) ? r.permissions : (r.permission_keys || [])
      })));
      setOfficeLocations(locationsList.map(loc => ({ ...loc, id: String(loc.id) })));
    } catch (err) {
      console.error('Failed to load settings dependency data:', err);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      fetchSettingsData();
    }
  }, [authStatus, currentUser]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
    }
  }, [authStatus, router]);

  const saveTemplate = async (template) => {
    try {
      let saved;
      const rolePayload = {
        name: template.name,
        label: template.name,
        permission_keys: template.permissions
      };
      if (template.id) {
        saved = await apiFetch(`/roles/${template.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(rolePayload),
        });
        setTemplates(prev => prev.map(t => t.id === String(template.id) ? {
          ...saved,
          id: String(saved.id),
          name: saved.name,
          permissions: Array.isArray(saved.permissions) ? saved.permissions : (saved.permission_keys || template.permissions)
        } : t));
      } else {
        saved = await apiFetch('/roles/', {
          method: 'POST',
          body: JSON.stringify(rolePayload),
        });
        setTemplates(prev => [...prev, {
          ...saved,
          id: String(saved.id),
          name: saved.name,
          permissions: Array.isArray(saved.permissions) ? saved.permissions : (saved.permission_keys || template.permissions)
        }]);
      }
    } catch (e) {
      console.error('Error saving role:', e);
      showAlert(e.message || 'Error occurred while saving role.', 'Error', 'error');
    }
  };

  const deleteTemplate = async (id) => {
    try {
      await apiFetch(`/roles/${id}/`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== String(id)));
    } catch (e) {
      console.error('Error deleting role:', e);
      showAlert(e.message || 'Error occurred while deleting role.', 'Error', 'error');
    }
  };

  const saveOfficeLocations = async (locations) => {
    try {
      const response = await apiFetch('/locations/');
      const current = Array.isArray(response) ? response : (response?.results || []);
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
        created.push({ ...newLoc, id: String(newLoc.id) });
      }
      setOfficeLocations(created);
      showAlert('Office locations updated successfully!', 'Success', 'success');
    } catch (e) {
      console.error('Error saving locations:', e);
      showAlert('Error occurred while saving office locations.', 'Error', 'error');
    }
  };



  // Confirm modal states
  const [templateConfirm, setTemplateConfirm] = useState({ open: false, id: null });
  const [locationConfirm, setLocationConfirm] = useState({ open: false, id: null });
  const [moduleConfirm, setModuleConfirm] = useState({ open: false, title: '', message: '', confirmLabel: '', danger: false, onConfirm: null });

  // Active Tab State (templates, locations, branding, billing)
  const currentTab = searchParams.get('tab') || 'templates';

  const isUnpaid = currentUser?.subscription?.subscriptionStatus === 'Unpaid' || currentUser?.subscription?.subscriptionStatus === 'Restricted';

  // Permission Checks per Tab
  const hasTemplatesPerm = !isUnpaid && hasPermission('admin:templates');
  const hasLocationsPerm = !isUnpaid && hasPermission('locations:manage');
  const hasBrandingPerm = !isUnpaid && hasPermission('settings:branding');
  const hasBillingPerm = hasPermission('settings:billing');
  const hasAttendanceConfigPerm = !isUnpaid && hasPermission('attendance:management_portal');
  const hasPayrollConfigPerm = !isUnpaid && (currentUser?.isSuperAdmin || hasPermission('payroll:manage') || hasPermission('payroll:process') || hasPermission('payroll:view'));

  const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_attendance_enabled;

  const redirectToFirstAuthorized = useCallback(() => {
    if (hasTemplatesPerm) router.replace('/admin/settings?tab=templates');
    else if (hasLocationsPerm && isAttendanceEnabled) router.replace('/admin/settings?tab=locations');
    else if (hasBrandingPerm) router.replace('/admin/settings?tab=branding');
    else if (hasBillingPerm) router.replace('/admin/settings?tab=billing');
    else if (hasPayrollConfigPerm) router.replace('/admin/settings?tab=payroll-config');
  }, [hasTemplatesPerm, hasLocationsPerm, isAttendanceEnabled, hasBrandingPerm, hasBillingPerm, hasPayrollConfigPerm, router]);

  // Auto-redirect if trying to access unauthorized tab
  useEffect(() => {
    if (isUnpaid) {
      if (currentTab !== 'billing') {
        router.replace('/admin/settings?tab=billing');
      }
      return;
    }
    if (currentTab === 'templates' && !hasTemplatesPerm) {
      redirectToFirstAuthorized();
    } else if (currentTab === 'locations' && (!hasLocationsPerm || !isAttendanceEnabled)) {
      redirectToFirstAuthorized();
    } else if (currentTab === 'branding' && !hasBrandingPerm) {
      redirectToFirstAuthorized();
    } else if (currentTab === 'billing' && !hasBillingPerm) {
      redirectToFirstAuthorized();
    } else if (currentTab === 'payroll-config' && !hasPayrollConfigPerm) {
      redirectToFirstAuthorized();
    } else if (currentTab === 'wallet') {
      router.replace('/admin/settings?tab=billing');
    }
  }, [currentTab, hasTemplatesPerm, hasLocationsPerm, hasBrandingPerm, hasBillingPerm, hasPayrollConfigPerm, isAttendanceEnabled, router, isUnpaid, redirectToFirstAuthorized]);

  const handleTabChange = (tabName) => {
    router.push(`/admin/settings?tab=${tabName}`);
  };

  const tabNavRef = React.useRef(null);
  useEffect(() => {
    if (tabNavRef.current) {
      const activeEl = tabNavRef.current.querySelector('[data-active-blue="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentTab]);

  // -------------------------------------------------------------
  // ATTENDANCE RULES CONFIG STATE & HANDLERS
  // -------------------------------------------------------------
  const [attendanceConfig, setAttendanceConfig] = useState({
    grace_period_minutes: 15,
    full_day_minimum_minutes: 480,
    half_day_minimum_minutes: 240,
    half_day_threshold_minutes: 240,
    minimum_session_minutes: 5,
    break_duration_minutes: 60,
    break_type: 'Unpaid',
    default_weekly_holidays: ['Saturday', 'Sunday'],
    auto_approve_attendance: false,
  });
  const [attendanceConfigLoading, setAttendanceConfigLoading] = useState(false);
  const [attendanceConfigSuccess, setAttendanceConfigSuccess] = useState('');
  const [attendanceConfigError, setAttendanceConfigError] = useState('');

  // Load config values from settings on mount
  useEffect(() => {
    const loadAttendanceConfig = async () => {
      try {
        const data = await apiFetch('/settings/current/');
        setAttendanceConfig({
          grace_period_minutes: data.grace_period_minutes ?? 15,
          full_day_minimum_minutes: data.full_day_minimum_minutes ?? 480,
          half_day_minimum_minutes: data.half_day_minimum_minutes ?? data.half_day_threshold_minutes ?? 240,
          half_day_threshold_minutes: data.half_day_minimum_minutes ?? data.half_day_threshold_minutes ?? 240,
          minimum_session_minutes: data.minimum_session_minutes ?? 5,
          break_duration_minutes: data.break_duration_minutes ?? 60,
          break_type: data.break_type ?? 'Unpaid',
          default_weekly_holidays: Array.isArray(data.default_weekly_holidays) && data.default_weekly_holidays.length > 0 ? data.default_weekly_holidays : ['Saturday', 'Sunday'],
          auto_approve_attendance: data.auto_approve_attendance ?? false,
        });
      } catch (e) {
        console.warn('Could not load attendance config:', e);
      }
    };
    if (hasAttendanceConfigPerm) loadAttendanceConfig();
  }, [hasAttendanceConfigPerm]);

  const handleSaveAttendanceConfig = async (e) => {
    e.preventDefault();
    setAttendanceConfigLoading(true);
    setAttendanceConfigError('');
    setAttendanceConfigSuccess('');
    try {
      await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify(attendanceConfig),
      });
      setAttendanceConfigSuccess('These attendance rules will apply from tomorrow.');
      setTimeout(() => setAttendanceConfigSuccess(''), 5000);
    } catch (err) {
      setAttendanceConfigError(err.message || 'Failed to save attendance configuration.');
    } finally {
      setAttendanceConfigLoading(false);
    }
  };

  // -------------------------------------------------------------
  // PAYROLL RULES CONFIG STATE & HANDLERS
  // -------------------------------------------------------------
  const [payrollConfig, setPayrollConfig] = useState({
    payroll_currency: 'INR',
    payroll_proration_basis: 'WORKING_DAYS',
    daily_wage_paid_leave_eligible: true,
    hourly_wage_paid_leave_eligible: true,
  });
  const [payrollConfigLoading, setPayrollConfigLoading] = useState(false);
  const [payrollConfigSuccess, setPayrollConfigSuccess] = useState('');
  const [payrollConfigError, setPayrollConfigError] = useState('');

  useEffect(() => {
    const loadPayrollConfig = async () => {
      try {
        const data = await apiFetch('/settings/current/');
        setPayrollConfig({
          payroll_currency: data.payroll_currency || 'INR',
          payroll_proration_basis: data.payroll_proration_basis || 'WORKING_DAYS',
          daily_wage_paid_leave_eligible: data.daily_wage_paid_leave_eligible !== undefined ? data.daily_wage_paid_leave_eligible : true,
          hourly_wage_paid_leave_eligible: data.hourly_wage_paid_leave_eligible !== undefined ? data.hourly_wage_paid_leave_eligible : true,
        });
      } catch (e) {
        console.warn('Could not load payroll config:', e);
      }
    };
    if (hasPayrollConfigPerm) loadPayrollConfig();
  }, [hasPayrollConfigPerm]);

  const handleSavePayrollConfig = async (e) => {
    e.preventDefault();
    setPayrollConfigLoading(true);
    setPayrollConfigError('');
    setPayrollConfigSuccess('');
    try {
      await apiFetch('/settings/current/', {
        method: 'PATCH',
        body: JSON.stringify({
          payroll_currency: payrollConfig.payroll_currency,
          payroll_proration_basis: payrollConfig.payroll_proration_basis,
          daily_wage_paid_leave_eligible: payrollConfig.daily_wage_paid_leave_eligible,
          hourly_wage_paid_leave_eligible: payrollConfig.hourly_wage_paid_leave_eligible,
        }),
      });
      setPayrollConfigSuccess('Payroll configuration saved successfully.');
      setTimeout(() => setPayrollConfigSuccess(''), 4000);
    } catch (e) {
      setPayrollConfigError(e.message || 'Failed to save payroll settings.');
    } finally {
      setPayrollConfigLoading(false);
    }
  };


  // -------------------------------------------------------------
  // TAB 1: ROLE TEMPLATES STATE & HANDLERS (Migrated)
  // -------------------------------------------------------------
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tempName, setTempName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isEditingTemp, setIsEditingTemp] = useState(false);
  const [tempSuccess, setTempSuccess] = useState('');
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [activeModuleTab, setActiveModuleTab] = useState('all');

  // -------------------------------------------------------------
  // TAB 3: BRANDING LOGO STATE & HANDLERS
  // -------------------------------------------------------------
  const [tempLogo, setTempLogo] = useState(brandLogo || null);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const logoInputRef = useRef(null);

  const [newCompanyName, setNewCompanyName] = useState(companyName || '');
  const [companyNameSuccess, setCompanyNameSuccess] = useState('');
  const [companyNameError, setCompanyNameError] = useState('');
  const [isSavingCompanyName, setIsSavingCompanyName] = useState(false);

  useEffect(() => {
    if (companyName) {
      setNewCompanyName(companyName);
    }
  }, [companyName]);

  const handleSaveCompanyNameSubmit = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setIsSavingCompanyName(true);
    setCompanyNameError('');
    setCompanyNameSuccess('');
    try {
      await saveCompanyName(newCompanyName.trim());
      setCompanyNameSuccess('Company name updated successfully.');
      setTimeout(() => setCompanyNameSuccess(''), 4000);
    } catch (err) {
      setCompanyNameError(err.message || 'Failed to update company name.');
    } finally {
      setIsSavingCompanyName(false);
    }
  };

  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const walletSessionConfirmedRef = useRef('');

  // Helper: compress logo image preserving aspect ratio and transparency
  const cropAndCompressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await cropAndCompressImage(file);
      saveBrandLogo(processed);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } catch {
      showAlert('Could not read the image file. Please try another.', 'Upload Failed', 'error');
    }
  };

  const confirmLogoCrop = async () => {
    // Retained empty to avoid reference error
  };

  const handleCancelLogoCrop = () => {
    setTempLogo(brandLogo || null);
    setLogoCropOpen(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setTempLogo(null);
    saveBrandLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  useEffect(() => {
    if (selectedTemplate) {
      setTempName(selectedTemplate.name || '');
      setSelectedPermissions(selectedTemplate.permissions || []);
      setIsEditingTemp(true);
    } else {
      setTempName('');
      setSelectedPermissions([]);
      setIsEditingTemp(false);
    }
  }, [selectedTemplate]);

  const visiblePermissionFlags = PERMISSION_FLAGS.filter(flag => {
    if (!isProjectEnabled && MODULES_MAP.tasks?.ids.includes(flag.id)) {
      return false;
    }
    if (!isAttendanceEnabled && MODULES_MAP.attendance?.ids.includes(flag.id)) {
      return false;
    }
    return true;
  });

  const filteredVisibleFlags = visiblePermissionFlags.filter(flag => {
    const matchesTab = activeModuleTab === 'all' || MODULES_MAP[activeModuleTab]?.ids.includes(flag.id);
    if (permSearchQuery === '') return matchesTab;
    const query = permSearchQuery.toLowerCase();
    const matchesLabel = flag.label?.toLowerCase().includes(query);
    const matchesCategory = flag.category_label?.toLowerCase().includes(query);
    const matchesDesc = flag.description?.toLowerCase().includes(query);
    const matchesId = flag.id?.toLowerCase().includes(query);
    return matchesTab && (matchesLabel || matchesCategory || matchesDesc || matchesId);
  });

  const isAllPermsSelected = filteredVisibleFlags.length > 0 && filteredVisibleFlags.every(p => selectedPermissions.includes(p.id));

  const handleSelectAllPermsToggle = () => {
    if (isAllPermsSelected) {
      const visibleIds = filteredVisibleFlags.map(p => p.id);
      setSelectedPermissions(selectedPermissions.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = filteredVisibleFlags.map(p => p.id);
      const newSelections = Array.from(new Set([...selectedPermissions, ...visibleIds]));
      setSelectedPermissions(newSelections);
    }
  };

  const handlePermissionCheckbox = (id) => {
    if (selectedPermissions.includes(id)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== id));
    } else {
      setSelectedPermissions([...selectedPermissions, id]);
    }
  };

  const handleToggleModuleAll = (moduleIds) => {
    const visibleIds = visiblePermissionFlags
      .filter(flag => moduleIds.includes(flag.id))
      .map(flag => flag.id);

    const selectedInModule = visibleIds.filter(id => selectedPermissions.includes(id));
    const allSelected = visibleIds.length > 0 && selectedInModule.length === visibleIds.length;

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(id => !visibleIds.includes(id)));
    } else {
      const newSelections = Array.from(new Set([...selectedPermissions, ...visibleIds]));
      setSelectedPermissions(newSelections);
    }
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!tempName.trim()) return;

    saveTemplate({
      id: selectedTemplate ? selectedTemplate.id : null,
      name: tempName.trim(),
      permissions: selectedPermissions
    });
    setTempSuccess(selectedTemplate ? 'Template updated successfully.' : 'New template created successfully.');
    setTimeout(() => setTempSuccess(''), 4000);
    handleCancelTemplate();
  };

  const handleCancelTemplate = () => {
    setSelectedTemplate(null);
    setTempName('');
    setSelectedPermissions([]);
    setIsEditingTemp(false);
    setPermSearchQuery('');
    setActiveModuleTab('all');
  };

  const handleDeleteTemplate = (id) => {
    setTemplateConfirm({ open: true, id });
  };

  const confirmDeleteTemplate = () => {
    deleteTemplate(templateConfirm.id);
    setTempSuccess('Template deleted successfully.');
    setTimeout(() => setTempSuccess(''), 4000);
    setTemplateConfirm({ open: false, id: null });
  };

  // -------------------------------------------------------------
  // TAB 2: OFFICE LOCATIONS STATE & HANDLERS (Migrated)
  // -------------------------------------------------------------
  const [locName, setLocName] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLon, setLocLon] = useState('');
  const [locRadius, setLocRadius] = useState(100);
  const [editingLocId, setEditingLocId] = useState(null);
  const [locSuccess, setLocSuccess] = useState('');
  const [locError, setLocError] = useState('');
  const [fetchingGeo, setFetchingGeo] = useState(false);

  const getCoordinates = (timeoutMs = 10000) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation is not supported by your browser.');
        error.code = 0;
        reject(error);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          console.warn('High accuracy geolocation failed, trying fallback with low accuracy...', err);
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { enableHighAccuracy: false, timeout: timeoutMs }
          );
        },
        { enableHighAccuracy: true, timeout: timeoutMs }
      );
    });
  };

  const handleAutofillCoordinates = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser. Please enter coordinates manually.');
      return;
    }
    setFetchingGeo(true);
    setLocError('');
    setLocSuccess('Requesting your location… (allow the browser permission prompt)');

    getCoordinates(15000).then(
      (position) => {
        setLocLat(position.coords.latitude.toFixed(6));
        setLocLon(position.coords.longitude.toFixed(6));
        setFetchingGeo(false);
        setLocSuccess('Browser coordinates autofilled successfully.');
        setTimeout(() => setLocSuccess(''), 4000);
      },
      (err) => {
        setFetchingGeo(false);
        setLocSuccess('');
        // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = UNAVAILABLE, 3 = TIMEOUT
        let msg = 'Could not retrieve location.';
        if (err.code === 1) {
          msg = 'Location access was denied. Please click the location icon in your browser address bar and allow access, then try again.';
        } else if (err.code === 2) {
          msg = 'Location is unavailable on this device. Please enter coordinates manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please check your connection or enter coordinates manually.';
        } else if (err.message) {
          msg = `Location error: ${err.message}`;
        }
        setLocError(msg);
      }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (fetchingGeo) return; // Prevent double submission
    setLocError('');
    setLocSuccess('');

    if (!locName.trim() || locLat === '' || locLon === '' || !locRadius) {
      setLocError('All fields are required.');
      return;
    }

    const latitude = parseFloat(locLat);
    const longitude = parseFloat(locLon);
    const radiusMeters = parseInt(locRadius);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      setLocError('Latitude must be between -90 and 90.');
      return;
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      setLocError('Longitude must be between -180 and 180.');
      return;
    }
    if (isNaN(radiusMeters) || radiusMeters <= 0 || radiusMeters > 50000) {
      setLocError('Radius must be a positive number of meters up to 50,000.');
      return;
    }

    setFetchingGeo(true);
    try {
      const locPayload = {
        name: locName.trim(),
        lat: latitude,
        lon: longitude,
        radius: radiusMeters
      };

      if (editingLocId) {
        // Direct PATCH update of specific location
        const updatedLoc = await apiFetch(`/locations/${editingLocId}/`, {
          method: 'PATCH',
          body: JSON.stringify(locPayload)
        });
        const mapped = { ...updatedLoc, id: String(updatedLoc.id) };
        setOfficeLocations(prev => prev.map(loc => String(loc.id) === String(editingLocId) ? mapped : loc));
        setLocSuccess('Office location coordinates updated.');
      } else {
        // Direct POST creation of new location
        const createdLoc = await apiFetch('/locations/', {
          method: 'POST',
          body: JSON.stringify(locPayload)
        });
        const mapped = { ...createdLoc, id: String(createdLoc.id) };
        setOfficeLocations(prev => [...prev, mapped]);
        setLocSuccess('New office location coordinates added.');
      }
      handleCancelLocation();
      setTimeout(() => setLocSuccess(''), 4000);
    } catch (err) {
      console.error('Error saving location:', err);
      setLocError(err.message || 'Error occurred while saving office location.');
    } finally {
      setFetchingGeo(false);
    }
  };

  const handleEditLocation = (loc) => {
    setLocName(loc.name || '');
    setLocLat(loc.lat !== undefined && loc.lat !== null ? loc.lat.toString() : '');
    setLocLon(loc.lon !== undefined && loc.lon !== null ? loc.lon.toString() : '');
    setLocRadius(loc.radius || 100);
    setEditingLocId(loc.id);
    setLocError('');
  };

  const handleDeleteLocation = (id) => {
    setLocationConfirm({ open: true, id });
  };

  const confirmDeleteLocation = async () => {
    const id = locationConfirm.id;
    if (!id) return;
    setFetchingGeo(true);
    try {
      await apiFetch(`/locations/${id}/`, { method: 'DELETE' });
      setOfficeLocations(prev => prev.filter(loc => String(loc.id) !== String(id)));
      setLocSuccess('Office location removed.');
      setTimeout(() => setLocSuccess(''), 4000);
      if (editingLocId === id) handleCancelLocation();
    } catch (err) {
      console.error('Failed to delete location:', err);
      setLocError(err.message || 'Failed to delete office location.');
    } finally {
      setFetchingGeo(false);
      setLocationConfirm({ open: false, id: null });
    }
  };

  const handleCancelLocation = () => {
    setLocName('');
    setLocLat('');
    setLocLon('');
    setLocRadius(100);
    setEditingLocId(null);
    setLocError('');
  };

  // -------------------------------------------------------------
  // TAB 4: BILLING & SUBSCRIPTIONS STATE & HANDLERS (New)
  // -------------------------------------------------------------
  const [billingSuccess, setBillingSuccess] = useState('');
  // Wallet states
  const [wallet, setWallet] = useState({ balance: '0.00', transactions: [] });
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState('');
  const [walletError, setWalletError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [requestingConsultation, setRequestingConsultation] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(10);
  const [billingEstimate, setBillingEstimate] = useState(null);
  const [premiumAddons, setPremiumAddons] = useState({
    attendance: false,
    project: false,
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState({ attendance: false, project: false });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const walletFetchInProgressRef = useRef(false);
  const walletFailureCountRef = useRef(0);
  const [walletUnavailable, setWalletUnavailable] = useState(false);

  const fetchWallet = useCallback(async (sessionId = null, isManual = false) => {
    if (walletFetchInProgressRef.current) return;
    walletFetchInProgressRef.current = true;
    try {
      const url = sessionId ? `/wallet/current/?session_id=${encodeURIComponent(sessionId)}` : '/wallet/current/';
      const data = await apiFetch(url);
      if (data) {
        setWallet(data);
        setWalletUnavailable(false);
        walletFailureCountRef.current = 0;
      }
      return data;
    } catch (err) {
      walletFailureCountRef.current += 1;
      if (walletFailureCountRef.current === 1 || isManual) {
        console.warn('Wallet service currently unavailable:', err?.message || err);
      }
      setWalletUnavailable(true);
      setWallet(prev => (prev && prev.balance !== undefined ? prev : { balance: '0.00', transactions: [] }));
    } finally {
      walletFetchInProgressRef.current = false;
    }
  }, []);

  const fetchBillingEstimateAndCount = useCallback(async () => {
    try {
      const estimate = await apiFetch('/billing-estimate/');
      if (estimate && typeof estimate.billable_employee_count === 'number') {
        setEmployeeCount(estimate.billable_employee_count);
        setBillingEstimate(estimate);
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch billing estimate:", e);
    }
    try {
      const orgId = currentUser?.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';
      const data = await apiFetch(`/employees/${orgQuery}`);
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.results)) ? data.results : [];
      if (list.length > 0) {
        setEmployeeCount(list.length);
        return;
      }
    } catch (e) {
      // Fallback to max_employees_allowed if API fails
    }
    if (currentUser?.subscription?.max_employees_allowed) {
      setEmployeeCount(currentUser.subscription.max_employees_allowed);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser) return;

    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const paymentType = searchParams.get('payment_type');
    if (status === 'success' && sessionId && walletSessionConfirmedRef.current !== sessionId) {
      walletSessionConfirmedRef.current = sessionId;
      const isWalletSession = paymentType === 'wallet' || sessionId.includes('wallet') || sessionId.includes('topup') || sessionId.startsWith('mock_wallet_topup_');

      const handleConfirm = async () => {
        setConfirmingPayment(true);
        try {
          if (isWalletSession) {
            await fetchWallet(sessionId);
            showAlert(
              `Receipt:\n--------------------\nStatus: Success\nDetails: Prepaid Wallet Deposit\n\nYour balance has been updated!`,
              'Wallet Deposited Successfully!',
              'success'
            );
            router.replace('/admin/settings?tab=billing');
          } else {
            const result = await confirmSubscription(sessionId);
            showAlert(
              `Payment Receipt:\n--------------------\nStatus: Success\nDetails: Dynamic Subscription Plan\nValidity: 30 Days\n\nThank you for choosing CubeLogs!`,
              'Subscription Activated Successfully!',
              'success'
            );
            router.replace('/dashboard');
          }
        } catch (err) {
          showAlert(err.message || 'Payment confirmation failed.', 'Confirmation Error', 'error');
          router.replace(`/admin/settings?tab=${currentTab}`);
        } finally {
          setConfirmingPayment(false);
        }
      };
      handleConfirm();
    }
  }, [authStatus, currentUser, searchParams, router, confirmSubscription, currentTab, showAlert, fetchWallet]);

  const handleApplyCoupon = async () => {
    if (!couponCode || !couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setCouponError('Please enter a deposit amount first.');
      return;
    }

    setCouponChecking(true);
    setCouponError('');
    try {
      const data = await apiFetch('/wallet/validate-coupon/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          deposit_amount: parseFloat(topupAmount)
        })
      });

      if (data.error) {
        throw new Error(data.error);
      }
      if (data.valid) {
        setAppliedCoupon(data);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Invalid coupon code.');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError(err.message || 'Failed to validate coupon.');
      setAppliedCoupon(null);
    } finally {
      setCouponChecking(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  };

  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError('Amount changed. Please re-apply coupon code.');
    }
  }, [topupAmount, appliedCoupon]);

  const refreshUserSession = async () => {
    await refreshUser();
  };

  const handleToggleModule = (moduleName, currentVal) => {
    const targetState = !currentVal;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const remainingDays = totalDays - now.getDate() + 1;
    const basePrice = moduleName === 'attendance'
      ? (wallet?.attendance_module_price ? parseFloat(wallet.attendance_module_price) : 100)
      : (wallet?.tasks_module_price ? parseFloat(wallet.tasks_module_price) : 100);
    const proratedAmount = ((remainingDays / totalDays) * basePrice * employeeCount).toFixed(2);

    const executeToggle = async () => {
      setModuleConfirm(prev => ({ ...prev, open: false }));
      setToggleLoading(prev => ({ ...prev, [moduleName]: true }));
      try {
        const res = await apiFetch('/wallet/toggle-module/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            module: moduleName,
            enable: targetState
          })
        });

        if (res.error) {
          throw new Error(res.error);
        }

        setPremiumAddons(prev => ({ ...prev, [moduleName]: targetState }));
        await refreshUserSession();
        await fetchWallet();
        await fetchBillingEstimateAndCount();

        showAlert(
          res.message || 'Module status updated successfully.',
          'Module Updated',
          'success'
        );
      } catch (err) {
        console.warn("Module toggle failed:", err.message);
        showAlert(
          err.message || 'Failed to update module. Please make sure you have enough wallet balance.',
          'Action Failed',
          'error'
        );
      } finally {
        setToggleLoading(prev => ({ ...prev, [moduleName]: false }));
      }
    };

    if (targetState) {
      setModuleConfirm({
        open: true,
        title: `Activate ${moduleName === 'attendance' ? 'Attendance Management' : 'Project & Tasks Management'}`,
        message: `This will charge ₹${parseFloat(proratedAmount).toLocaleString('en-IN')} from your prepaid wallet for the remaining ${remainingDays} days of this month (prorated at ₹${basePrice}/employee/month for ${employeeCount} employees). Do you want to proceed?`,
        confirmLabel: 'Activate Module',
        danger: false,
        onConfirm: executeToggle
      });
    } else {
      setModuleConfirm({
        open: true,
        title: `Deactivate ${moduleName === 'attendance' ? 'Attendance Management' : 'Project & Tasks Management'}`,
        message: `Are you sure you want to deactivate this module? Access will be disabled immediately. No refund is provided for the remaining days of this month.`,
        confirmLabel: 'Deactivate Module',
        danger: true,
        onConfirm: executeToggle
      });
    }
  };

  // Billing Search
  const [billingSearchQuery, setBillingSearchQuery] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchBillingEstimateAndCount();
      if (currentUser?.subscription) {
        setPremiumAddons({
          attendance: currentUser.subscription.is_attendance_enabled || false,
          project: currentUser.subscription.is_project_enabled || false,
        });
      }
    }
  }, [currentUser, fetchBillingEstimateAndCount]);





  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setWalletError('Please enter a valid deposit amount.');
      return;
    }
    setTopupLoading(true);
    setWalletError('');
    setWalletSuccess('');
    try {
      const payload = { amount: parseFloat(topupAmount) };
      if (appliedCoupon) {
        payload.coupon_code = appliedCoupon.code;
      }
      const data = await apiFetch('/wallet/topup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (data && (data.is_mock || (data.order_id && data.order_id.startsWith('mock_')))) {
        await verifyPayment({
          razorpay_order_id: data.order_id,
          payment_type: 'wallet'
        });
        await fetchWallet();
        showAlert(
          `Receipt:\n--------------------\nStatus: Success\nDetails: Prepaid Wallet Deposit\n\nYour balance has been updated!`,
          'Wallet Deposited Successfully!',
          'success'
        );
        setTopupModalOpen(false);
        setTopupAmount('');
        setAppliedCoupon(null);
        setTopupLoading(false);
        return;
      }

      if (data && data.gateway === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setWalletError('Failed to load Razorpay payment SDK.');
          setTopupLoading(false);
          return;
        }

        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: data.name || 'CubeLogs',
          description: data.description || 'Wallet Top-up',
          order_id: data.order_id,
          handler: async function (response) {
            setTopupLoading(true);
            try {
              await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_type: 'wallet'
              });
              await fetchWallet();
              showAlert(
                `Receipt:\n--------------------\nStatus: Success\nDetails: Prepaid Wallet Deposit\n\nYour balance has been updated!`,
                'Wallet Deposited Successfully!',
                'success'
              );
              setTopupModalOpen(false);
              setTopupAmount('');
              setAppliedCoupon(null);
            } catch (err) {
              setWalletError(err.message || 'Deposit verification failed.');
            } finally {
              setTopupLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setTopupLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setWalletError('Failed to initiate deposit. Please try again.');
        setTopupLoading(false);
      }
    } catch (err) {
      setWalletError(err.message || 'Deposit initiation failed.');
      setTopupLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'wallet') {
      router.replace('/admin/settings?tab=billing');
    }
  }, [currentTab, router]);

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser && currentTab === 'billing') {
      fetchWallet();
      const status = searchParams.get('status');
      if (status === 'success') {
        setWalletSuccess('Payment processed successfully! Your balance has been updated.');
        router.replace('/admin/settings?tab=billing');
      } else if (status === 'cancel') {
        setWalletError('Payment checkout was cancelled.');
        router.replace('/admin/settings?tab=billing');
      }
    }
  }, [authStatus, currentUser, currentTab, searchParams, router, fetchWallet]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser || currentTab !== 'billing') return;

    let timeoutId = null;
    let isCancelled = false;

    const poll = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timeoutId = setTimeout(poll, 15000);
        return;
      }

      if (!isCancelled) {
        await fetchWallet();
      }

      if (!isCancelled) {
        const delay = walletFailureCountRef.current > 2 ? 45000 : 15000;
        timeoutId = setTimeout(poll, delay);
      }
    };

    timeoutId = setTimeout(poll, 15000);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authStatus, currentUser, currentTab, fetchWallet]);

  if (authStatus === 'loading') {
    return (
      <PageWrapper>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <p style={{ color: 'var(--text-muted, #94a3b8)' }}>Loading settings...</p>
        </div>
      </PageWrapper>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  const handleDynamicCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const activeAddonsList = [];
      if (premiumAddons.attendance) activeAddonsList.push('attendance');
      if (premiumAddons.project) activeAddonsList.push('project');

      const data = await apiFetch('/subscription/dynamic-checkout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_count: employeeCount,
          addons: activeAddonsList
        })
      });

      if (data && (data.is_mock || (data.order_id && data.order_id.startsWith('mock_')) || data.status === 'subscription_success')) {
        if (data.order_id) {
          await verifyPayment({
            razorpay_order_id: data.order_id,
            payment_type: 'subscription'
          });
        }
        showAlert(
          `Payment Receipt:\n--------------------\nStatus: Success\nDetails: Dynamic Subscription Plan\nValidity: 30 Days\n\nThank you for choosing CubeLogs!`,
          'Subscription Activated Successfully!',
          'success'
        );
        router.replace('/dashboard');
        return;
      }

      if (data && data.gateway === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          showAlert('Failed to load Razorpay payment SDK.', 'Error', 'error');
          setCheckoutLoading(false);
          return;
        }

        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: data.name || 'CubeLogs',
          description: data.description || 'Dynamic Subscription Plan',
          order_id: data.order_id,
          handler: async function (response) {
            setCheckoutLoading(true);
            try {
              await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_type: 'subscription'
              });
              showAlert(
                `Payment Receipt:\n--------------------\nStatus: Success\nDetails: Dynamic Subscription Plan\nValidity: 30 Days\n\nThank you for choosing CubeLogs!`,
                'Subscription Activated Successfully!',
                'success'
              );
              router.replace('/dashboard');
            } catch (err) {
              showAlert(err.message || 'Subscription verification failed.', 'Error', 'error');
            } finally {
              setCheckoutLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setCheckoutLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        showAlert('Failed to initiate checkout. Please try again.', 'Checkout Failed', 'error');
        setCheckoutLoading(false);
      }
    } catch (err) {
      showAlert(err.message || 'Checkout initiation failed.', 'Error', 'error');
      setCheckoutLoading(false);
    }
  };

  const handleRequestConsultation = () => {
    setRequestingConsultation(true);
    setTimeout(() => {
      setRequestingConsultation(false);
      showAlert(
        'Your request for custom enterprise software development consultation has been submitted. Our team will contact you shortly.',
        'Consultation Requested',
        'success'
      );
    }, 1200);
  };

  // Active status conditions
  const isExpiring = subscriptionDays <= 15;
  const isAuthorizedToAnyTab = hasTemplatesPerm || hasLocationsPerm || hasBrandingPerm || hasBillingPerm || true;

  if (!currentUser) return null;

  if (confirmingPayment) {
    return (
      <PageWrapper title="Confirming Payment" requiredPermission="dashboard">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ color: 'var(--text-main)' }}>Verifying Payment Status...</h2>
          <p style={{ color: 'var(--text-muted)' }}>Please wait while we verify your payment transaction.</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthorizedToAnyTab) {
    return (
      <PageWrapper title="Settings" requiredPermission="dashboard">
        <div className="panel alert-box alert-box-danger">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningIcon size={20} style={{ color: 'var(--danger)' }} />
            <span>Access Denied</span>
          </h3>
          <p>You do not have administrative permissions to view or edit system settings pages.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings" requiredPermission="dashboard">
      <div className="settings-container">

        {/* Settings Navigation Tabs */}
        <div ref={tabNavRef} className="settings-tabs" style={{ borderBottom: '1.5px solid var(--border, #d2e0f5)', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {hasTemplatesPerm && (
            <button
              type="button"
              data-active-blue={currentTab === 'templates' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'templates' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'templates' ? '#2563eb' : '#ffffff',
                color: currentTab === 'templates' ? '#ffffff' : '#2563eb',
                border: currentTab === 'templates' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'templates' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('templates')}
            >
              <TemplatesIcon size={16} style={{ color: currentTab === 'templates' ? '#ffffff' : '#2563eb', stroke: currentTab === 'templates' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'templates' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'templates' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>
                <span className="tab-label-full">Role Templates</span>
                <span className="tab-label-short">Templates</span>
              </span>
            </button>
          )}
          {hasLocationsPerm && isAttendanceEnabled && (
            <button
              type="button"
              data-active-blue={currentTab === 'locations' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'locations' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'locations' ? '#2563eb' : '#ffffff',
                color: currentTab === 'locations' ? '#ffffff' : '#2563eb',
                border: currentTab === 'locations' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'locations' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('locations')}
            >
              <LocationIcon size={16} style={{ color: currentTab === 'locations' ? '#ffffff' : '#2563eb', stroke: currentTab === 'locations' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'locations' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'locations' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>
                <span className="tab-label-full">Office Locations</span>
                <span className="tab-label-short">Locations</span>
              </span>
            </button>
          )}
          {hasBrandingPerm && (
            <button
              type="button"
              data-active-blue={currentTab === 'branding' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'branding' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'branding' ? '#2563eb' : '#ffffff',
                color: currentTab === 'branding' ? '#ffffff' : '#2563eb',
                border: currentTab === 'branding' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'branding' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('branding')}
            >
              <BrandLogo size={16} style={{ color: currentTab === 'branding' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'branding' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'branding' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>Branding</span>
            </button>
          )}
          {hasBillingPerm && (
            <button
              type="button"
              data-active-blue={currentTab === 'billing' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'billing' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'billing' ? '#2563eb' : '#ffffff',
                color: currentTab === 'billing' ? '#ffffff' : '#2563eb',
                border: currentTab === 'billing' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'billing' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('billing')}
            >
              <ClockIcon size={16} style={{ color: currentTab === 'billing' ? '#ffffff' : '#2563eb', stroke: currentTab === 'billing' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'billing' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'billing' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>
                <span className="tab-label-full">Billing & Subscription</span>
                <span className="tab-label-short">Billing</span>
              </span>
            </button>
          )}
          {hasAttendanceConfigPerm && (
            <button
              type="button"
              data-active-blue={currentTab === 'attendance-config' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'attendance-config' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'attendance-config' ? '#2563eb' : '#ffffff',
                color: currentTab === 'attendance-config' ? '#ffffff' : '#2563eb',
                border: currentTab === 'attendance-config' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'attendance-config' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('attendance-config')}
            >
              <ClockIcon size={16} style={{ color: currentTab === 'attendance-config' ? '#ffffff' : '#2563eb', stroke: currentTab === 'attendance-config' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'attendance-config' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'attendance-config' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>
                <span className="tab-label-full">Attendance Rules</span>
                <span className="tab-label-short">Attendance</span>
              </span>
            </button>
          )}
          {hasPayrollConfigPerm && (
            <button
              type="button"
              data-active-blue={currentTab === 'payroll-config' ? 'true' : undefined}
              className={`tab-link ${currentTab === 'payroll-config' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: 'none',
                backgroundColor: currentTab === 'payroll-config' ? '#2563eb' : '#ffffff',
                color: currentTab === 'payroll-config' ? '#ffffff' : '#2563eb',
                border: currentTab === 'payroll-config' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                boxShadow: currentTab === 'payroll-config' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onClick={() => handleTabChange('payroll-config')}
            >
              <DollarIcon size={16} style={{ color: currentTab === 'payroll-config' ? '#ffffff' : '#2563eb', stroke: currentTab === 'payroll-config' ? '#ffffff' : '#2563eb', flexShrink: 0 }} />
              <span className={currentTab === 'payroll-config' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: currentTab === 'payroll-config' ? '#ffffff' : '#2563eb', fontWeight: '600' }}>
                <span className="tab-label-full">Payroll Settings</span>
                <span className="tab-label-short">Payroll</span>
              </span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="settings-content-wrapper">

          {/* TAB: ATTENDANCE RULES CONFIG */}
          {currentTab === 'attendance-config' && hasAttendanceConfigPerm && (
            <AttendanceRulesTab
              attendanceConfig={attendanceConfig}
              setAttendanceConfig={setAttendanceConfig}
              attendanceConfigLoading={attendanceConfigLoading}
              attendanceConfigSuccess={attendanceConfigSuccess}
              attendanceConfigError={attendanceConfigError}
              handleSaveAttendanceConfig={handleSaveAttendanceConfig}
            />
          )}


          {/* TAB: PAYROLL SETTINGS CONFIG */}
          {currentTab === 'payroll-config' && hasPayrollConfigPerm && (
            <PayrollSettingsTab
              payrollConfig={payrollConfig}
              setPayrollConfig={setPayrollConfig}
              payrollConfigLoading={payrollConfigLoading}
              payrollConfigSuccess={payrollConfigSuccess}
              payrollConfigError={payrollConfigError}
              handleSavePayrollConfig={handleSavePayrollConfig}
            />
          )}


          {/* TAB 1: ROLE TEMPLATES CONTENT */}
          {currentTab === 'templates' && hasTemplatesPerm && (
            <TemplatesTab
              templates={templates}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              tempName={tempName}
              setTempName={setTempName}
              selectedPermissions={selectedPermissions}
              setSelectedPermissions={setSelectedPermissions}
              isEditingTemp={isEditingTemp}
              tempSuccess={tempSuccess}
              permSearchQuery={permSearchQuery}
              setPermSearchQuery={setPermSearchQuery}
              activeModuleTab={activeModuleTab}
              setActiveModuleTab={setActiveModuleTab}
              visiblePermissionFlags={visiblePermissionFlags}
              filteredVisibleFlags={filteredVisibleFlags}
              isAllPermsSelected={isAllPermsSelected}
              handleSelectAllPermsToggle={handleSelectAllPermsToggle}
              handlePermissionCheckbox={handlePermissionCheckbox}
              handleToggleModuleAll={handleToggleModuleAll}
              handleSaveTemplate={handleSaveTemplate}
              handleCancelTemplate={handleCancelTemplate}
              handleDeleteTemplate={handleDeleteTemplate}
              MODULES_MAP={MODULES_MAP}
            />
          )}

          {/* TAB 2: OFFICE LOCATIONS CONTENT */}
          {currentTab === 'locations' && hasLocationsPerm && isAttendanceEnabled && (
            <LocationsTab
              editingLocId={editingLocId}
              locName={locName}
              setLocName={setLocName}
              locLat={locLat}
              setLocLat={setLocLat}
              locLon={locLon}
              setLocLon={setLocLon}
              locRadius={locRadius}
              setLocRadius={setLocRadius}
              fetchingGeo={fetchingGeo}
              locSuccess={locSuccess}
              locError={locError}
              officeLocations={officeLocations}
              handleSaveLocation={handleSaveLocation}
              handleEditLocation={handleEditLocation}
              handleDeleteLocation={handleDeleteLocation}
              handleCancelLocation={handleCancelLocation}
              handleAutofillCoordinates={handleAutofillCoordinates}
            />
          )}

          {/* TAB 3: BRANDING LOGO CONTENT */}
          {currentTab === 'branding' && hasBrandingPerm && (
            <BrandingTab
              brandLogo={brandLogo}
              logoInputRef={logoInputRef}
              newCompanyName={newCompanyName}
              setNewCompanyName={setNewCompanyName}
              companyNameSuccess={companyNameSuccess}
              companyNameError={companyNameError}
              isSavingCompanyName={isSavingCompanyName}
              logoCropOpen={logoCropOpen}
              tempLogo={tempLogo}
              handleSaveCompanyNameSubmit={handleSaveCompanyNameSubmit}
              handleLogoChange={handleLogoChange}
              confirmLogoCrop={confirmLogoCrop}
              handleCancelLogoCrop={handleCancelLogoCrop}
              handleRemoveLogo={handleRemoveLogo}
            />
          )}

          {/* TAB 4: BILLING & SUBSCRIPTIONS CONTENT */}
          {currentTab === 'billing' && hasBillingPerm && (
            <BillingTab
              currentUser={currentUser}
              wallet={wallet}
              topupAmount={topupAmount}
              setTopupAmount={setTopupAmount}
              topupLoading={topupLoading}
              walletSuccess={walletSuccess}
              walletError={walletError}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              appliedCoupon={appliedCoupon}
              couponError={couponError}
              couponChecking={couponChecking}
              checkoutLoading={checkoutLoading}
              employeeCount={employeeCount}
              setEmployeeCount={setEmployeeCount}
              billingEstimate={billingEstimate}
              premiumAddons={premiumAddons}
              setPremiumAddons={setPremiumAddons}
              toggleLoading={toggleLoading}
              billingSearchQuery={billingSearchQuery}
              setBillingSearchQuery={setBillingSearchQuery}
              selectedReceipt={selectedReceipt}
              setSelectedReceipt={setSelectedReceipt}
              billingSuccess={billingSuccess}
              handleApplyCoupon={handleApplyCoupon}
              handleRemoveCoupon={handleRemoveCoupon}
              handleTopup={handleTopup}
              handleToggleModule={handleToggleModule}
              handleDynamicCheckout={handleDynamicCheckout}
              PLANS={PLANS}
              WalletIcon={WalletIcon}
            />
          )}

        </div>
      </div>

      <style jsx global>{`
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .settings-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 12px;
          border-bottom: 1.5px solid var(--border, #d2e0f5);
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          -webkit-overflow-scrolling: touch;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .settings-tabs::-webkit-scrollbar {
          height: 3px;
        }

        .settings-tabs::-webkit-scrollbar-track {
          background: transparent;
        }

        .settings-tabs::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }

        .settings-tabs::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .active-tab-blue,
        .active-blue-btn,
        button[data-active-blue="true"],
        .tab-link.active {
          background: #2563eb !important;
          background-color: #2563eb !important;
          border-color: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
        }

        .active-tab-blue *,
        .active-blue-btn *,
        button[data-active-blue="true"] *,
        .tab-link.active *,
        .active-tab-text,
        span.active-tab-text {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }

        .inactive-blue-pill,
        .inactive-tab-white,
        .tab-link:not(.active) {
          background: #ffffff !important;
          background-color: #ffffff !important;
          border-color: #bfdbfe !important;
          color: #2563eb !important;
        }

        .inactive-blue-pill *,
        .inactive-tab-white *,
        .tab-link:not(.active) *,
        .inactive-tab-text,
        span.inactive-tab-text {
          color: #2563eb !important;
          stroke: #2563eb !important;
        }

        .inactive-blue-pill:hover,
        .inactive-tab-white:hover,
        .tab-link:not(.active):hover {
          background: #eff6ff !important;
          background-color: #eff6ff !important;
          border-color: #93c5fd !important;
          color: #1d4ed8 !important;
        }

        .inactive-blue-pill:hover *,
        .inactive-tab-white:hover *,
        .tab-link:not(.active):hover *,
        .inactive-blue-pill:hover span,
        .tab-link:not(.active):hover span {
          color: #1d4ed8 !important;
          stroke: #1d4ed8 !important;
        }

        /* Scoped Dark Mode Overrides */
        :global(:root.dark) .inactive-blue-pill,
        :global(:root.dark) .inactive-tab-white,
        :global(:root.dark) .tab-link:not(.active) {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #93c5fd !important;
        }

        :global(:root.dark) .inactive-blue-pill *,
        :global(:root.dark) .inactive-tab-white *,
        :global(:root.dark) .tab-link:not(.active) *,
        :global(:root.dark) .inactive-tab-text,
        :global(:root.dark) span.inactive-tab-text {
          color: #93c5fd !important;
          stroke: #93c5fd !important;
        }

        :global(:root.dark) .inactive-blue-pill:hover,
        :global(:root.dark) .inactive-tab-white:hover,
        :global(:root.dark) .tab-link:not(.active):hover {
          background: rgba(37, 99, 235, 0.2) !important;
          background-color: rgba(37, 99, 235, 0.2) !important;
          border-color: #3b82f6 !important;
          color: #60a5fa !important;
        }

        :global(:root.dark) .template-item-card,
        :global(:root.dark) .location-item-card,
        :global(:root.dark) .settings-panel-card,
        :global(:root.dark) .premium-billing-card,
        :global(:root.dark) .module-item,
        :global(:root.dark) .calculator-panel {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        :global(:root.dark) .template-item-card h4,
        :global(:root.dark) .location-item-card h4,
        :global(:root.dark) .settings-panel-card h3,
        :global(:root.dark) .settings-panel-card h4 {
          color: #f8fafc !important;
        }

        :global(:root.dark) .card-actions-row,
        :global(:root.dark) .settings-tabs {
          border-color: #334155 !important;
        }

        .settings-content-wrapper {
          min-height: auto;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .tab-label-short {
          display: none;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
          gap: 24px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .settings-single-card {
          width: 100%;
        }

        .settings-panel-card {
          padding: 24px !important;
          box-sizing: border-box;
          height: fit-content;
        }

        .tab-desc {
          font-size: 0.85rem;
          color: var(--text-light);
          margin-bottom: 24px;
          line-height: 1.4;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .permission-matrix-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
          margin-top: 8px;
        }

        .section-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .select-all-label {
          color: var(--primary);
          font-size: 0.88rem;
        }

        .permissions-checklist-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
        }

        .permission-item-label {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background-color: var(--bg-app);
          border: 1px solid var(--border);
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .permission-item-label:hover {
          background-color: var(--primary-light);
          border-color: var(--primary-border);
        }

        .tab-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          margin-top: 8px;
          line-height: 1.4;
        }

        .tab-alert.success {
          background-color: var(--success-light);
          border: 1px solid var(--primary-border);
          color: var(--primary-dark);
        }

        .tab-alert.danger {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        /* Templates list */
        .templates-list-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .template-item-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: var(--shadow-sm);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-top h4 {
          font-size: 1rem;
          color: var(--text-main);
          margin: 0;
        }

        .permissions-badge-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .preview-badge {
          font-size: 0.7rem;
          background-color: var(--bg-app);
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .card-actions-row {
          display: flex;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-top: 2px;
        }

        /* Locations Stack */
        .locations-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .location-item-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: var(--shadow-sm);
          transition: border-color 0.2s;
        }

        .location-item-card.active-edit {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .coord-details-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 14px;
          background-color: var(--bg-app);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 0.82rem;
        }

        /* Branding logo styles */
        /* Branding logo styles */
        .logo-edit-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .logo-preview-circle {
          width: 180px;
          height: 100px;
          border-radius: var(--radius-md, 8px);
          background: linear-gradient(135deg, var(--primary-light) 0%, #dbeafe 100%);
          border: 2px dashed var(--primary-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .logo-preview-circle:hover {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .logo-preview-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }

        .logo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0 8px;
          text-align: center;
          gap: 4px;
          color: var(--primary);
          opacity: 0.6;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.2;
        }

        .modal-overlay {
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Billing Alert Banner */
        .subscription-alert-banner {
          display: flex;
          gap: 16px;
          padding: 20px;
          border-radius: var(--radius-md);
          margin-bottom: 28px;
          align-items: flex-start;
          line-height: 1.45;
        }

        .subscription-alert-banner.danger-alert {
          background-color: #fef2f2;
          border: 1.5px solid #fecaca;
          color: #991b1b;
        }

        .subscription-alert-banner.danger-alert .banner-icon-side {
          color: #dc2626;
        }

        .subscription-alert-banner.success-alert {
          background-color: var(--success-light);
          border: 1.5px solid var(--primary-border);
          color: var(--primary-dark);
        }

        .subscription-alert-banner.success-alert .banner-icon-side {
          color: var(--primary);
        }

        .banner-text-side h4 {
          margin: 0 0 6px 0;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .banner-text-side p {
          margin: 0;
          font-size: 0.88rem;
          opacity: 0.9;
        }

        /* Premium Billing Grid & Cards */
        .premium-billing-plans-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-top: 36px;
        }

        .premium-billing-card {
          background-color: #ffffff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 36px 32px;
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-md);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-billing-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-border);
        }

        .dynamic-plan-card {
          border: 2px solid var(--primary);
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.08), var(--shadow-md);
        }
        
        .dynamic-plan-card:hover {
          box-shadow: 0 0 30px rgba(37, 99, 235, 0.15), var(--shadow-lg);
        }

        .dynamic-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: #fff;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 6px 16px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          white-space: nowrap;
        }

        .premium-card-body {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .premium-card-body h3 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .premium-card-subtitle {
          font-size: 0.92rem;
          color: var(--text-light);
          line-height: 1.5;
          margin-bottom: 32px;
        }

        /* Config Box inside BYO */
        .interactive-config-box {
          background-color: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 28px;
        }

        .config-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .config-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .config-value {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--primary);
        }

        .slider-wrapper {
          margin-bottom: 8px;
        }

        .premium-range-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--primary-border);
          outline: none;
          margin: 12px 0;
        }

        .premium-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.3);
          transition: transform 0.1s ease;
        }

        .premium-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }

        .pricing-rate-sub {
          font-size: 0.78rem;
          color: var(--text-light);
          text-align: right;
          margin-bottom: 24px;
          opacity: 0.8;
        }

        .modules-selection-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 14px;
          letter-spacing: 0.02em;
        }

        .modules-checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .module-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #ffffff;
          border: 1px solid var(--border);
          padding: 10px 14px;
          border-radius: 8px;
        }

        .module-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--text-muted);
          user-select: none;
          position: relative;
        }

        .module-checkbox {
          opacity: 0;
          position: absolute;
          width: 0;
          height: 0;
        }

        .checkbox-custom {
          width: 16px;
          height: 16px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background-color: #ffffff;
          display: inline-block;
          position: relative;
          transition: all 0.2s ease;
        }

        .module-checkbox:checked + .checkbox-custom {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .module-checkbox:checked + .checkbox-custom::after {
          content: "";
          position: absolute;
          left: 5px;
          top: 2px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .included-indicator {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--primary);
          background-color: var(--primary-light);
          border: 1px solid var(--primary-border);
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .module-checkbox:checked ~ .module-name {
          color: var(--primary-dark);
          font-weight: 600;
        }

        .dynamic-price-display {
          display: flex;
          align-items: baseline;
          margin-top: auto;
          margin-bottom: 24px;
          padding-top: 16px;
        }

        .currency-symbol {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--primary);
          margin-right: 6px;
        }

        .price-value {
          font-size: 3.2rem;
          font-weight: 850;
          color: var(--primary-dark);
          line-height: 1;
        }

        .price-period {
          font-size: 0.92rem;
          color: var(--text-light);
          margin-left: 8px;
          opacity: 0.8;
        }

        /* Buttons Premium */
        .btn-premium {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 0.98rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-premium-primary {
          background: var(--primary);
          border: none;
          color: #fff;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.2);
        }

        .btn-premium-primary:hover:not(:disabled) {
          background: var(--primary-hover);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }

        .btn-premium-outline {
          background: transparent;
          border: 1.5px solid var(--primary-border);
          color: var(--primary);
        }

        .btn-premium-outline:hover:not(:disabled) {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .btn-premium:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-arrow {
          font-size: 1.1rem;
          transition: transform 0.2s;
        }

        .btn-premium-primary:hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Enterprise services details */
        .enterprise-services-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .enterprise-services-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: auto;
        }

        .service-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .service-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background-color: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: 8px;
          color: var(--primary);
          flex-shrink: 0;
        }

        .service-details h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 4px 0;
        }

        .service-details p {
          font-size: 0.84rem;
          color: var(--text-light);
          opacity: 0.9;
          margin: 0;
          line-height: 1.45;
        }

        .lets-talk-section {
          margin-top: 36px;
          border-top: 1px solid var(--border);
          padding-top: 24px;
        }

        .lets-talk-section h3 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 16px 0;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .no-data {
          font-size: 0.85rem;
          color: var(--text-light);
          text-align: center;
          padding: 24px 0;
        }

        .billing-history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 32px;
        }
        .billing-history-grid > div,
        .dynamic-calculator-container > div {
          min-width: 0;
        }
        .dynamic-calculator-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-top: 24px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        @media (min-width: 900px) {
          .dynamic-calculator-container {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }
        .calculator-panel {
          padding: 24px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }
        .billing-search-input {
          width: 250px;
          padding: 6px 12px;
          font-size: 0.85rem;
          box-sizing: border-box;
        }

        @media (max-width: 992px) {
          .settings-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .premium-billing-plans-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .billing-history-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .dynamic-calculator-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .settings-tabs {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            padding-bottom: 16px !important;
            overflow-x: visible !important;
            white-space: normal !important;
            width: 100% !important;
            border-bottom: 1.5px solid var(--border, #d2e0f5) !important;
          }
          .settings-tabs::-webkit-scrollbar {
            display: none !important;
          }
          .tab-link {
            width: 100% !important;
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 10px 8px !important;
            font-size: 0.82rem !important;
            gap: 8px !important;
            box-sizing: border-box !important;
            text-align: center !important;
            white-space: nowrap !important;
            border-radius: 8px !important;
          }
          .tab-link span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .tab-label-full {
            display: none !important;
          }
          .tab-label-short {
            display: inline !important;
          }
        }

        @media (max-width: 480px) {
          .settings-panel-card {
            padding: 14px 12px !important;
          }
          .tab-link {
            padding: 9px 6px !important;
            font-size: 0.78rem !important;
            gap: 6px !important;
          }
          .billing-search-input {
            width: 100% !important;
            max-width: 100% !important;
          }
          .dynamic-calculator-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .calculator-panel {
            padding: 14px 10px !important;
          }
          .premium-billing-card {
            padding: 14px 10px !important;
          }
          .price-value {
            font-size: 1.8rem !important;
          }
          .currency-symbol {
            font-size: 1.2rem !important;
          }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .close-receipt-btn:hover {
          background-color: var(--border) !important;
          color: var(--text-main) !important;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-modal-box, .receipt-modal-box * {
            visibility: visible;
          }
          .receipt-modal-box {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .close-receipt-btn {
            display: none !important;
          }
        }
      `}</style>

      {/* Dynamic Payment Receipt Modal */}
      {selectedReceipt && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content receipt-modal-box" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: 'calc(100vh - 40px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={(e) => e.stopPropagation()}>

            {(() => {
              const isDebit = selectedReceipt.transactionType === 'Debit';
              return (
                <>
                  {/* Modal Header */}
                  <div style={{
                    padding: '24px 24px 20px',
                    borderBottom: '1px dashed var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isDebit ? '#f1f5f9' : 'var(--primary-light)'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: isDebit ? 'var(--text-main)' : 'var(--primary-dark)', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        {isDebit ? 'CubeLogs Invoice' : 'CubeLogs Receipt'}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {isDebit ? 'Subscription License Charge' : 'Prepaid Balance Refill'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(null)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s'
                      }}
                      className="close-receipt-btn"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    overflowY: 'auto',
                    flex: 1
                  }}>
                    {/* Visual Status Badge */}
                    <div style={{
                      width: '50px', height: '50px',
                      borderRadius: '50%',
                      backgroundColor: isDebit ? '#eff6ff' : 'var(--success-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isDebit ? '#2563eb' : 'var(--success)',
                      border: isDebit ? '1px solid #bfdbfe' : '1px solid var(--primary-border)',
                      flexShrink: 0
                    }}>
                      {isDebit ? <ClockIcon size={24} /> : <CheckIcon size={24} />}
                    </div>

                    {/* Amount Display */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {isDebit ? 'Amount Billed' : 'Amount Deposited'}
                      </span>
                      <div style={{ fontSize: '2.1rem', fontWeight: '850', color: 'var(--text-main)', marginTop: '2px', letterSpacing: '-0.02em' }}>
                        {isDebit ? '-' : ''}₹{parseFloat(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: isDebit ? '#eff6ff' : 'var(--success-light)',
                        color: isDebit ? '#2563eb' : 'var(--success)',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        marginTop: '6px',
                        border: isDebit ? '1px solid #bfdbfe' : '1px solid var(--primary-border)'
                      }}>
                        {isDebit ? 'Payment Settled' : (selectedReceipt.status === 'Success' ? 'Transaction Successful' : selectedReceipt.status)}
                      </span>
                    </div>

                    {/* Receipt Ledger Data Fields */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{isDebit ? 'Invoice ID' : 'Receipt ID'}</span>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>
                          {isDebit ? 'INV-' : 'REC-'}{selectedReceipt.id.toString().substring(0, 8).toUpperCase()}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Date & Time</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {new Date(selectedReceipt.createdAt).toLocaleString()}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Description</span>
                        <strong style={{ color: 'var(--text-main)', textAlign: 'right', maxWidth: '240px', wordBreak: 'break-word' }}>
                          {selectedReceipt.details || (isDebit ? 'Subscription License charge' : 'Prepaid Wallet Top-up')}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Customer Account</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {currentUser.email}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payment Channel</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {isDebit ? 'Prepaid Wallet Balance' : 'Razorpay Gateway'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '20px 24px 24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: '12px',
                    backgroundColor: '#f8fafc'
                  }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                      style={{ flex: 1, padding: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <span>{isDebit ? 'Print Invoice' : 'Print Receipt'}</span>
                    </button>
                    {selectedReceipt.receipt_url && (
                      <a
                        href={selectedReceipt.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                      >
                        <span>Payment Receipt ↗</span>
                      </a>
                    )}
                  </div>
                </>
              );
            })()}

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={templateConfirm.open}
        title="Delete Role Template"
        message="Are you sure you want to delete this template? Employees using default permissions of this template will keep their last permissions."
        confirmLabel="Delete Template"
        danger={true}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setTemplateConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={locationConfirm.open}
        title="Remove Office Geofence"
        message="Delete this office location geofence? Employees will no longer clock-in against these coordinates."
        confirmLabel="Remove Location"
        danger={true}
        onConfirm={confirmDeleteLocation}
        onCancel={() => setLocationConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={moduleConfirm.open}
        title={moduleConfirm.title}
        message={moduleConfirm.message}
        confirmLabel={moduleConfirm.confirmLabel}
        danger={moduleConfirm.danger}
        onConfirm={moduleConfirm.onConfirm}
        onCancel={() => setModuleConfirm(prev => ({ ...prev, open: false }))}
      />
    </PageWrapper>
  );
}

export default function SettingsHub() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Settings...
        </div>
      </div>
    }>
      <SettingsHubContent />
    </Suspense>
  );
}
