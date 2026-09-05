'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DashboardIcon,
  TemplatesIcon,
  EmployeesIcon,
  AttendanceIcon,
  TasksIcon,
  LeavesIcon,
  HolidaysIcon,
  LogoutIcon,
  BrandLogo,
  ChevronIcon,
  LocationIcon,
  AuditIcon,
  PayrollIcon
} from './Icons';

const Sidebar = React.memo(function Sidebar() {
  const { currentUser, hasPermission, logout, sidebarOpen, setSidebarOpen, companyName, permissionsRegistry } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const iconMap = {
    'AttendanceIcon': <AttendanceIcon size={18} />,
    'TasksIcon': <TasksIcon size={18} />,
    'LeavesIcon': <LeavesIcon size={18} />
  };

  // Active sub-tab search param check
  const activeTab = searchParams.get('tab') || '';

  // Accordion open states
  const [openSections, setOpenSections] = useState({
    attendance: true,
    payroll: true,
    project_management: true,
    tasks: true,
    settings: false,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    router.push('/login');
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth < 992) {
      setSidebarOpen(false);
    }
  };

  // Body scroll locking and Escape key handling for off-canvas drawer
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen && window.innerWidth < 992) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen && window.innerWidth < 992) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('sidebar-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen, setSidebarOpen]);

  if (!currentUser) return null;

  // Helper to check if route is active (exact)
  const isActive = (path) => pathname === path;

  // Helper for sub-nav with optional tab param
  const isSubActive = (path) => {
    const [basePath, queryString] = path.split('?');
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const navTab = params.get('tab');
      return pathname === basePath && activeTab === navTab;
    }
    // Exact path match only (no prefix matching for payroll sub-routes)
    return pathname === basePath && !activeTab;
  };

  const isUnpaid = currentUser?.subscription?.subscriptionStatus === 'Unpaid' || currentUser?.subscription?.subscriptionStatus === 'Restricted';

  // --- Attendance Management module entitlement & permission checks ---
  const isAttendanceEnabled = currentUser?.is_superuser
    ? true
    : (currentUser?.is_attendance_enabled !== false && currentUser?.subscription?.is_attendance_enabled !== false);

  const isSuperAdmin = !!currentUser?.isSuperAdmin;

  const hasSettingsTemplates = !isUnpaid && hasPermission('admin:templates');
  const hasSettingsLocations = !isUnpaid && hasPermission('locations:manage');
  const hasSettingsBranding = !isUnpaid && hasPermission('settings:branding');
  const hasSettingsBilling = hasPermission('settings:billing');
  const hasAttendanceConfig = !isUnpaid && isAttendanceEnabled && hasPermission('attendance:management_portal');
  const hasPayrollConfig = !isUnpaid && isAttendanceEnabled && (isSuperAdmin || hasPermission('payroll:manage') || hasPermission('payroll:process') || hasPermission('payroll:view'));
  const showSettingsSection = hasSettingsTemplates || hasSettingsLocations || hasSettingsBranding || hasSettingsBilling || hasAttendanceConfig || hasPayrollConfig;

  // ATTENDANCE category
  const canViewAttendanceClocking = isSuperAdmin || hasPermission('attendance:staff');
  const canViewMgmtPortal = !isUnpaid && (isSuperAdmin || hasPermission('attendance:management_portal'));

  // LEAVE & HOLIDAYS category
  const canApplyLeave = isSuperAdmin || hasPermission('leaves:apply');
  const canApproveLeave = !isUnpaid && (isSuperAdmin || hasPermission('leaves:approve'));
  const canManageLeaveTypes = !isUnpaid && (isSuperAdmin || hasPermission('leaves:manage'));
  const canViewHolidays = isSuperAdmin || hasPermission('holidays:view');

  // PAYROLL & SALARY category (Shares Attendance addon entitlement)
  const canViewPayroll = !isUnpaid && (isSuperAdmin || hasPermission('payroll:view') || hasPermission('payroll:process') || hasPermission('payroll:manage'));
  const canViewSalaries = !isUnpaid && (isSuperAdmin || hasPermission('salary:view') || hasPermission('salary:manage'));
  const canViewPayslipsAdmin = !isUnpaid && (isSuperAdmin || hasPermission('payroll:view') || hasPermission('payroll:manage'));

  // Whether Attendance Management module is visible (requires module enabled + permissions)
  const hasAttendanceSection = isAttendanceEnabled && (canViewAttendanceClocking || canViewMgmtPortal);
  const hasLeaveHolidaySection = isAttendanceEnabled && (canApplyLeave || canApproveLeave || canManageLeaveTypes || canViewHolidays);
  const showAttendanceModule = !isUnpaid && isAttendanceEnabled && (hasAttendanceSection || hasLeaveHolidaySection);

  // Payroll module visibility (shares Attendance addon entitlement)
  const hasPayrollSalarySection = isAttendanceEnabled && (canViewPayroll || canViewSalaries || canViewPayslipsAdmin);
  const showPayrollModule = !isUnpaid && isAttendanceEnabled && hasPayrollSalarySection;

  // Initials helper
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  };

  return (
    <aside
      className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}
      role="navigation"
      aria-label="Main Sidebar Navigation"
    >
      <div className="brand-header">
        <span className="brand-logo" style={{ display: 'flex', alignItems: 'center', color: '#60a5fa' }}>
          <BrandLogo size={32} />
        </span>
        <div className="brand-details">
          <span className="brand-name">{companyName || 'CubeLogs'}</span>
          <span className="brand-tagline">Workforce Platform</span>
        </div>
      </div>

      <nav className="nav-menu">
        {/* Dashboard link */}
        {hasPermission('dashboard') && (
          <Link
            href="/dashboard"
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={handleNavLinkClick}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <DashboardIcon size={18} />
            </span>
            <span className="nav-text">Dashboard Overview</span>
          </Link>
        )}

        {/* Employee management link */}
        {!isUnpaid && hasPermission('admin:employees') && (
          <Link
            href="/admin/employees"
            className={`nav-link ${isActive('/admin/employees') ? 'active' : ''}`}
            onClick={handleNavLinkClick}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <EmployeesIcon size={18} />
            </span>
            <span className="nav-text">Manage Employees</span>
          </Link>
        )}

        {/* Settings Accordion Dropdown */}
        {showSettingsSection && (
          <div className="accordion-section">
            <button className="accordion-trigger" onClick={() => toggleSection('settings')}>
              <div className="accordion-trigger-left">
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="nav-text">Settings</span>
              </div>
              <span className="chevron" style={{ display: 'flex', alignItems: 'center' }}>
                <ChevronIcon direction={openSections.settings ? 'up' : 'down'} size={12} />
              </span>
            </button>

            <div className={`accordion-content ${openSections.settings ? 'open' : ''}`}>
              {hasSettingsTemplates && (
                <Link
                  href="/admin/settings?tab=templates"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'templates' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Role Templates</span>
                </Link>
              )}
              {hasSettingsLocations && (
                <Link
                  href="/admin/settings?tab=locations"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'locations' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Office Locations</span>
                </Link>
              )}
              {hasSettingsBranding && (
                <Link
                  href="/admin/settings?tab=branding"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'branding' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Branding</span>
                </Link>
              )}
              {hasSettingsBilling && (
                <Link
                  href="/admin/settings?tab=billing"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'billing' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Billing &amp; Subscription</span>
                </Link>
              )}
              {hasAttendanceConfig && (
                <Link
                  href="/admin/settings?tab=attendance-config"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'attendance-config' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Attendance Rules</span>
                </Link>
              )}
              {hasPayrollConfig && (
                <Link
                  href="/admin/settings?tab=payroll-config"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'payroll-config' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Payroll Settings</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs Link */}
        {!isUnpaid && hasPermission('audit_logs:view') && (
          <Link
            href="/audit-logs"
            className={`nav-link ${isActive('/audit-logs') ? 'active' : ''}`}
            onClick={handleNavLinkClick}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <AuditIcon size={18} />
            </span>
            <span className="nav-text">System Audit Logs</span>
          </Link>
        )}

        {/* ==========================================
            ATTENDANCE MANAGEMENT — Categorized Accordion
            Replaces the flat dynamic module accordion for the 'attendance' module.
            ========================================== */}
        {showAttendanceModule && (
          <div className="accordion-section">
            <button className="accordion-trigger" onClick={() => toggleSection('attendance')}>
              <div className="accordion-trigger-left">
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <AttendanceIcon size={18} />
                </span>
                <span className="nav-text">Attendance Management</span>
              </div>
              <span className="chevron" style={{ display: 'flex', alignItems: 'center' }}>
                <ChevronIcon direction={openSections.attendance ? 'up' : 'down'} size={12} />
              </span>
            </button>

            <div className={`accordion-content ${openSections.attendance ? 'open' : ''}`}>

              {/* ── ATTENDANCE category ── */}
              {hasAttendanceSection && (
                <div className="sidebar-nav-category">ATTENDANCE</div>
              )}
              {canViewAttendanceClocking && (
                <Link
                  href="/attendance"
                  className={`sub-nav-link ${isSubActive('/attendance') ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Attendance &amp; Clocking</span>
                </Link>
              )}
              {canViewMgmtPortal && (
                <Link
                  href="/attendance/management-portal"
                  className={`sub-nav-link ${pathname === '/attendance/management-portal' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Management Portal</span>
                </Link>
              )}

              {/* ── LEAVE & HOLIDAYS category ── */}
              {hasLeaveHolidaySection && (
                <div className="sidebar-nav-category">LEAVE &amp; HOLIDAYS</div>
              )}
              {canApplyLeave && (
                <Link
                  href="/attendance?tab=leaves-apply"
                  className={`sub-nav-link ${isSubActive('/attendance?tab=leaves-apply') ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Apply Leave</span>
                </Link>
              )}
              {canApproveLeave && (
                <Link
                  href="/attendance?tab=leaves-approve"
                  className={`sub-nav-link ${isSubActive('/attendance?tab=leaves-approve') ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Leave Approvals</span>
                </Link>
              )}
              {canManageLeaveTypes && (
                <Link
                  href="/attendance?tab=leaves-manage"
                  className={`sub-nav-link ${isSubActive('/attendance?tab=leaves-manage') ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Leave Types</span>
                </Link>
              )}
              {canViewHolidays && (
                <Link
                  href="/attendance?tab=holidays-view"
                  className={`sub-nav-link ${isSubActive('/attendance?tab=holidays-view') ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Holiday Calendar</span>
                </Link>
              )}

            </div>
          </div>
        )}

        {/* ==========================================
            PAYROLL & SALARY — Independent Accordion
            Kept distinct so Payroll remains available regardless of Attendance subscription.
            ========================================== */}
        {showPayrollModule && (
          <div className="accordion-section">
            <button className="accordion-trigger" onClick={() => toggleSection('payroll')}>
              <div className="accordion-trigger-left">
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <PayrollIcon size={18} />
                </span>
                <span className="nav-text">Payroll &amp; Salary</span>
              </div>
              <span className="chevron" style={{ display: 'flex', alignItems: 'center' }}>
                <ChevronIcon direction={openSections.payroll ? 'up' : 'down'} size={12} />
              </span>
            </button>

            <div className={`accordion-content ${openSections.payroll ? 'open' : ''}`}>
              {canViewPayroll && (
                <Link
                  href="/payroll"
                  className={`sub-nav-link ${pathname === '/payroll' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Monthly Payroll</span>
                </Link>
              )}
              {canViewSalaries && (
                <Link
                  href="/payroll/salaries"
                  className={`sub-nav-link ${pathname === '/payroll/salaries' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Salary Structures</span>
                </Link>
              )}
              {canViewSalaries && (
                <Link
                  href="/payroll/components"
                  className={`sub-nav-link ${pathname === '/payroll/components' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Salary Components</span>
                </Link>
              )}
              {canViewPayroll && (
                <Link
                  href="/payroll/payments"
                  className={`sub-nav-link ${pathname === '/payroll/payments' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Payroll Payments</span>
                </Link>
              )}
              {canViewPayslipsAdmin && (
                <Link
                  href="/payroll/payslips"
                  className={`sub-nav-link ${pathname === '/payroll/payslips' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Payslips</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* --- Other Dynamic Modules (Project Management, etc.) ---
            Skip the 'attendance' module since it's rendered above with custom categories. */}
        {permissionsRegistry?.modules?.map(module => {
          if (isUnpaid) return null;
          // Skip attendance — handled above with custom categories
          if (module.id === 'attendance') return null;

          // 1. Subscription Check
          const reqFlag = module.metadata.required_subscription_flag;
          const hasAddon = reqFlag
            ? (currentUser?.is_superuser ? true : (currentUser?.[reqFlag] !== false && currentUser?.subscription?.[reqFlag] !== false))
            : true;
          if (!hasAddon) return null;

          // 2. Access Check
          const allCaps = module.functional_capabilities || [];
          const hasAnyCapability = currentUser?.isSuperAdmin
            ? true
            : allCaps.some(cap => hasPermission(cap.id));
          if (!hasAnyCapability) return null;

          // 4. Nav filtering
          const navItems = module.navigation && module.navigation.length > 0
            ? module.navigation
            : (module.metadata.path
                ? [{ id: module.id, label: module.metadata.name, path: module.metadata.path }]
                : []);

          if (navItems.length === 0) return null;

          const visibleNavItems = navItems.filter(nav => {
            if (!nav.permission) return true;
            return currentUser?.isSuperAdmin || hasPermission(nav.permission);
          });

          if (visibleNavItems.length === 0) return null;

          // Single nav item → plain link
          if (visibleNavItems.length === 1) {
            const nav = visibleNavItems[0];
            return (
              <Link
                key={module.id}
                href={nav.path}
                className={`nav-link ${pathname === nav.path || pathname.startsWith(nav.path + '/') ? 'active' : ''}`}
                onClick={handleNavLinkClick}
              >
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  {iconMap[module.metadata.icon] || <AttendanceIcon size={18} />}
                </span>
                <span className="nav-text">{module.metadata.name}</span>
              </Link>
            );
          }

          return (
            <div key={module.id} className="accordion-section">
              <button className="accordion-trigger" onClick={() => toggleSection(module.id)}>
                <div className="accordion-trigger-left">
                  <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    {iconMap[module.metadata.icon] || <AttendanceIcon size={18} />}
                  </span>
                  <span className="nav-text">{module.metadata.name}</span>
                </div>
                <span className="chevron" style={{ display: 'flex', alignItems: 'center' }}>
                  <ChevronIcon direction={openSections[module.id] ? 'up' : 'down'} size={12} />
                </span>
              </button>

              <div className={`accordion-content ${openSections[module.id] ? 'open' : ''}`}>
                {visibleNavItems.map(nav => {
                  const [basePath, queryString] = nav.path.split('?');
                  let isNavActive = false;
                  if (queryString) {
                    const params = new URLSearchParams(queryString);
                    const navTab = params.get('tab');
                    isNavActive = pathname === basePath && activeTab === navTab;
                  } else {
                    isNavActive = (pathname === basePath || pathname.startsWith(basePath + '/')) && !activeTab;
                  }

                  return (
                    <Link
                      key={nav.id}
                      href={nav.path}
                      className={`sub-nav-link ${isNavActive ? 'active' : ''}`}
                      onClick={handleNavLinkClick}
                    >
                      <span className="dot"></span>
                      <span className="sub-nav-text">{nav.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Premium Profile Section at the bottom */}
      <div className="sidebar-profile-card">
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, textDecoration: 'none' }}>
          <div className="profile-details">
            <div className="avatar">
              {currentUser.profilePhoto ? (
                /* eslint-disable-next-line @next/next/no-img-element -- Dynamic profile photo */
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                />
              ) : (
                getInitials(currentUser.name)
              )}
            </div>
            <div className="info">
              <span className="name" title={currentUser.name} style={{ color: '#ffffff' }}>{currentUser.name}</span>
              <span className="role" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{currentUser.isSuperAdmin ? 'Super Admin' : currentUser.designation}</span>
            </div>
          </div>
        </Link>
        <button
          className="logout-icon-btn"
          onClick={handleLogout}
          title="Sign Out of Workspace"
          style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}
        >
          <LogoutIcon size={20} />
        </button>
      </div>

      <div className="sidebar-footer">
        <span className="ver">v1.3.0 (Premium Blue)</span>
      </div>
    </aside>
  );
});

export default Sidebar;
