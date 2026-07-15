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
  AuditIcon
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

  if (!currentUser) return null;

  // Helper to check if route is active
  const isActive = (path) => pathname === path;


  const isUnpaid = currentUser?.subscription?.subscriptionStatus === 'Unpaid' || currentUser?.subscription?.subscriptionStatus === 'Restricted';

  const hasSettingsTemplates = !isUnpaid && hasPermission('admin:templates');
  const hasSettingsLocations = !isUnpaid && hasPermission('locations:manage');
  const hasSettingsBranding = !isUnpaid && hasPermission('settings:branding');
  const hasSettingsBilling = hasPermission('settings:billing');
  const hasAttendanceConfig = !isUnpaid && hasPermission('attendance:management_portal');
  const showSettingsSection = hasSettingsTemplates || hasSettingsLocations || hasSettingsBranding || hasSettingsBilling || hasAttendanceConfig;

  // Initials helper
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  };

  return (
    <aside className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
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
                  <span className="sub-nav-text">Billing & Subscription</span>
                </Link>
              )}
              {hasAttendanceConfig && (
                <Link
                  href="/admin/settings?tab=attendance-config"
                  className={`sub-nav-link ${pathname === '/admin/settings' && activeTab === 'attendance-config' ? 'active' : ''}`}
                  onClick={handleNavLinkClick}
                >
                  <span className="dot"></span>
                  <span className="sub-nav-text">Attendance Rules Config</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs Link */}
        {!isUnpaid && (
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

        {/* --- Dropdown Modules (Accordions) dynamically populated --- */}
        {permissionsRegistry?.modules?.map(module => {
          if (isUnpaid) return null;
          // 1. Subscription Check (Is the module enabled for the whole organization?)
          const reqFlag = module.metadata.required_subscription_flag;
          const hasAddon = reqFlag 
            ? (currentUser?.[reqFlag] || currentUser?.subscription?.[reqFlag]) 
            : true;

          // If the organization hasn't enabled this module in the backoffice, hide it.
          if (!hasAddon) return null;

          // 2. Capabilities Check (Does THIS specific user have any permissions within it?)
          let userCapabilities = currentUser?.isSuperAdmin
            ? module.functional_capabilities
            : module.functional_capabilities.filter(cap => hasPermission(cap.id));


          // Attendance Management Portal ('attendance:management_portal') is visible in the sidebar navigation list

          if (userCapabilities.length === 0) return null;

          if (userCapabilities.length === 1) {
            const cap = userCapabilities[0];
            return (
              <Link 
                key={module.id}
                href={`${cap.path}${cap.tab ? `?tab=${cap.tab}` : ''}`}
                className={`nav-link ${pathname === cap.path ? 'active' : ''}`}
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
                {userCapabilities.map(cap => (
                  <Link 
                    key={cap.id}
                    href={`${cap.path}${cap.tab ? `?tab=${cap.tab}` : ''}`} 
                    className={`sub-nav-link ${pathname === cap.path && (cap.tab ? activeTab === cap.tab : (!activeTab || activeTab === '')) ? 'active' : ''}`}
                    onClick={handleNavLinkClick}
                  >
                    <span className="dot"></span>
                    <span className="sub-nav-text">{cap.label}</span>
                  </Link>
                ))}
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
