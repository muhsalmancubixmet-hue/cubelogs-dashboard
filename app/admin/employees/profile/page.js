'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { PERMISSION_FLAGS } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  EmployeesIcon, 
  BackIcon, 
  EditIcon, 
  DeleteIcon,
  DeclineIcon, 
  MailIcon, 
  PhoneIcon, 
  ShieldIcon, 
  TasksIcon, 
  LeavesIcon, 
  ClockIcon,
  CheckIcon,
  WarningIcon,
  SearchIcon,
  CloseIcon,
  CameraIcon
} from '@/components/Icons';

function EmployeeProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const empId = searchParams.get('id') || '';

  // Local states
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employeePhotos, setEmployeePhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Log State
  const [editingLog, setEditingLog] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [recentLogsSearchQuery, setRecentLogsSearchQuery] = useState('');

  // Profile photo upload ref (in-place)
  const photoInputRef = useRef(null);

  const isProjectEnabled = currentUser?.email === 'admin@cubelogs.com' || currentUser?.subscription?.is_project_enabled;

  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchProfileData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [
        userRes,
        employeesRes,
        tasksRes,
        leavesRes,
        attendanceRes,
        holidaysRes,
        schedulesRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/employees/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/tasks/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/leaves/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/attendance/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/holidays/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/schedules/`, { headers: getAuthHeaders() }),
      ]);

      const responses = [userRes, employeesRes, tasksRes, leavesRes, attendanceRes, holidaysRes, schedulesRes];
      for (const res of responses) {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'API request failed');
        }
      }

      const [userData, employeesData, tasksData, leavesData, attendanceData, holidaysData, schedulesData] = await Promise.all(
        responses.map(res => res.json())
      );

      const mappedUser = { ...userData, id: String(userData.id) };
      const mappedEmployees = employeesData.map(emp => ({ ...emp, id: String(emp.id) }));
      const mappedTasks = tasksData.map(t => ({ ...t, id: String(t.id), assignedTo: String(t.assignedTo) }));
      const mappedLeaves = leavesData.map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName
      }));
      const mappedAttendance = attendanceData.map(log => ({
        ...log,
        id: String(log.id),
        employeeId: String(log.employee)
      }));
      const mappedHolidays = holidaysData.map(h => ({ ...h, id: String(h.id) }));
      const mappedSchedules = schedulesData.map(s => ({ ...s, id: String(s.id) }));

      const photoMap = {};
      mappedEmployees.forEach(emp => {
        if (emp.profilePhoto) {
          photoMap[emp.id] = emp.profilePhoto;
        }
      });

      setCurrentUser(mappedUser);
      setEmployees(mappedEmployees);
      setTasks(mappedTasks);
      setLeaves(mappedLeaves);
      setAttendanceLogs(mappedAttendance);
      setHolidays(mappedHolidays);
      setSchedules(mappedSchedules);
      setEmployeePhotos(photoMap);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load employee profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cubelogs_access_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const activeUserStr = localStorage.getItem('cubelogs_active_user');
      if (activeUserStr) {
        try {
          const user = JSON.parse(activeUserStr);
          setCurrentUser({ ...user, id: String(user.id) });
        } catch (e) {
          console.warn('Failed to parse active user');
        }
      }
    }
    fetchProfileData();
  }, [empId]);

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };

  const localSaveEmployee = async (employee) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${employee.id}/`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(employee),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to update employee.');
      }

      const saved = await res.json();
      const mappedSaved = { ...saved, id: String(saved.id) };

      setEmployees(prev => prev.map(emp => emp.id === employee.id ? mappedSaved : emp));
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
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedSaved));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update employee.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employee) return;
    if (currentUser && currentUser.id === employee.id) {
      alert("You cannot delete your own profile.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${employee.id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to delete employee.');
      }

      router.push('/admin/employees');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete employee.');
      setLoading(false);
    }
  };

  const localAdjustAttendance = async (logId, changes) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${logId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to adjust attendance.');
      }

      const response = await res.json();
      const mappedLog = {
        ...response,
        id: String(response.id),
        employeeId: String(response.employee)
      };

      setAttendanceLogs(prev => prev.map(log => log.id === logId ? mappedLog : log));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to adjust attendance.');
    } finally {
      setLoading(false);
    }
  };

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
    if (!file || !employee) return;
    // Reset input immediately so the same file can be re-selected later
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      // Save the compressed photo via saveEmployee — keeps all other fields intact
      localSaveEmployee({
        ...employee,
        profilePhoto: compressed,
      });
    } catch {
      alert('Could not read the image file. Please try another.');
    }
  };

  // Modal ledger state
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('All'); // 'All', 'Present', 'Leave', 'Late', 'Absent'
  const [filterSearch, setFilterSearch] = useState('');

  // Find employee details
  const employee = employees.find(e => e.id === empId);

  if (loading) {
    return (
      <PageWrapper title="Employee Profile" requiredPermission="admin:employees">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading employee profile...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  if (!employee && !loading) {
    return (
      <PageWrapper title="Employee Profile" requiredPermission="admin:employees">
        <div className="panel alert-box alert-box-danger">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DeclineIcon size={20} style={{ color: 'var(--danger)' }} />
            <span>Profile Not Found</span>
          </h3>
          <p>The employee profile with ID <code>{empId}</code> could not be located on the system.</p>
          <div style={{ marginTop: '16px' }}>
            <Link href="/admin/employees" className="btn btn-primary">
              Return to Directory
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Calculate statistics
  const empTasks = tasks.filter(t => t.assignedTo === employee.id);
  const completedTasks = empTasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 0;

  const empLeaves = leaves.filter(l => l.employeeId === employee.id);
  const approvedLeavesCount = empLeaves.filter(l => l.status === 'Approved').length;

  const empLogs = attendanceLogs.filter(l => l.employeeId === employee.id);
  const totalClockIns = empLogs.length;

  // Get initials
  const initials = employee ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';

  // Employee designation schedule configuration
  const rolesList = (employee?.designation || '').split(',').map(r => r.trim()).filter(Boolean);
  const empSchedule = schedules?.find(s => rolesList.includes(s.designation)) || {
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

  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!editingLog) return;

    // Parse edit inputs back to ISO strings
    const clockInIso = editClockIn ? new Date(editClockIn).toISOString() : null;
    const clockOutIso = editClockOut ? new Date(editClockOut).toISOString() : null;

    localAdjustAttendance(editingLog.id, {
      clockIn: clockInIso,
      clockOut: clockOutIso
    });

    setEditingLog(null);
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

  // Recent logs sliced to 15
  const recentLogs = [...empLogs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15);

  // Generate 30 days of selected month calendar days
  const calendarDays = [];
  const daysInMonthCount = new Date(filterYear, filterMonth + 1, 0).getDate();
  for (let i = 0; i < daysInMonthCount; i++) {
    const dayNum = i + 1;
    const dateObj = new Date(filterYear, filterMonth, dayNum);
    const yearStr = dateObj.getFullYear();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    
    const log = empLogs.find(l => l.date === dateKey);
    const leave = empLeaves.find(l => dateKey >= l.startDate && dateKey <= l.endDate);
    const holiday = holidays.find(h => h.date === dateKey);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    calendarDays.push({
      dayNum,
      dateKey,
      weekday,
      dateObj,
      log,
      leave,
      holiday,
      isWeekend
    });
  }

  // Filtered calendar days for modal table
  const filteredDays = calendarDays.filter(day => {
    if (filterType === 'Present' && !day.log) return false;
    if (filterType === 'Leave' && !day.leave) return false;
    if (filterType === 'Late' && (!day.log || !isLate(day.log.clockIn))) return false;
    if (filterType === 'Absent') {
      if (day.log || day.leave || day.isWeekend || day.holiday) return false;
    }

    if (filterSearch) {
      const query = filterSearch.toLowerCase();
      const matchDate = day.dateKey.includes(query) || day.weekday.toLowerCase().includes(query);
      const matchLeave = day.leave ? (day.leave.leaveType.toLowerCase().includes(query) || day.leave.reason.toLowerCase().includes(query)) : false;
      const matchHoliday = day.holiday ? day.holiday.name.toLowerCase().includes(query) : false;
      const matchPunch = day.log ? (formatTimeStr(day.log.clockIn).toLowerCase().includes(query) || (day.log.clockOut ? formatTimeStr(day.log.clockOut).toLowerCase().includes(query) : 'active'.includes(query))) : false;
      
      return matchDate || matchLeave || matchHoliday || matchPunch;
    }

    return true;
  });

  // Calculate monthly ledger metrics
  const presentCount = calendarDays.filter(d => d.log).length;
  const leaveCount = calendarDays.filter(d => d.leave).length;
  const lateCount = calendarDays.filter(d => d.log && isLate(d.log.clockIn)).length;
  const absentCount = calendarDays.filter(d => !d.log && !d.leave && !d.isWeekend && !d.holiday).length;

  return (
    <PageWrapper title={`${employee.name}'s Profile`} requiredPermission="admin:employees">
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="profile-page-wrapper">
        
        {/* Navigation Action Row */}
        <div className="nav-row">
          <Link href="/admin/employees" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <BackIcon size={14} />
            <span>Back to Directory</span>
          </Link>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href={`/admin/employees/create?id=${employee.id}`} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <EditIcon size={14} />
              <span>Edit Credentials</span>
            </Link>
            <button 
              type="button" 
              className="btn btn-danger btn-sm" 
              onClick={handleDeleteEmployee} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <DeleteIcon size={14} />
              <span>Delete Employee</span>
            </button>
          </div>
        </div>

        {/* Profile Card details */}
        <div className="profile-layout-grid">
          
          {/* Card Left: Personal Info */}
          <div className="panel left-card">
            {/* Clickable avatar – hover reveals camera overlay for in-place photo upload */}
            <div
              className="avatar-large-wrapper"
              onClick={() => photoInputRef.current?.click()}
              title="Click to change profile photo"
            >
              <div className="avatar-large">
                {employeePhotos[employee.id] ? (
                  <img
                    src={employeePhotos[employee.id]}
                    alt={employee.name}
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
            <h2>{employee.name}</h2>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {(employee.designation || '').split(',').map(r => r.trim()).filter(Boolean).map(role => (
                <span key={role} className="badge badge-info designation-badge" style={{ margin: 0, color: '#ffffff' }}>{role}</span>
              ))}
              {!(employee.designation || '').trim() && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No designation registered</span>
              )}
            </div>

            <div className="contact-details-list">
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <MailIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Email Address</span>
                  <span className="val">{employee.email}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <PhoneIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Phone Number</span>
                  <span className="val">{employee.phone || 'No phone registered'}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <ShieldIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Security Type</span>
                  <span className="val">
                    {employee.isSuperAdmin 
                      ? 'System Administrator' 
                      : employee.useDefaultPermissions 
                        ? 'Template Defaults' 
                        : 'Custom Override Settings'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Right: Analytics & Permissions list */}
          <div className="right-panels-wrapper">
            
            {/* Stats Metrics row */}
            <div className="metrics-grid">
              {isProjectEnabled && (
                <div className="metric-card">
                  <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <TasksIcon size={24} />
                  </span>
                  <div className="metric-details">
                    <h4>Tasks Done</h4>
                    <p>{completedTasks} / {empTasks.length} <span className="percentage">({taskCompletionRate}%)</span></p>
                  </div>
                </div>
              )}
              <div className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <LeavesIcon size={24} />
                </span>
                <div className="metric-details">
                  <h4>Leaves Taken</h4>
                  <p>{approvedLeavesCount} Approved</p>
                </div>
              </div>
              <div className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <ClockIcon size={24} />
                </span>
                <div className="metric-details">
                  <h4>Total Days Work</h4>
                  <p>{totalClockIns} Days</p>
                </div>
              </div>
            </div>


            {/* List of Recent Tasks assigned */}
            {isProjectEnabled && (
              <div className="panel recent-tasks-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                    <span>Recent Assigned Project Tasks</span>
                  </h3>
                  <Link href={`/tasks?tab=directory&assignee=${employee.id}`} className="btn btn-secondary btn-sm">
                    View All
                  </Link>
                </div>
                <div className="task-scroller">
                  {empTasks.length === 0 ? (
                    <p className="no-tasks-text">No tasks assigned to this employee.</p>
                  ) : (
                    empTasks.map(t => (
                      <div className="task-row-item" key={t.id}>
                        <div className="left-info">
                          <strong>{t.title}</strong>
                          <span className="due-date">Due: {t.dueDate}</span>
                        </div>
                        <span className={`badge ${
                          t.status === 'Completed' ? 'badge-success' :
                          t.status === 'In Progress' ? 'badge-info' : 'badge-pending'
                        }`}>{t.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Daily Clock-In and Clock-Out Details Container */}
        <div className="panel daily-logs-container" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Daily Clock-In & Clock-Out Logs (Last 15 Records)</span>
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search date or time..."
                value={recentLogsSearchQuery}
                onChange={(e) => setRecentLogsSearchQuery(e.target.value)}
                style={{ width: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowMonthlyModal(true)}
              >
                View All
              </button>
            </div>
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
                  {hasPermission('attendance:admin') && <th>Actions / Override</th>}
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(log => !recentLogsSearchQuery || (log.date && log.date.includes(recentLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(recentLogsSearchQuery.toLowerCase()))).length === 0 ? (
                  <tr>
                    <td colSpan={hasPermission('attendance:admin') ? 6 : 5} className="no-tasks-text" style={{ padding: '30px 0', textAlign: 'center' }}>
                      No attendance logs recorded matching search.
                    </td>
                  </tr>
                ) : (
                  recentLogs.filter(log => !recentLogsSearchQuery || (log.date && log.date.includes(recentLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(recentLogsSearchQuery.toLowerCase()))).map(log => {
                    const wasLate = isLate(log.clockIn);
                    return (
                      <tr key={log.id}>
                        <td><strong>{log.date}</strong></td>
                        <td>
                          <span className="time-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            ↓ {formatTimeStr(log.clockIn)}
                          </span>
                        </td>
                        <td>
                          {log.clockOut ? (
                            <span className="time-out" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
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
                        {hasPermission('attendance:admin') && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingLog(log);
                                setEditClockIn(formatDateTimeLocal(log.clockIn));
                                setEditClockOut(log.clockOut ? formatDateTimeLocal(log.clockOut) : '');
                              }}
                            >
                              Edit / Override
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT / OVERRIDE PANEL FOR ADMINS */}
        {editingLog && hasPermission('attendance:admin') && (
          <div className="panel adjust-log-panel" style={{ marginTop: '24px', border: '1px solid var(--primary-border)', background: 'var(--primary-light)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <EditIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Override Clock Logs for {editingLog.date}</span>
            </h3>
            
            <form onSubmit={handleSaveOverride} className="adjust-log-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>Clock-In Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>Clock-Out Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    placeholder="Active shift (leave blank)"
                  />
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
                    Leave blank to keep the shift active (ticking).
                  </small>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Adjustments
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingLog(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FULL MONTH ATTENDANCE & LEAVE LEDGER MODAL OVERLAY */}
        {showMonthlyModal && (
          <div className="modal-overlay" onClick={() => setShowMonthlyModal(false)}>
            <div className="modal-content monthly-ledger-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowMonthlyModal(false)}>
                <CloseIcon size={24} />
              </button>
              
              <div className="modal-profile-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ClockIcon size={24} style={{ color: 'var(--primary)' }} />
                  <span>Attendance & Leave Ledger</span>
                </h2>
                <p style={{ marginTop: '4px', marginBottom: 0, color: 'var(--text-muted)' }}>
                  Monthly check-in records and applied leaves for <strong>{employee.name}</strong>
                </p>
              </div>

              {/* Modal Metrics Row */}
              <div className="modal-metrics-grid">
                <div className="mini-metric-box">
                  <span className="lbl">Present Days</span>
                  <span className="val" style={{ color: 'var(--success)' }}>{presentCount}</span>
                </div>
                <div className="mini-metric-box">
                  <span className="lbl">Leaves Taken</span>
                  <span className="val" style={{ color: 'var(--primary)' }}>{leaveCount}</span>
                </div>
                <div className="mini-metric-box">
                  <span className="lbl">Late Check-Ins</span>
                  <span className="val" style={{ color: 'var(--danger)' }}>{lateCount}</span>
                </div>
                <div className="mini-metric-box">
                  <span className="lbl">Unexcused Absences</span>
                  <span className="val" style={{ color: '#b91c1c' }}>{absentCount}</span>
                </div>
              </div>

              {/* Filters Row */}
              <div className="modal-filters-row">
                <div className="filter-group" style={{ flex: '1.5', minWidth: '180px' }}>
                  <label className="form-label">Search Ledger</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search logs/leaves/holidays..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                    />
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-light)' }}>
                      <SearchIcon size={14} />
                    </span>
                  </div>
                </div>

                <div className="filter-group" style={{ flex: '1', minWidth: '130px' }}>
                  <label className="form-label">Status Filter</label>
                  <select
                    className="form-input"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="All">All Records</option>
                    <option value="Present">Present Only</option>
                    <option value="Leave">On Leave Only</option>
                    <option value="Late">Late Check-Ins</option>
                    <option value="Absent">Absences Only</option>
                  </select>
                </div>

                <div className="filter-group" style={{ flex: '0.8', minWidth: '120px' }}>
                  <label className="form-label">Month</label>
                  <select
                    className="form-input"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group" style={{ flex: '0.8', minWidth: '100px' }}>
                  <label className="form-label">Year</label>
                  <select
                    className="form-input"
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setFilterSearch('');
                      setFilterType('All');
                      setFilterMonth(new Date().getMonth());
                      setFilterYear(new Date().getFullYear());
                    }}
                    style={{ height: '42px', padding: '0 16px' }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="ledger-table-container">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ background: 'var(--primary-light)' }}>Date</th>
                      <th style={{ background: 'var(--primary-light)' }}>Status</th>
                      <th style={{ background: 'var(--primary-light)' }}>Punch-In</th>
                      <th style={{ background: 'var(--primary-light)' }}>Punch-Out</th>
                      <th style={{ background: 'var(--primary-light)' }}>Hours</th>
                      <th style={{ background: 'var(--primary-light)' }}>Details / Leave Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDays.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
                          No records matched your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredDays.map(day => {
                        let statusBadge = null;
                        let punchInCell = '—';
                        let punchOutCell = '—';
                        let hoursCell = '—';
                        let detailsCell = '';

                        if (day.holiday) {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Holiday</span>;
                          detailsCell = `Corporate Observance: ${day.holiday.name}`;
                        } else if (day.leave) {
                          const isApproved = day.leave.status === 'Approved';
                          statusBadge = (
                            <span className={`badge ${isApproved ? 'badge-success' : 'badge-pending'}`}>
                              Leave ({day.leave.status})
                            </span>
                          );
                          detailsCell = `${day.leave.leaveType}${day.leave.dayType ? ` (${day.leave.dayType})` : ''} - "${day.leave.reason}"`;
                        } else if (day.log) {
                          const wasLate = isLate(day.log.clockIn);
                          statusBadge = wasLate ? (
                            <span className="badge badge-danger">Late Check-In</span>
                          ) : (
                            <span className="badge badge-success">Present</span>
                          );
                          punchInCell = formatTimeStr(day.log.clockIn);
                          punchOutCell = day.log.clockOut ? formatTimeStr(day.log.clockOut) : 'Active Shift';
                          hoursCell = day.log.clockOut ? formatDurationStr(day.log.totalDuration) : 'Ticking...';
                        } else if (day.isWeekend) {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>Weekend</span>;
                          detailsCell = 'Off Duty';
                        } else {
                          statusBadge = <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>Absent</span>;
                          detailsCell = 'No punch-in recorded';
                        }

                        return (
                          <tr key={day.dateKey} style={{
                            backgroundColor: day.isWeekend ? '#fafafa' : 'transparent'
                          }}>
                            <td><strong>{day.dateKey}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>({day.weekday})</span></td>
                            <td>{statusBadge}</td>
                            <td>{punchInCell}</td>
                            <td>{punchOutCell}</td>
                            <td>{hoursCell}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{detailsCell}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .profile-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nav-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .profile-layout-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          min-width: 0;
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

        /* Wrapper makes the avatar circle clickable for in-place photo upload */
        .avatar-large-wrapper {
          position: relative;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          cursor: pointer;
          margin-bottom: 18px;
          flex-shrink: 0;
        }

        .avatar-large-wrapper:hover .avatar-camera-overlay {
          opacity: 1;
        }

        .avatar-camera-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.52);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: white;
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .avatar-large {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          font-family: var(--font-heading);
          font-size: 2.2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
          overflow: hidden;
        }

        .left-card h2 {
          font-size: 1.45rem;
          margin-bottom: 4px;
        }

        .designation-badge {
          font-size: 0.85rem;
          padding: 6px 14px;
          margin-bottom: 24px;
        }

        .contact-details-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 18px;
          text-align: left;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .detail-item .icon {
          font-size: 1.25rem;
          opacity: 0.8;
        }

        .detail-item .text {
          display: flex;
          flex-direction: column;
        }

        .detail-item .label {
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .detail-item .val {
          font-size: 0.9rem;
          color: var(--text-main);
          font-weight: 500;
          word-break: break-all;
        }

        .right-panels-wrapper {
          flex: 2;
          min-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 16px;
        }

        .percentage {
          font-size: 0.78rem;
          color: var(--text-light);
          font-weight: normal;
        }

        /* Permissions Check lists */
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .permission-indicator-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          border: 1px solid var(--border);
        }

        .permission-indicator-item.allowed {
          background-color: var(--success-light);
          border-color: var(--primary-border);
          color: var(--primary);
        }

        .permission-indicator-item.allowed .state-badge {
          background-color: var(--primary);
          color: white;
        }

        .permission-indicator-item.denied {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          color: var(--text-light);
          opacity: 0.7;
        }

        .permission-indicator-item.denied .state-badge {
          background-color: var(--text-light);
          color: white;
        }

        .state-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        /* Recent Tasks */
        .task-scroller {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
        }

        .task-row-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background-color: #f8fafc;
        }

        .task-row-item .left-info {
          display: flex;
          flex-direction: column;
        }

        .task-row-item strong {
          font-size: 0.9rem;
        }

        .task-row-item .due-date {
          font-size: 0.75rem;
          color: var(--text-light);
        }

        .no-tasks-text {
          font-size: 0.85rem;
          color: var(--text-light);
          text-align: center;
          padding: 20px 0;
        }

        /* Monthly ledger modal overrides & style additions */
        .monthly-ledger-modal {
          max-width: 960px !important;
          width: 95% !important;
          padding: 32px !important;
        }

        .modal-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .mini-metric-box {
          background-color: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: var(--radius-md);
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mini-metric-box .lbl {
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .mini-metric-box .val {
          font-family: var(--font-heading);
          font-size: 1.45rem;
          font-weight: 850;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background-color: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-premium);
          position: relative;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-light);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: var(--radius-sm);
        }

        .modal-close-btn:hover {
          color: var(--text-main);
          background-color: var(--primary-light);
        }

        .modal-profile-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .modal-filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          padding: 20px;
          background: var(--primary-light);
          border-radius: var(--radius-md);
          border: 1px solid var(--primary-border);
          margin-bottom: 24px;
        }

        .ledger-table-container {
          overflow: auto;
          max-height: 400px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        @media (max-width: 768px) {
          .profile-layout-grid {
            flex-direction: column;
            gap: 20px;
          }
          .left-card, .right-panels-wrapper {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .modal-filters-row {
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }
          .modal-filters-row .filter-group {
            width: 100%;
            min-width: 0 !important;
            margin-bottom: 0;
          }
          .modal-filters-row .btn {
            width: 100%;
            justify-content: center;
          }
          .monthly-ledger-modal {
            padding: 16px !important;
            width: 95% !important;
          }
          .modal-metrics-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .nav-row {
            flex-direction: column;
            gap: 10px;
          }
          .nav-row .btn {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .modal-metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PageWrapper>
  );
}

export default function EmployeeProfile() {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="spinner"></div>
        <span className="loading-text">Loading Employee File...</span>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            font-family: var(--font-sans);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--primary-border);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          .loading-text {
            color: var(--primary-dark);
            font-weight: 600;
            font-size: 1.1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <EmployeeProfileContent />
    </Suspense>
  );
}
