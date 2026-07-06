'use client';

import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '@/components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { API_BASE_URL } from '@/lib/api';
import { 
  EmployeesIcon, 
  LeavesIcon, 
  TasksIcon, 
  HolidaysIcon, 
  ClockIcon, 
  CheckIcon, 
  DeclineIcon, 
  BrandLogo,
  WarningIcon
} from '@/components/Icons';
import HolidaySlider from '@/components/HolidaySlider';
import LeaveStatusBadge from '@/components/LeaveStatusBadge';
import DashboardCalendar from '@/components/DashboardCalendar';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser: globalCurrentUser } = useApp();

  // Local state for dashboard data
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search filter
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');

  // Live local system clock state
  const [currentTime, setCurrentTime] = useState(null);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const hasPermission = (permissionName) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permissionName);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    let userObj = currentUser;
    if (!userObj && typeof window !== 'undefined') {
      const activeUserStr = localStorage.getItem('cubelogs_active_user');
      if (activeUserStr) {
        try {
          userObj = JSON.parse(activeUserStr);
        } catch (e) {}
      }
    }

    const checkPerm = (permName) => {
      if (!userObj) return false;
      if (userObj.isSuperAdmin) return true;
      return userObj.permissions && userObj.permissions.includes(permName);
    };

    const headers = getAuthHeaders();

    try {
      // Fetch user profile first to ensure fresh session details
      const userRes = await fetch(`${API_BASE_URL}/auth/me/`, { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        userObj = { ...userData, id: String(userData.id) };
        setCurrentUser(userObj);
      }
    } catch (e) {
      console.warn('Failed to refresh user profile', e);
    }

    try {
      const orgId = userObj?.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';

      const fetchTasks = fetch(`${API_BASE_URL}/tasks/${orgQuery}`, { headers }).then(r => r.ok ? r.json() : []);
      const fetchLeaves = fetch(`${API_BASE_URL}/leaves/${orgQuery}`, { headers }).then(r => r.ok ? r.json() : []);
      const fetchHolidays = fetch(`${API_BASE_URL}/holidays/`, { headers }).then(r => r.ok ? r.json() : []);
      
      const hasEmployeesPerm = checkPerm('admin:employees') || checkPerm('attendance:admin');
      const fetchEmployees = hasEmployeesPerm
        ? fetch(`${API_BASE_URL}/employees/${orgQuery}`, { headers }).then(r => r.ok ? r.json() : [])
        : Promise.resolve([]);

      const hasAttendancePerm = checkPerm('attendance:admin') || checkPerm('attendance:staff');
      const fetchAttendance = hasAttendancePerm
        ? fetch(`${API_BASE_URL}/attendance/${orgQuery}`, { headers }).then(r => r.ok ? r.json() : [])
        : Promise.resolve([]);

      const [tasksData, leavesData, holidaysData, employeesData, attendanceData] = await Promise.all([
        fetchTasks,
        fetchLeaves,
        fetchHolidays,
        fetchEmployees,
        fetchAttendance
      ]);

      const mappedEmployees = employeesData.map(emp => ({ ...emp, id: String(emp.id) }));
      const mappedAttendance = attendanceData.map(log => ({
        ...log,
        id: String(log.id),
        employeeId: String(log.employee)
      }));
      const mappedTasks = tasksData.map(t => ({
        ...t,
        id: String(t.id),
        assignedTo: String(t.assignedTo)
      }));
      const mappedLeaves = leavesData.map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName
      }));
      const mappedHolidays = holidaysData.map(h => ({ ...h, id: String(h.id) }));

      setEmployees(mappedEmployees);
      setAttendanceLogs(mappedAttendance);
      setTasks(mappedTasks);
      setLeaves(mappedLeaves);
      setHolidays(mappedHolidays);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (employeeId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/clock-out/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ employeeId: parseInt(employeeId) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to clock out');
      }
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cubelogs_access_token');
      if (!token) {
        router.push('/login');
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
    fetchDashboardData();
  }, []);

  const handleRowClick = (empId) => {
    router.push(`/admin/employees/profile?id=${empId}`);
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatLocalTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Live active user's clock status
  const [activeLog, setActiveLog] = useState(null);
  const [workSeconds, setWorkSeconds] = useState(0);
  const timerRef = useRef(null);

  // Sync active logs & calculate elapsed times
  useEffect(() => {
    if (!currentUser) return;
    
    // Find today's active log for this employee
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = attendanceLogs.find(
      l => l.employeeId === currentUser.id && l.date === today && !l.clockOut
    );
    
    setActiveLog(log || null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (log) {
      // Setup live ticking timer
      timerRef.current = setInterval(() => {
        const now = new Date();
        const inTime = new Date(log.clockIn);
        
        // Calculate total net work seconds
        let totalElapsedMs = now - inTime;
        const netWorkSecs = Math.max(0, Math.floor(totalElapsedMs / 1000));
        setWorkSeconds(netWorkSecs);
      }, 1000);
    } else {
      setWorkSeconds(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attendanceLogs, currentUser]);

  // Format seconds to hh:mm:ss
  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Gather Admin Metrics
  const totalEmployees = employees.length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const openTasks = tasks.filter(t => t.status !== 'Completed').length;
  const upcomingHolidaysCount = holidays.length;

  // Check if current user is admin/hr (or has permission to see global attendance)
  const isAdminView = currentUser?.isSuperAdmin || hasPermission('attendance:admin');

  const isProjectEnabled = currentUser?.subscription?.is_project_enabled || currentUser?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.subscription?.is_attendance_enabled || currentUser?.is_attendance_enabled;

  // Quick Navigation Permission Flags
  const canOnboard = hasPermission('admin:employees');
  const canManageTemplates = hasPermission('admin:templates');
  const canAssignTasks = isProjectEnabled && hasPermission('tasks:create');
  const canApproveLeaves = hasPermission('leaves:approve');
  const showQuickNavigation = canOnboard || canManageTemplates || canAssignTasks || canApproveLeaves;

  // Filter staff objects
  const myTasks = tasks.filter(t => t.assignedTo === currentUser?.id);
  const myLeaves = leaves.filter(l => l.employeeId === currentUser?.id);

  // Sort and display the 3 most recent leaves
  const displayLeaves = isAdminView 
    ? [...leaves].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 3)
    : [...myLeaves].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 3);

  // Status flags
  const isClockedIn = !!activeLog;

  if (loading && !currentUser) {
    return (
      <PageWrapper title="Dashboard Analytics" requiredPermission="dashboard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Syncing platform analytics...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  return (
    <PageWrapper title="Dashboard Analytics" requiredPermission="dashboard">
      
      {/* Pending Payment Alert */}

      {/* Expired Subscription Alert */}
      {(globalCurrentUser || currentUser)?.subscription?.subscriptionStatus === 'Expired' && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', marginBottom: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WarningIcon size={20} style={{ color: 'var(--danger)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700' }}>Workspace Renewal Required</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your subscription has expired and auto-renewal failed due to insufficient wallet funds. Please top up or renew immediately to avoid service interruption.</span>
            </div>
          </div>
          {currentUser?.isSuperAdmin && (
            <Link href="/admin/settings?tab=billing" className="btn btn-danger btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Renew Subscription
            </Link>
          )}
        </div>
      )}

      {error && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <WarningIcon size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.88rem' }}>{error}</span>
        </div>
      )}
      
      {/* 1. Metrics Grid */}
      <div className="metrics-grid">
        {isAdminView ? (
          <>
            <Link href="/admin/employees" className="metric-card">
              <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><EmployeesIcon size={24} /></span>
              <div className="metric-details">
                <h4>Total Staff</h4>
                <p>{totalEmployees}</p>
              </div>
            </Link>
            {isAttendanceEnabled && (
              <Link href="/leaves?tab=approve" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><LeavesIcon size={24} /></span>
                <div className="metric-details">
                  <h4>Pending Leaves</h4>
                  <p style={{ color: pendingLeaves > 0 ? 'var(--primary)' : 'inherit' }}>{pendingLeaves}</p>
                </div>
              </Link>
            )}
            {isProjectEnabled && (
              <Link href="/tasks?tab=add" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><TasksIcon size={24} /></span>
                <div className="metric-details">
                  <h4>Open Tasks</h4>
                  <p>{openTasks}</p>
                </div>
              </Link>
            )}
            {isAttendanceEnabled && (
              <Link href="/holidays?tab=manage" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><HolidaysIcon size={24} /></span>
                <div className="metric-details">
                  <h4>Scheduled Holidays</h4>
                  <p>{upcomingHolidaysCount}</p>
                </div>
              </Link>
            )}
          </>
        ) : (
          <>
            {isAttendanceEnabled && (
              <Link href="/attendance" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><ClockIcon size={24} /></span>
                <div className="metric-details">
                  <h4>Today's Work</h4>
                  <p>{formatTime(workSeconds)}</p>
                </div>
              </Link>
            )}
            {isProjectEnabled && (
              <Link href="/tasks?tab=my" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><TasksIcon size={24} /></span>
                <div className="metric-details">
                  <h4>My Active Tasks</h4>
                  <p>{myTasks.filter(t => t.status !== 'Completed').length}</p>
                </div>
              </Link>
            )}
            {isAttendanceEnabled && (
              <Link href="/leaves?tab=apply" className="metric-card">
                <span className="metric-icon" style={{ display: 'flex', alignItems: 'center' }}><LeavesIcon size={24} /></span>
                <div className="metric-details">
                  <h4>Applied Leaves</h4>
                  <p>{myLeaves.length}</p>
                </div>
              </Link>
            )}
          </>
        )}
      </div>

      {/* 2. Primary Control Row (Attendance Punch Clock & Visual Calendar) */}
      <div className="dashboard-row" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div className="dashboard-control-col-left" style={{ display: 'flex', flexDirection: 'column' }}>
          {isAttendanceEnabled && hasPermission('attendance:staff') && (
            <div className="panel clocking-card-panel" style={{ marginBottom: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
                <span>Attendance Control Center</span>
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '5px 0 20px', width: '100%' }}>
                Register shifts live.
              </p>

              <div className="realtime-clock-display">
                <ClockIcon size={16} />
                <span>Live System Time:</span>
                <span className="clock-time-val">
                  {formatLocalTime(currentTime) || 'Loading...'}
                </span>
              </div>

              {/* Clock timers */}
              {isClockedIn ? (
                <div className="timer-display-group">
                  <div className="timer-circle work-active">
                    <span className="timer-label">Work Session</span>
                    <span className="timer-val">{formatTime(workSeconds)}</span>
                  </div>
                </div>
              ) : (
                <div className="timer-display-group">
                  <div className="timer-circle inactive">
                    <span className="timer-label">Shift Inactive</span>
                    <span className="timer-val">00:00:00</span>
                  </div>
                </div>
              )}

              <div className="clock-actions-row" style={{ marginTop: 'auto', paddingTop: '20px' }}>
                {!isClockedIn ? (
                  <button className="btn btn-primary btn-lg full-width" onClick={() => router.push('/attendance?triggerClockIn=true')}>
                    Clock In
                  </button>
                ) : (
                  <button className="btn btn-danger full-width" onClick={() => handleClockOut(currentUser.id)}>
                    Clock Out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="dashboard-control-col-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <DashboardCalendar holidays={holidays} />
        </div>
      </div>

      {/* 3. Secondary Summary Row (Tasks & Leave Requests Summary) */}
      <div className="dashboard-row">
        {/* Left Column: Tasks Summary & Holiday Slider */}
        <div className="col-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isProjectEnabled && (
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>My Task Objectives</span>
                </h3>
                <Link href="/tasks" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  View All
                </Link>
              </div>

              <div className="task-summary-list" style={{ marginTop: '15px' }}>
                {myTasks.length === 0 ? (
                  <p className="no-data-text">You have no tasks assigned currently.</p>
                ) : (
                  myTasks.slice(0, 3).map(t => (
                    <div className="task-summary-card" key={t.id}>
                      <div className="task-sum-title">
                        <strong>{t.title}</strong>
                        <span className={`badge ${t.status === 'Completed' ? 'badge-success' : t.status === 'In Progress' ? 'badge-info' : 'badge-pending'}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="task-sum-desc">{t.description}</p>
                      <span className="task-sum-date">Due: {t.dueDate}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {isAttendanceEnabled && <HolidaySlider />}
        </div>

        {/* Right Column: Recent Leave Requests Summary & Quick Navigation Panel */}
        <div className="col-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>


          {/* Recent Leave Requests Summary */}
          {isAttendanceEnabled && (
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LeavesIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>{isAdminView ? 'Recent Leave Activity' : 'My Leave Requests'}</span>
                </h3>
                <Link href="/leaves" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  View All
                </Link>
              </div>

              <div className="leave-summary-list" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayLeaves.length === 0 ? (
                  <p className="no-data-text">{isAdminView ? 'No leave activity recorded.' : 'You have no leave requests filed.'}</p>
                ) : (
                  displayLeaves.map(l => {
                    const empName = isAdminView ? (employees.find(e => e.id === l.employeeId)?.name || 'Unknown Staff') : null;
                    return (
                      <div className="leave-summary-card" key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', transition: 'var(--transition-fast)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {isAdminView && <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{empName}</strong>}
                          <span style={{ fontSize: '0.85rem', color: isAdminView ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: isAdminView ? 'normal' : '600' }}>
                            {l.leaveType} ({l.dayType})
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                            {l.startDate === l.endDate ? l.startDate : `${l.startDate} to ${l.endDate}`}
                          </span>
                        </div>
                        <LeaveStatusBadge status={l.status} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Actions Shortcuts (Permission-Based) */}
          {showQuickNavigation && (
            <div className="panel text-center justify-center" style={{ marginBottom: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <BrandLogo size={20} style={{ color: 'var(--primary)' }} />
                <span>Quick Navigation Panel</span>
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '8px 0 20px' }}>
                Jump to management centers:
              </p>
              <div className="quick-actions-list">
                {canOnboard && (
                  <Link href="/admin/employees" className="btn btn-primary full-width">
                    Onboard Employees
                  </Link>
                )}
                {canManageTemplates && (
                  <Link href="/admin/templates" className="btn btn-secondary full-width">
                    Permission Matrices
                  </Link>
                )}
                {canAssignTasks && (
                  <Link href="/tasks?tab=add" className="btn btn-secondary full-width">
                    Assign System Tasks
                  </Link>
                )}
                {isAttendanceEnabled && canApproveLeaves && (
                  <Link href="/leaves?tab=approve" className="btn btn-secondary full-width">
                    Approve Leave Requests
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Global Attendance Monitor Dashboard Section */}
      {isAttendanceEnabled && hasPermission('attendance:admin') && (
        <div className="dashboard-row admin-only-row" style={{ marginTop: '24px' }}>
          {/* Global Attendance Status Grid */}
          <div className="panel col-12" style={{ marginBottom: 0 }}>
            <div className="panel-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
                <span>Real-time Global Attendance Monitor</span>
              </h3>
              <Link href="/attendance" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                Manage Attendance
              </Link>
            </div>

            {/* Interactive Search Bar */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search employees by name or role..."
                value={dashboardSearchQuery}
                onChange={(e) => setDashboardSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>
            
            <div className="table-container" style={{ marginTop: '15px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th>Today's Clock-in</th>
                    <th>Status Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(emp => {
                      if (!dashboardSearchQuery) return true;
                      const term = dashboardSearchQuery.toLowerCase();
                      const matchName = emp.name && emp.name.toLowerCase().includes(term);
                      const matchRole = emp.designation && emp.designation.toLowerCase().includes(term);
                      return matchName || matchRole;
                    })
                    .map(emp => {
                    const d = new Date();
                    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const log = attendanceLogs.find(l => l.employeeId === emp.id && l.date === today);
                    const isWorking = log && !log.clockOut;

                    return (
                      <tr key={emp.id} onClick={() => handleRowClick(emp.id)}>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.isSuperAdmin ? 'Super Admin' : emp.designation}</td>
                        <td>{log ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>
                          {isWorking ? (
                            <span className="status-dot online"></span>
                          ) : (
                            <span className="status-dot offline"></span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(a.metric-card) {
          color: inherit !important;
          text-decoration: none !important;
        }
        :global(a.metric-card:hover) {
          color: inherit !important;
        }
        :global(.data-table tbody tr) {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        :global(.data-table tbody tr:hover) {
          background-color: rgba(37, 99, 235, 0.05);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-row {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .col-12 { width: 100%; }
        .col-8 { flex: 2; min-width: 350px; }
        .col-6 { flex: 1 1 350px; }
        .col-4 { flex: 1; min-width: 280px; }
        .dashboard-control-col-left { flex: 1; min-width: 320px; }
        .dashboard-control-col-right { flex: 1.5; min-width: 350px; }

        .realtime-clock-display {
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          color: var(--primary);
          padding: 12px 24px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
        }

        .clock-time-val {
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        /* Real-time status dot */
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.online {
          background-color: var(--primary);
          box-shadow: 0 0 8px var(--primary);
        }
        .status-dot.offline {
          background-color: var(--text-light);
        }

        /* Quick actions styling */
        .quick-actions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .full-width {
          width: 100%;
        }

        /* Clock timers styling */
        .clocking-card-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .timer-display-group {
          margin: 20px 0 30px;
        }

        .timer-circle {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 6px solid var(--border);
          box-shadow: var(--shadow-md);
          transition: var(--transition-normal);
        }

        .timer-circle.work-active {
          border-color: var(--primary);
          animation: pulseActiveWork 2s infinite;
        }



        .timer-circle.inactive {
          border-color: var(--border);
        }

        .timer-label {
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .timer-val {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-main);
          margin-top: 4px;
        }

        .clock-actions-row {
          display: flex;
          gap: 12px;
          width: 100%;
          justify-content: center;
        }

        /* Task summary card */
        .task-summary-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-summary-card {
          background-color: var(--bg-app);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
          transition: var(--transition-fast);
        }

        .task-summary-card:hover {
          border-color: var(--primary-border);
          transform: translateX(2px);
        }

        .task-sum-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.92rem;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .task-sum-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .task-sum-date {
          font-size: 0.72rem;
          color: var(--text-light);
        }

        .no-data-text {
          font-size: 0.88rem;
          color: var(--text-light);
          text-align: center;
          padding: 24px 0;
        }

        @media (max-width: 768px) {
          .col-8, .col-6, .col-4, .dashboard-control-col-left, .dashboard-control-col-right {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: 1 1 100% !important;
            box-sizing: border-box !important;
          }
          .dashboard-row {
            gap: 16px;
          }
          .timer-circle {
            width: 140px;
            height: 140px;
          }
          .timer-val {
            font-size: 1.4rem;
          }
          .clock-actions-row {
            flex-direction: column;
            gap: 8px;
          }
          .clock-actions-row .btn {
            width: 100%;
          }
          .realtime-clock-display {
            padding: 8px 16px !important;
            font-size: 0.82rem !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
    </PageWrapper>
  );
}
