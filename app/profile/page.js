'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp, PERMISSION_FLAGS } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import Link from 'next/link';
import { 
  EditIcon, 
  MailIcon, 
  PhoneIcon, 
  ShieldIcon, 
  TasksIcon, 
  LeavesIcon, 
  ClockIcon,
  CheckIcon,
  WarningIcon,
  CameraIcon,
  ReceiptIcon,
  DownloadIcon,
  SearchIcon,
  CloseIcon,
  ChevronRightIcon,
} from '@/components/Icons';
import PayslipModal from '@/components/PayslipModal';
import { apiFetch, getApiBaseUrl, normalizeListResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

export default function PersonalProfile() {
  const { 
    currentUser, 
    showAlert 
  } = useApp();

  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payslips Self-Service states
  const [myPayslips, setMyPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(true);
  const [payslipError, setPayslipError] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [downloadingPayslipId, setDownloadingPayslipId] = useState(null);

  const fetchMyPayslips = async () => {
    try {
      setPayslipsLoading(true);
      setPayslipError('');
      const data = await apiFetch('/payroll/my-payslips/');
      setMyPayslips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load payslips:', err);
      setPayslipError(err.message || 'Failed to load your payslips.');
    } finally {
      setPayslipsLoading(false);
    }
  };

  const handleViewPayslip = async (payslip) => {
    try {
      const detail = await apiFetch(`/payroll/my-payslips/${payslip.id}/`);
      setSelectedPayslip(detail);
      setIsPayslipModalOpen(true);
    } catch (err) {
      console.error('Failed to load payslip detail:', err);
      showAlert?.('Failed to open payslip details.', 'error');
    }
  };

  const handleDownloadPdf = async (payslip) => {
    const psId = typeof payslip === 'number' || typeof payslip === 'string' ? payslip : (payslip?.id || payslip?.payslip_id);
    if (!psId) {
      showAlert?.('No issued payslip is available.', 'error');
      return;
    }
    try {
      setDownloadingPayslipId(psId);
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? (localStorage.getItem('cubelogs_access_token') || localStorage.getItem('access_token')) : null;
      const res = await fetch(`${baseUrl}/payroll/my-payslips/${psId}/pdf/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${payslip?.payslip_number || psId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      showAlert?.(err.message || 'Failed to download payslip PDF.', 'error');
    } finally {
      setDownloadingPayslipId(null);
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [tasksResult, leavesResult, attendanceResult, schedulesResult] = await Promise.allSettled([
          apiFetch('/project-tasks/'),
          apiFetch('/leaves/'),
          apiFetch('/attendance/'),
          apiFetch('/schedules/')
        ]);

        if (tasksResult.status === 'fulfilled' && tasksResult.value) {
          const tasksData = normalizeListResponse(tasksResult.value);
          setTasks(tasksData.map(t => ({ ...t, id: String(t.id), assignedTo: String(t.assignedTo || t.assigned_to || '') })));
        }

        if (leavesResult.status === 'fulfilled' && leavesResult.value) {
          const leavesData = normalizeListResponse(leavesResult.value);
          setLeaves(leavesData.map(l => ({ ...l, id: String(l.id), employeeId: String(l.employee), leaveTypeId: String(l.leaveType), leaveType: l.leaveTypeName })));
        }

        if (attendanceResult.status === 'fulfilled' && attendanceResult.value) {
          const attendanceData = normalizeListResponse(attendanceResult.value);
          setAttendanceLogs(attendanceData.map(log => ({ ...log, id: String(log.id), employeeId: String(log.employee) })));
        }

        if (schedulesResult.status === 'fulfilled' && schedulesResult.value) {
          const schedulesData = normalizeListResponse(schedulesResult.value);
          setSchedules(schedulesData.map(s => ({ ...s, id: String(s.id) })));
        }
      } catch (err) {
        console.error('Failed to load supplemental profile data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
    fetchMyPayslips();
  }, []);

  const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_attendance_enabled;

  const visiblePermissionFlags = PERMISSION_FLAGS.filter(flag => {
    if (!isProjectEnabled && (flag.id === 'tasks:create' || flag.id === 'tasks:view')) {
      return false;
    }
    if (!isAttendanceEnabled && (
      flag.id === 'attendance:staff' ||
      flag.id === 'attendance:admin' ||
      flag.id === 'leaves:apply' ||
      flag.id === 'leaves:approve' ||
      flag.id === 'leaves:manage' ||
      flag.id === 'holidays:manage' ||
      flag.id === 'holidays:view' ||
      flag.id === 'locations:manage'
    )) {
      return false;
    }
    return true;
  });

  const [isAccessFlagsModalOpen, setIsAccessFlagsModalOpen] = useState(false);
  const [permissionSearchQuery, setPermissionSearchQuery] = useState('');

  const activePermissions = visiblePermissionFlags.filter(
    flag => currentUser?.isSuperAdmin || (currentUser?.permissions && currentUser.permissions.includes(flag.id))
  );

  const filteredPermissionFlags = visiblePermissionFlags.filter(flag => {
    if (!permissionSearchQuery.trim()) return true;
    const q = permissionSearchQuery.toLowerCase();
    return flag.label.toLowerCase().includes(q) || flag.id.toLowerCase().includes(q);
  });

  const photoInputRef = useRef(null);
  const [myLogsSearchQuery, setMyLogsSearchQuery] = useState('');

  // Compress image to a small JPEG thumbnail before storing (avoids localStorage quota issues)
  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      const response = await apiFetch(`/employees/${currentUser.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          ...currentUser,
          profilePhoto: compressed,
        }),
      });
      const updatedUser = { ...currentUser, profilePhoto: response.profilePhoto };
      localStorage.setItem('cubelogs_active_user', JSON.stringify(updatedUser));
      showAlert('Profile picture updated successfully!', 'Success', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showAlert('Could not update profile picture. Please try again.', 'Upload Failed', 'error');
    }
  };

  if (!currentUser) return null;

  // Calculate statistics for current user
  const empTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  const completedTasks = empTasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 0;

  const empLeaves = leaves.filter(l => l.employeeId === currentUser.id);
  const approvedLeavesCount = empLeaves.filter(l => l.status === 'Approved').length;

  const empLogs = attendanceLogs.filter(l => l.employeeId === currentUser.id);
  const totalClockIns = empLogs.length;

  // Get initials
  const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  // Current user schedule configuration
  const foundSchedule = schedules?.find(s => s.designation === currentUser?.designation);
  const empSchedule = {
    shiftStart: foundSchedule?.shiftStart || foundSchedule?.shift_start || "09:00",
    shiftEnd: foundSchedule?.shiftEnd || foundSchedule?.shift_end || "17:00"
  };

  const isLate = (clockInIso) => {
    if (!clockInIso) return false;
    const shiftStart = empSchedule?.shiftStart || "09:00";
    if (typeof shiftStart !== 'string' || !shiftStart.includes(':')) return false;
    const d = new Date(clockInIso);
    if (isNaN(d.getTime())) return false;
    const inMin = d.getHours() * 60 + d.getMinutes();
    const parts = shiftStart.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
    return inMin > (parts[0] * 60 + parts[1]);
  };

  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDurationStr = (logOrSecs, clockIn, clockOut) => {
    let seconds = null;
    if (typeof logOrSecs === 'number' && !isNaN(logOrSecs) && logOrSecs > 0) {
      seconds = logOrSecs;
    } else if (typeof logOrSecs === 'object' && logOrSecs !== null) {
      const log = logOrSecs;
      if (typeof log.totalDuration === 'number' && !isNaN(log.totalDuration) && log.totalDuration > 0) {
        seconds = log.totalDuration;
      } else if (typeof log.worked_minutes === 'number' && !isNaN(log.worked_minutes) && log.worked_minutes > 0) {
        seconds = log.worked_minutes * 60;
      } else if (typeof log.duration_minutes === 'number' && !isNaN(log.duration_minutes) && log.duration_minutes > 0) {
        seconds = log.duration_minutes * 60;
      } else if (log.clockIn && log.clockOut) {
        const inTime = new Date(log.clockIn).getTime();
        const outTime = new Date(log.clockOut).getTime();
        if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
          seconds = (outTime - inTime) / 1000;
        }
      }
    } else if (typeof logOrSecs === 'string') {
      const parsedNum = Number(logOrSecs);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        seconds = parsedNum;
      }
    }

    if ((seconds === null || isNaN(seconds) || seconds <= 0) && clockIn && clockOut) {
      const inTime = new Date(clockIn).getTime();
      const outTime = new Date(clockOut).getTime();
      if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
        seconds = (outTime - inTime) / 1000;
      }
    }

    if (seconds === null || isNaN(seconds) || seconds <= 0) {
      return '—';
    }

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Recent logs
  const recentLogs = [...empLogs]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <PageWrapper title="My Personal Profile" requiredPermission="dashboard">
      <div className="profile-page-wrapper">
        
        <div className="profile-layout-grid">
          
          {/* Left Panel: Avatar and Personal Info */}
          <div className="panel left-card">
            <div
              className="avatar-large-wrapper"
              onClick={() => photoInputRef.current?.click()}
              title="Click to change profile photo"
            >
              <div className="avatar-large">
                {currentUser.profilePhoto ? (
                  <img
                    src={currentUser.profilePhoto}
                    alt={currentUser.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="avatar-camera-overlay">
                <CameraIcon size={22} />
                <span>Change Photo</span>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleProfilePhotoChange}
              />
            </div>
            <h2>{currentUser.name}</h2>
            <span className="badge badge-info designation-badge">{currentUser.designation || 'Staff'}</span>

            <div className="contact-details-list">
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <MailIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Email Address</span>
                  <span className="val">{currentUser.email}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <PhoneIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Phone Number</span>
                  <span className="val">{currentUser.phone || 'No phone registered'}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <ShieldIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Security Type</span>
                  <span className="val">
                    {currentUser.isSuperAdmin 
                      ? 'System Administrator' 
                      : currentUser.useDefaultPermissions 
                        ? 'Template Defaults' 
                        : 'Custom Override Settings'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Link 
                href="/profile/change-password" 
                className="btn btn-secondary btn-sm" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%',
                  textDecoration: 'none',
                  padding: '7px 16px',
                  fontWeight: '600'
                }}
              >
                Change Password
              </Link>
            </div>
          </div>

          {/* Right Panel: Statistics and Workspace Access */}
          <div className="right-panels-wrapper">
            
            {/* Stats Metrics Row */}
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <TasksIcon size={24} />
                </span>
                <div className="metric-details">
                  <h4>Tasks Completed</h4>
                  <p>{completedTasks} / {empTasks.length} <span className="percentage">({taskCompletionRate}%)</span></p>
                </div>
              </div>
              <div className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <LeavesIcon size={24} />
                </span>
                <div className="metric-details">
                  <h4>Leaves Approved</h4>
                  <p>{approvedLeavesCount} Days</p>
                </div>
              </div>
              <div className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <ClockIcon size={24} />
                </span>
                <div className="metric-details">
                  <h4>Days Clocked In</h4>
                  <p>{totalClockIns} Days</p>
                </div>
              </div>
            </div>

            {/* Configure Page Access Flags Card */}
            <div className="panel permissions-summary-panel">
              <div className="permissions-summary-content">
                <div className="permissions-summary-header">
                  <div className="permissions-icon-badge">
                    <ShieldIcon size={20} />
                  </div>
                  <div className="permissions-summary-text">
                    <h3>Configure Page Access Flags</h3>
                    <p className="permissions-summary-desc">
                      Review security clearance, assigned roles, and module access permissions configured for your account.
                    </p>
                  </div>
                </div>

                {/* Preview Chips of Active Permissions that fit in the card */}
                {!isAccessFlagsModalOpen && (
                  <div className="permissions-preview-chips">
                    {activePermissions.slice(0, 7).map(flag => (
                      <span key={flag.id} className="permission-chip">
                        <span className="chip-check">✓</span>
                        <span>{flag.label}</span>
                      </span>
                    ))}
                    {activePermissions.length > 7 && (
                      <button
                        type="button"
                        className="permission-chip more-chip"
                        onClick={() => {
                          setPermissionSearchQuery('');
                          setIsAccessFlagsModalOpen(true);
                        }}
                        title="Click to view all permissions"
                      >
                        +{activePermissions.length - 7} more...
                      </button>
                    )}
                    {activePermissions.length === 0 && (
                      <span className="no-permissions-text">No active page access permissions assigned.</span>
                    )}
                  </div>
                )}

                <div className="permissions-summary-footer">
                  <div className="permissions-status-pill">
                    <span className="status-dot" />
                    <span>
                      {currentUser?.isSuperAdmin 
                        ? 'All permissions active (Super Admin)' 
                        : `${activePermissions.length} of ${visiblePermissionFlags.length} permissions active`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary permissions-configure-btn"
                    onClick={() => {
                      setPermissionSearchQuery('');
                      setIsAccessFlagsModalOpen(true);
                    }}
                  >
                    <ShieldIcon size={15} />
                    <span>Configure Page Access Flags</span>
                    <ChevronRightIcon size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal: Configure Page Access Flags */}
            {isAccessFlagsModalOpen && (
              <div 
                className="modal-overlay" 
                onClick={() => setIsAccessFlagsModalOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px'
                }}
              >
                <div 
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'var(--surface, #ffffff)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid var(--border, #e2e8f0)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Modal Header */}
                  <div 
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-app, #f8fafc)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldIcon size={20} style={{ color: 'var(--primary, #2563eb)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
                        Configure Page Access Flags
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAccessFlagsModalOpen(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted, #64748b)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px'
                      }}
                      aria-label="Close modal"
                    >
                      <CloseIcon size={18} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border, #e2e8f0)', background: 'var(--surface, #ffffff)' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <SearchIcon 
                        size={16} 
                        style={{ 
                          position: 'absolute', 
                          left: '12px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--text-muted, #94a3b8)',
                          pointerEvents: 'none'
                        }} 
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search permissions by name..."
                        value={permissionSearchQuery}
                        onChange={(e) => setPermissionSearchQuery(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          paddingLeft: '36px',
                          paddingRight: permissionSearchQuery ? '32px' : '12px',
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          fontSize: '0.86rem',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border, #cbd5e1)',
                          boxSizing: 'border-box'
                        }}
                      />
                      {permissionSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPermissionSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted, #94a3b8)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          aria-label="Clear search"
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Permission List */}
                  <div 
                    style={{ 
                      padding: '18px 20px', 
                      overflowY: 'auto', 
                      flex: 1,
                      maxHeight: 'calc(85vh - 170px)'
                    }}
                  >
                    {filteredPermissionFlags.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted, #64748b)' }}>
                        <SearchIcon size={26} style={{ opacity: 0.35, margin: '0 auto 8px', display: 'block' }} />
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '500' }}>
                          No permissions found matching &ldquo;{permissionSearchQuery}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="permissions-checklist-matrix locked">
                        {filteredPermissionFlags.map(flag => {
                          const isChecked = currentUser?.isSuperAdmin || (currentUser?.permissions && currentUser.permissions.includes(flag.id));
                          return (
                            <div 
                              className={`matrix-item ${isChecked ? 'active' : 'disabled'}`}
                              key={flag.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '10px 14px', 
                                borderRadius: 'var(--radius-sm, 6px)', 
                                border: '1px solid var(--border, #e2e8f0)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={isChecked}
                                readOnly
                                disabled
                              />
                              <span style={{ fontSize: '0.85rem', color: isChecked ? 'var(--text-main, #0f172a)' : '#94a3b8' }}>
                                {flag.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div 
                    style={{
                      padding: '12px 20px',
                      borderTop: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-app, #f8fafc)',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted, #64748b)'
                    }}
                  >
                    <span>
                      Showing {filteredPermissionFlags.length} of {visiblePermissionFlags.length} permissions
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsAccessFlagsModalOpen(false)}
                      style={{ padding: '6px 16px', fontWeight: '600' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Daily Clock-In and Clock-Out Details Container */}
        <div className="panel daily-logs-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>My Attendance & Shift Logs (Last 10 Records)</span>
            </h3>
            <input
              type="text"
              className="form-input"
              placeholder="Search date or time..."
              value={myLogsSearchQuery}
              onChange={(e) => setMyLogsSearchQuery(e.target.value)}
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div
            className="table-container"
            style={{
              maxHeight: 'clamp(360px, 48vh, 480px)',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              position: 'relative',
              scrollbarWidth: 'thin'
            }}
          >
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#ffffff' }}>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Clock-In Time</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Clock-Out Time</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Net Work Duration</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Compliance Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(log => !myLogsSearchQuery || (log.date && log.date.includes(myLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(myLogsSearchQuery.toLowerCase()))).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-tasks-text" style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8' }}>
                      No attendance logs recorded matching search.
                    </td>
                  </tr>
                ) : (
                  recentLogs.filter(log => !myLogsSearchQuery || (log.date && log.date.includes(myLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(myLogsSearchQuery.toLowerCase()))).map(log => {
                    const wasLate = isLate(log.clockIn);
                    return (
                      <tr key={log.id}>
                        <td><strong>{log.date}</strong></td>
                        <td>
                          <span className="time-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500', color: 'var(--success)' }}>
                            ↓ {formatTimeStr(log.clockIn)}
                          </span>
                        </td>
                        <td>
                          {log.clockOut ? (
                            <span className="time-out" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500', color: 'var(--primary)' }}>
                              ↑ {formatTimeStr(log.clockOut)}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Active Shift</span>
                          )}
                        </td>
                        <td>{log.clockOut ? formatDurationStr(log, log.clockIn, log.clockOut) : 'Ticking...'}</td>
                        <td>
                          {wasLate ? (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <ClockIcon size={12} />
                              <span>Late check-in</span>
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckIcon size={12} />
                              <span>On-time</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Payslips & Compensation Records Panel */}
        <div className="panel payslips-container" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReceiptIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>My Payslips & Compensation Records</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Official monthly salary payslips issued by your organization
            </span>
          </div>

          {payslipsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--primary)', fontWeight: '600' }}>
              Loading your issued payslips...
            </div>
          ) : payslipError ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 10px 0' }}>{payslipError}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchMyPayslips}>Retry</button>
            </div>
          ) : myPayslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              <ReceiptIcon size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5, display: 'block' }} />
              <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-main)' }}>No issued payslips available yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Once monthly payroll is finalized by HR, your official payslips will appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 14px' }}>Payroll Period</th>
                    <th style={{ padding: '12px 14px' }}>Payslip Number</th>
                    <th style={{ padding: '12px 14px' }}>Net Salary</th>
                    <th style={{ padding: '12px 14px' }}>Payment Status</th>
                    <th style={{ padding: '12px 14px' }}>Issued Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myPayslips.map((ps) => (
                    <tr key={ps.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {ps.month_name}
                      </td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {ps.payslip_number}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '800', color: '#166534' }}>
                        {formatCurrency(ps.net_payable, ps.currency)}
                      </td>
                      <td style={{ padding: '14px' }}>
                        {ps.payment_status === 'Paid' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            border: '1px solid #86efac'
                          }}>
                            ✓ Paid
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                          }}>
                            ● Unpaid
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {ps.issued_at ? new Date(ps.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewPayslip(ps)}
                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleDownloadPdf(ps)}
                            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            disabled={downloadingPayslipId === ps.id}
                          >
                            <DownloadIcon size={14} />
                            <span>{downloadingPayslipId === ps.id ? '...' : 'PDF'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* PAYSLIP PREVIEW MODAL */}
      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        payslipData={selectedPayslip}
        onDownloadPdf={handleDownloadPdf}
        isDownloading={downloadingPayslipId === selectedPayslip?.id}
      />

      <style jsx>{`
        .profile-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .profile-layout-grid {
          display: flex;
          gap: 20px;
          align-items: stretch;
          width: 100%;
        }

        .left-card {
          flex: 0 0 310px;
          min-width: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 22px 20px;
          text-align: center;
          box-sizing: border-box;
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .avatar-large-wrapper {
          position: relative;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          cursor: pointer;
          margin-bottom: 12px;
        }

        .avatar-large-wrapper:hover .avatar-camera-overlay {
          opacity: 1;
        }

        .avatar-large {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.85rem;
          font-family: var(--font-heading);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.22);
          border: 3px solid white;
          overflow: hidden;
        }

        .avatar-camera-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          opacity: 0;
          transition: var(--transition-fast);
        }

        .left-card h2 {
          font-size: 1.28rem;
          margin-bottom: 4px;
        }

        .designation-badge {
          margin-bottom: 16px;
          font-size: 0.8rem;
          padding: 3px 12px;
        }

        .contact-details-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
          flex: 1;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .detail-item .text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .detail-item .label {
          font-size: 0.72rem;
          color: var(--text-light);
          font-weight: 500;
        }

        .detail-item .val {
          font-size: 0.85rem;
          font-weight: 600;
          word-break: break-all;
        }

        .right-panels-wrapper {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .metric-card {
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
        }

        .metric-icon {
          width: 38px;
          height: 38px;
          min-width: 38px;
          border-radius: var(--radius-md);
          background-color: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-details h4 {
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .metric-details p {
          font-size: 1.15rem;
          font-weight: 700;
          margin: 0;
        }

        .percentage {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-light);
        }

        .permissions-summary-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px 22px;
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .permissions-summary-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          gap: 14px;
        }

        .permissions-summary-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .permissions-icon-badge {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 8px;
          background: var(--primary-light, #eff6ff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary, #2563eb);
          border: 1px solid rgba(37, 99, 235, 0.15);
        }

        .permissions-summary-text h3 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 700;
          color: var(--text-main, #0f172a);
        }

        .permissions-summary-desc {
          margin: 4px 0 0;
          font-size: 0.82rem;
          color: var(--text-light, #64748b);
          line-height: 1.45;
        }

        .permissions-preview-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          padding: 2px 0;
        }

        .permission-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.77rem;
          font-weight: 600;
          color: var(--text-main, #1e293b);
          line-height: 1.2;
          white-space: nowrap;
        }

        .permission-chip .chip-check {
          color: #10b981;
          font-weight: 800;
          font-size: 0.76rem;
        }

        .permission-chip.more-chip {
          background: var(--primary-light, #eff6ff);
          border: 1px dashed var(--primary, #3b82f6);
          color: var(--primary, #2563eb);
          cursor: pointer;
          font-weight: 700;
          transition: all 0.15s ease;
        }

        .permission-chip.more-chip:hover {
          background: #dbeafe;
          border-color: #2563eb;
        }

        .no-permissions-text {
          font-size: 0.8rem;
          color: var(--text-muted, #94a3b8);
          font-style: italic;
        }

        .permissions-summary-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid var(--border-light, #f1f5f9);
        }

        .permissions-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-main, #334155);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
        }

        .permissions-configure-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 0.84rem;
          font-weight: 600;
          border-radius: var(--radius-sm, 6px);
          cursor: pointer;
        }

        .permissions-checklist-matrix {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 10px 14px;
          align-items: center;
        }

        .matrix-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .permissions-checklist-matrix.locked .matrix-item.disabled {
          opacity: 0.5;
          background-color: #f8fafc;
        }

        .permissions-checklist-matrix.locked .matrix-item.active {
          background-color: var(--primary-light);
          border-color: var(--primary-border);
        }

        @media (max-width: 992px) {
          .profile-layout-grid {
            flex-direction: column;
          }
          .left-card {
            flex: none;
            width: 100%;
          }
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .permissions-checklist-matrix {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .matrix-item {
            white-space: normal;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .permissions-summary-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .permissions-configure-btn {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .permissions-checklist-matrix {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PageWrapper>
  );
}
