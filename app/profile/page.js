'use client';

import React, { useState, useRef } from 'react';
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
  CameraIcon
} from '@/components/Icons';

export default function PersonalProfile() {
  const { 
    currentUser, 
    tasks, 
    leaves, 
    attendanceLogs, 
    schedules, 
    employeePhotos, 
    saveEmployee, 
    showAlert 
  } = useApp();

  const isProjectEnabled = currentUser?.email === 'admin@cubelogs.com' || currentUser?.subscription?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.email === 'admin@cubelogs.com' || currentUser?.subscription?.is_attendance_enabled;

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
      // Save the compressed photo via saveEmployee
      // Note: saveEmployee takes numeric or string fields, we map current info
      await saveEmployee({
        ...currentUser,
        profilePhoto: compressed,
      });
      showAlert('Profile picture updated successfully!', 'Success', 'success');
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
  const empSchedule = schedules?.find(s => s.designation === currentUser.designation) || {
    shiftStart: "09:00",
    shiftEnd: "17:00"
  };

  const isLate = (clockInIso) => {
    if (!clockInIso) return false;
    const d = new Date(clockInIso);
    const inMin = d.getHours() * 60 + d.getMinutes();
    const [startH, startM] = empSchedule.shiftStart.split(':').map(Number);
    return inMin > (startH * 60 + startM);
  };

  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDurationStr = (secs) => {
    if (!secs) return '—';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Recent logs sliced to 10
  const recentLogs = [...empLogs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

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
                {employeePhotos[currentUser.id] ? (
                  <img
                    src={employeePhotos[currentUser.id]}
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

            <div style={{ marginTop: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Link 
                href="/profile/change-password" 
                className="btn btn-secondary btn-sm" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%',
                  textDecoration: 'none',
                  padding: '8px 16px',
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

            {/* Configure Page Access Flags Checklist */}
            <div className="panel permissions-summary-panel">
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldIcon size={20} style={{ color: 'var(--primary)' }} />
                <span>Configure Page Access Flags</span>
              </h3>
              <div className="permissions-checklist-matrix locked">
                {visiblePermissionFlags.map(flag => {
                  const isChecked = currentUser.isSuperAdmin || (currentUser.permissions && currentUser.permissions.includes(flag.id));
                  return (
                    <div 
                      className={`matrix-item ${isChecked ? 'active' : 'disabled'}`}
                      key={flag.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={isChecked}
                        readOnly
                        disabled
                      />
                      <span style={{ fontSize: '0.85rem', color: isChecked ? 'var(--text-main)' : '#94a3b8' }}>{flag.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Daily Clock-In and Clock-Out Details Container */}
        <div className="panel daily-logs-container" style={{ marginTop: '24px' }}>
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

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock-In Time</th>
                  <th>Clock-Out Time</th>
                  <th>Net Work Duration</th>
                  <th>Compliance Status</th>
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
                        <td>{log.clockOut ? formatDurationStr(log.totalDuration) : 'Ticking...'}</td>
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

      </div>

      <style jsx>{`
        .profile-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .profile-layout-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          width: 100%;
        }

        .left-card {
          flex: 1;
          min-width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 24px;
          text-align: center;
          height: fit-content;
        }

        .avatar-large-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          cursor: pointer;
          margin-bottom: 18px;
        }

        .avatar-large-wrapper:hover .avatar-camera-overlay {
          opacity: 1;
        }

        .avatar-large {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 2.2rem;
          font-family: var(--font-heading);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
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
          font-size: 1.45rem;
          margin-bottom: 6px;
        }

        .designation-badge {
          margin-bottom: 24px;
          font-size: 0.82rem;
          padding: 4px 12px;
        }

        .contact-details-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .detail-item .text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .detail-item .label {
          font-size: 0.75rem;
          color: var(--text-light);
          font-weight: 500;
        }

        .detail-item .val {
          font-size: 0.88rem;
          font-weight: 600;
          word-break: break-all;
        }

        .right-panels-wrapper {
          flex: 2;
          min-width: 350px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
        }

        .metric-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background-color: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-details h4 {
          font-size: 0.75rem;
          color: var(--text-light);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .metric-details p {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .percentage {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-light);
        }

        .permissions-checklist-matrix {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .permissions-checklist-matrix.locked .matrix-item.disabled {
          opacity: 0.5;
          background-color: #f8fafc;
        }

        .permissions-checklist-matrix.locked .matrix-item.active {
          background-color: var(--primary-light);
          border-color: var(--primary-border);
        }
      `}</style>
    </PageWrapper>
  );
}
