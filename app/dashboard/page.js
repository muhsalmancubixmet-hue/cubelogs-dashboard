'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { projectService } from '@/lib/services/projectService';
import {
  EmployeesIcon,
  LeavesIcon,
  TasksIcon,
  HolidaysIcon,
  ClockIcon,
  CheckIcon,
  DeclineIcon,
  BrandLogo,
  WarningIcon,
  CloseIcon
} from '@/components/Icons';
import HolidaySlider from '@/components/HolidaySlider';
import LeaveStatusBadge from '@/components/LeaveStatusBadge';
import DashboardCalendar from '@/components/DashboardCalendar';
import AdminProjectDashboard from '@/components/dashboard/AdminProjectDashboard';
import TeamMemberProjectDashboard from '@/components/dashboard/TeamMemberProjectDashboard';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, authStatus, permissionsRegistry } = useApp();

  // Local state for dashboard data
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search filter
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');

  // Live local system clock state
  const [currentTime, setCurrentTime] = useState(null);

  const hasPermission = (permissionName) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permissionName);
  };

  // ── Inline Clock-In Modal ────────────────────────────────────────────────────
  const [ciModal, setCiModal] = useState(false);       // modal open
  const [ciStep, setCiStep] = useState('checking');    // 'checking' | 'success' | 'failed' | 'camera'
  const [ciError, setCiError] = useState('');
  const [ciLocation, setCiLocation] = useState(null);
  const [ciDistance, setCiDistance] = useState(null);
  const [ciClosest, setCiClosest] = useState(null);
  const [ciPhoto, setCiPhoto] = useState(null);
  const [ciStream, setCiStream] = useState(null);
  const [ciFacing, setCiFacing] = useState('user');
  const [ciSubmitting, setCiSubmitting] = useState(false);
  const [officeLocations, setOfficeLocations] = useState([]);
  const ciVideoRef = useRef(null);
  const ciLockRef = useRef(false);

  // Attach camera stream to <video> element whenever ciStream changes
  useEffect(() => {
    if (ciVideoRef.current && ciStream) {
      ciVideoRef.current.srcObject = ciStream;
      ciVideoRef.current.play().catch(() => { });
    }
  }, [ciStream]);

  // Clean up stream when modal closes
  useEffect(() => {
    if (!ciModal) {
      ciStream?.getTracks().forEach(t => t.stop());
      setCiStream(null);
    }
  }, [ciModal, ciStream]);

  const ciHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371000, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const ciGetCoords = (ms = 8000) => new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res,
      () => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: ms }),
      { enableHighAccuracy: true, timeout: ms }
    )
  );

  const ciStopCamera = () => {
    setCiStream(prev => { prev?.getTracks().forEach(t => t.stop()); return null; });
  };

  const ciStartCamera = async (mode = ciFacing) => {
    ciStopCamera();
    setCiSubmitting(true);
    setCiError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: mode } },
        audio: false
      });
      setCiStream(stream); // useEffect above will attach it to the video element
    } catch {
      setCiError('Camera access denied. Please allow camera permissions and try again.');
    } finally {
      setCiSubmitting(false);
    }
  };

  const ciCapturePhoto = () => {
    const vid = ciVideoRef.current;
    if (!vid || vid.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 640;
    canvas.height = vid.videoHeight || 480;
    canvas.getContext('2d').drawImage(vid, 0, 0);
    const photo = canvas.toDataURL('image/jpeg', 0.85);
    setCiPhoto(photo);
    return photo;
  };

  const ciApiClockIn = async (verificationData) => {
    if (ciLockRef.current) return { success: false };
    ciLockRef.current = true;
    try {
      const responseLog = await apiFetch('/attendance/clock-in/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(currentUser.id), verificationData }),
      });
      setAttendanceLogs(prev => [
        { ...responseLog, id: String(responseLog.id), employeeId: String(responseLog.employee) },
        ...prev
      ]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Clock-in failed.' };
    } finally {
      setTimeout(() => { ciLockRef.current = false; }, 1500);
    }
  };

  const ciPunchWithPhoto = async () => {
    setCiSubmitting(true);
    setCiError('');
    try {
      const photo = ciPhoto || ciCapturePhoto();
      if (!photo) throw new Error('No photo captured. Make sure the camera is active.');
      const result = await ciApiClockIn({
        photo,
        coords: ciLocation
          ? { lat: ciLocation.lat, lon: ciLocation.lon, distance: ciDistance, locationName: ciClosest?.name || 'Office' }
          : { lat: 0, lon: 0, distance: 9999, locationName: 'Unknown' }
      });
      if (result.success) { ciStopCamera(); setCiStep('success'); }
      else setCiError(result.error || 'Clock-in failed.');
    } catch (err) {
      setCiError(err.message);
    } finally {
      setCiSubmitting(false);
    }
  };

  const handleDashboardClockIn = async () => {
    setCiModal(true);
    setCiStep('checking');
    setCiError('');
    setCiLocation(null);
    setCiDistance(null);
    setCiClosest(null);
    setCiPhoto(null);

    if (!navigator.geolocation) {
      setCiError('Geolocation is not supported by your browser.');
      setCiStep('failed');
      return;
    }

    try {
      const pos = await ciGetCoords();
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      let minDist = Infinity, closest = null, inFence = false;

      if (officeLocations.length > 0) {
        officeLocations.forEach(loc => {
          const d = ciHaversine(lat, lon, loc.lat, loc.lon);
          if (d < minDist) { minDist = d; closest = loc; }
          if (d <= loc.radius) inFence = true;
        });
      } else {
        inFence = true; // No geofence configured → allow
      }

      setCiLocation({ lat, lon });
      setCiDistance(minDist < Infinity ? minDist : null);
      setCiClosest(closest);

      if (inFence) {
        const result = await ciApiClockIn({
          photo: null,
          coords: { lat, lon, distance: minDist < Infinity ? minDist : 0, locationName: closest?.name || 'Remote/Direct' }
        });
        if (result.success) setCiStep('success');
        else { setCiError(result.error || 'Clock-in failed.'); setCiStep('failed'); }
      } else {
        setCiError(`Outside geofence. Nearest office: ${closest?.name || 'Office'} (${minDist.toFixed(0)}m away, limit ${closest?.radius || 100}m).`);
        setCiStep('failed');
      }
    } catch (err) {
      const code = err.code;
      setCiError(
        code === 1 ? 'Location access denied. Please enable it in browser settings.' :
          code === 2 ? 'Location unavailable. Check your GPS/network.' :
            code === 3 ? 'Location timed out. Check your connection and try again.' :
              `Location error: ${err.message}`
      );
      setCiStep('failed');
    }
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    const userObj = currentUser;
    if (!userObj) {
      setLoading(false);
      return;
    }

    const checkPerm = (permName) => {
      if (userObj.isSuperAdmin) return true;
      return userObj.permissions && userObj.permissions.includes(permName);
    };

    try {
      const orgId = userObj?.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';

      const catchUnlessAuthError = (err) => {
        const msg = err.message || '';
        const isAuthError = msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Credentials') || msg.includes('Authentication') || msg.includes('PermissionDenied');
        if (isAuthError) {
          throw err;
        }
        return [];
      };

      const getArrayData = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
      };

      const fetchTasks = userObj?.id
        ? projectService.getEmployeeAssignments(userObj.id).then(d => d.tasks || []).catch(() => [])
        : Promise.resolve([]);
      const fetchLeaves = apiFetch(`/leaves/${orgQuery}`).catch(catchUnlessAuthError);
      const fetchHolidays = apiFetch('/holidays/').catch(catchUnlessAuthError);

      const hasEmployeesPerm = checkPerm('admin:employees') || checkPerm('attendance:admin');
      const fetchEmployees = hasEmployeesPerm
        ? apiFetch(`/employees/${orgQuery}`).catch(catchUnlessAuthError)
        : Promise.resolve([]);

      const hasAttendancePerm = checkPerm('attendance:admin') || checkPerm('attendance:staff');
      const fetchAttendance = hasAttendancePerm
        ? apiFetch(`/attendance/${orgQuery}`).catch(catchUnlessAuthError)
        : Promise.resolve([]);

      const fetchProjects = (checkPerm('projects:view') || checkPerm('projects:create') || userObj.isSuperAdmin)
        ? projectService.getProjects().catch(() => [])
        : Promise.resolve([]);
      const isProjEnabled = userObj?.subscription?.is_project_enabled || userObj?.is_project_enabled;
      const fetchStatuses = isProjEnabled
        ? projectService.getProjectStatuses().catch(() => [])
        : Promise.resolve([]);

      const [tasksData, leavesData, holidaysData, employeesData, attendanceData, projectsData, statusesData] = await Promise.all([
        fetchTasks,
        fetchLeaves,
        fetchHolidays,
        fetchEmployees,
        fetchAttendance,
        fetchProjects,
        fetchStatuses
      ]);

      const mappedEmployees = getArrayData(employeesData).map(emp => ({ ...emp, id: String(emp.id) }));
      const mappedAttendance = getArrayData(attendanceData).map(log => ({
        ...log,
        id: String(log.id),
        employeeId: String(log.employee)
      }));
      const mappedTasks = getArrayData(tasksData).map(t => ({
        ...t,
        id: String(t.id),
        assignedTo: String(t.assignedTo)
      }));
      const mappedLeaves = getArrayData(leavesData).map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName
      }));
      const mappedHolidays = getArrayData(holidaysData).map(h => ({ ...h, id: String(h.id) }));

      setEmployees(mappedEmployees);
      setAttendanceLogs(mappedAttendance);
      setTasks(mappedTasks);
      setLeaves(mappedLeaves);
      setHolidays(mappedHolidays);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleClockOut = async (employeeId) => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/attendance/clock-out/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId) }),
      });
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchDashboardData();
      apiFetch('/locations/').then(d => {
        const list = Array.isArray(d) ? d : (d?.results || []);
        setOfficeLocations(list.map(l => ({ ...l, id: String(l.id) })));
      }).catch(() => { });
    }
  }, [authStatus, fetchDashboardData]);

  const handleRowClick = (empId) => {
    router.push(`/admin/employees/profile?id=${empId}`);
  };

  const handleTaskStatusChange = async (taskId, statusId) => {
    try {
      await projectService.updateProjectTaskStatus(taskId, statusId);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleLogHoursSubmit = async (task, hours) => {
    try {
      const currentLogged = Number(task.logged_hours || 0);
      const additional = Number(hours) || 0;
      await projectService.updateTask(task.id, { logged_hours: currentLogged + additional });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to log hours:', err);
    }
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
  const upcomingHolidaysCount = holidays.filter(h => !h.name || !h.name.includes('Weekly Off')).length;

  // Check if current user is admin/hr (or has permission to see global attendance)
  const isAdminView = currentUser?.isSuperAdmin || hasPermission('attendance:admin');

  const isProjectEnabled = currentUser?.subscription?.is_project_enabled || currentUser?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.subscription?.is_attendance_enabled || currentUser?.is_attendance_enabled;

  // Quick Navigation Permission Flags
  const canOnboard = hasPermission('admin:employees');
  const canManageTemplates = hasPermission('admin:templates');
  const canAssignTasks = isProjectEnabled && (hasPermission('projects:create') || hasPermission('project_tasks:create'));
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

  const isUnpaid = currentUser?.subscription?.subscriptionStatus === 'Unpaid' || currentUser?.subscription?.subscriptionStatus === 'Restricted';

  if (isUnpaid) {
    return (
      <PageWrapper title="Billing Action Required" requiredPermission="dashboard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '600px',
          margin: '40px auto',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            marginBottom: '24px'
          }}>
            <WarningIcon size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
            Workspace Restricted
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px', maxWidth: '460px' }}>
            Access to all dashboard modules and workspace tools is temporarily disabled because of an unpaid monthly invoice. Please update your payment status to restore full access.
          </p>
          <Link href="/admin/settings?tab=billing" className="btn btn-danger btn-lg" style={{ textDecoration: 'none', padding: '12px 32px', fontWeight: '600' }}>
            Go to Billing & Payments
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Dashboard Analytics" requiredPermission="dashboard">

      {/* Pending Payment Alert */}

      {/* Expired Subscription Alert */}
      {currentUser?.subscription?.subscriptionStatus === 'Expired' && (
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

      {/* Consolidated Metrics Grid at the top below navbar */}
      <div className="metrics-grid" style={{ marginBottom: '32px' }}>
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
              <Link href="/attendance?tab=holidays-manage" className="metric-card">
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

      {/* Group Dashboard Layout Section-Wise */}
      {(() => {
        // Fallback modules config in case permissionsRegistry is not loaded
        const modulesList = permissionsRegistry?.modules || [
          {
            id: 'attendance',
            metadata: {
              name: 'Attendance Management',
              icon: 'AttendanceIcon',
              required_subscription_flag: 'is_attendance_enabled'
            },
            functional_capabilities: [
              { id: 'attendance:staff', label: 'Attendance & Clocking', path: '/attendance', tab: '' },
              { id: 'leaves:apply', label: 'Apply Leave Form', path: '/attendance', tab: 'leaves-apply' },
              { id: 'leaves:approve', label: 'Leave Approval Portal', path: '/attendance', tab: 'leaves-approve' },
              { id: 'leaves:manage', label: 'Configure Leave Types', path: '/attendance', tab: 'leaves-manage' },
              { id: 'holidays:manage', label: 'Configure Holidays', path: '/attendance', tab: 'holidays-manage' },
              { id: 'holidays:view', label: 'View Holiday Calendar', path: '/attendance', tab: 'holidays-view' },
              { id: 'attendance:management_portal', label: 'Attendance Management Portal', path: '/attendance/management-portal', tab: '' }
            ]
          },
          {
            id: 'tasks',
            metadata: {
              name: 'Project Management',
              icon: 'TasksIcon',
              required_subscription_flag: 'is_project_enabled'
            },
            functional_capabilities: [
              { id: 'projects:view', label: 'View All Projects', path: '/projects' },
              { id: 'projects:create', label: 'Create New Project', path: '/projects?modal=create' }
            ]
          }
        ];

        // Filter active modules based on subscription and user permissions
        const activeModules = modulesList.filter(module => {
          const reqFlag = module.metadata?.required_subscription_flag;
          const hasAddon = reqFlag
            ? (currentUser?.[reqFlag] || currentUser?.subscription?.[reqFlag])
            : true;

          if (!hasAddon) return false;

          const userCapabilities = currentUser?.isSuperAdmin
            ? module.functional_capabilities
            : module.functional_capabilities?.filter(cap => hasPermission(cap.id)) || [];

          return userCapabilities.length > 0;
        });

        // 1. Platform Overview Section (Core User Directory & Settings Templates)
        const showOverviewSection = canOnboard || canManageTemplates;

        return (
          <>
            {showOverviewSection && (
              <div className="dashboard-module-section" style={{ marginBottom: '40px' }}>
                {/* Modern header banner with a soft background gradient */}
                <div className="platform-overview-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 24px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    boxShadow: '0 0 12px rgba(37, 99, 235, 0.2)'
                  }}>
                    <BrandLogo size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>Platform Administration</h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '500' }}>Manage system directory, permission profiles, and templates</span>
                  </div>
                </div>

                {/* Workspace Quick Navigation Grid */}
                <div className="overview-actions-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px'
                }}>
                  {canOnboard && (
                    <Link
                      href="/admin/employees"
                      className="overview-action-card"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        textDecoration: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="action-card-icon-wrapper" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--primary)',
                        flexShrink: 0,
                        transition: 'all 0.25s ease'
                      }}>
                        <EmployeesIcon size={22} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h3 className="action-card-title" style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                          Onboard Employees
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                          Add new staff profiles, customize details, and configure roles.
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Launch Directory <span>→</span>
                        </span>
                      </div>
                    </Link>
                  )}

                  {canManageTemplates && (
                    <Link
                      href="/admin/templates"
                      className="overview-action-card"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        textDecoration: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="action-card-icon-wrapper" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: 'rgb(99, 102, 241)',
                        flexShrink: 0,
                        transition: 'all 0.25s ease'
                      }}>
                        <BrandLogo size={22} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h3 className="action-card-title" style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                          Permission Matrices
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                          Create baseline role templates and manage granular access keys.
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'rgb(99, 102, 241)', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Configure Templates <span>→</span>
                        </span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Active Module Sections */}
            {activeModules.map(module => {
              if (module.id === 'attendance') {
                return (
                  <div key={module.id} className="dashboard-module-section" style={{ marginBottom: '48px' }}>
                    <div className="module-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid var(--border)', paddingBottom: '10px', marginBottom: '20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}><ClockIcon size={22} /></span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Attendance & Time Tracking</h2>
                    </div>

                    <div className="dashboard-row" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
                      <div className="dashboard-control-col-left" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                        {hasPermission('attendance:staff') && (
                          <div className="panel clocking-card-panel" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', padding: '24px', height: 'fit-content' }}>
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

                            <div className="clock-actions-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                              {!isClockedIn ? (
                                <button className="btn btn-primary btn-lg full-width" onClick={handleDashboardClockIn}>
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
                        <HolidaySlider />
                      </div>
                      <div className="dashboard-control-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ marginBottom: 0 }}>
                          <DashboardCalendar holidays={holidays} />
                        </div>

                        <div className="panel" style={{ marginBottom: 0 }}>
                          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <LeavesIcon size={20} style={{ color: 'var(--primary)' }} />
                              <span>{isAdminView ? 'Recent Leave Activity' : 'My Leave Requests'}</span>
                            </h3>
                            <Link href="/leaves" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
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
                                  <div className="leave-summary-card" key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
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

                        {canApproveLeaves && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Link href="/leaves?tab=approve" className="btn btn-secondary full-width" style={{ textAlign: 'center', textDecoration: 'none' }}>
                              Approve Leave Requests
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {hasPermission('attendance:admin') && (
                      <div className="dashboard-row admin-only-row" style={{ marginTop: '24px' }}>
                        <div className="panel col-12" style={{ marginBottom: 0 }}>
                          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
                              <span>Real-time Global Attendance Monitor</span>
                            </h3>
                            <Link href="/attendance" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                              Manage Attendance
                            </Link>
                          </div>

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
                  </div>
                );
              }

              if (module.id === 'tasks' || module.id === 'projects' || module.id === 'project_management' || module.metadata?.name === 'Project Management') {
                const isProjectAdmin = currentUser?.isSuperAdmin || hasPermission('projects:create') || hasPermission('projects:view');

                return (
                  <div key={module.id} className="dashboard-module-section" style={{ marginBottom: '48px' }}>
                    {isProjectAdmin ? (
                      <AdminProjectDashboard
                        projects={projects}
                        tasks={tasks}
                        stories={[]}
                        sprints={[]}
                        loading={loading}
                        error={error}
                        onRetry={fetchDashboardData}
                        canCreateProject={currentUser?.isSuperAdmin || hasPermission('projects:create')}
                      />
                    ) : (
                      <TeamMemberProjectDashboard
                        currentUser={currentUser}
                        myTasks={myTasks}
                        myProjects={projects}
                        statuses={statuses}
                        loading={loading}
                        error={error}
                        onRetry={fetchDashboardData}
                        onTaskStatusChange={handleTaskStatusChange}
                        onLogHoursSubmit={handleLogHoursSubmit}
                      />
                    )}
                  </div>
                );
              }

              // Dynamic capability grid view for newly added modules from permissions.json
              const userCaps = currentUser?.isSuperAdmin
                ? module.functional_capabilities
                : module.functional_capabilities?.filter(cap => hasPermission(cap.id)) || [];

              return (
                <div key={module.id} className="dashboard-module-section" style={{ marginBottom: '48px' }}>
                  <div className="module-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid var(--border)', paddingBottom: '10px', marginBottom: '20px' }}>
                    <BrandLogo size={22} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                      {module.metadata?.name || 'Additional Module'}
                    </h2>
                  </div>

                  <div className="panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Access services for {module.metadata?.name || 'this module'}:
                    </p>

                    <div className="dynamic-capabilities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                      {userCaps.map(cap => (
                        <Link
                          key={cap.id}
                          href={`${cap.path}${cap.tab ? `?tab=${cap.tab}` : ''}`}
                          className="capability-card"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-app)',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease-in-out',
                            cursor: 'pointer'
                          }}
                        >
                          <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '4px' }}>{cap.label}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>Open Portal workspace ↗</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}


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

        :global(.capability-card) {
          transition: all 0.2s ease-in-out;
        }

        :global(.capability-card:hover) {
          border-color: var(--primary) !important;
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        :global(.overview-action-card:hover) {
          border-color: var(--primary) !important;
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        :global(.overview-action-card:hover .action-card-icon-wrapper) {
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
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
          margin: 15px 0 20px;
        }

        .timer-circle {
          width: 150px;
          height: 150px;
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
          font-size: 0.68rem;
          color: var(--text-light);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .timer-val {
          font-family: var(--font-heading);
          font-size: 1.5rem;
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

      {/* ── Inline Clock-In Modal ────────────────────────────────────────── */}
      {ciModal && (
        <div
          onClick={() => setCiModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(10, 18, 40, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'ciOverlayIn 0.2s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface, #fff)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              width: '100%', maxWidth: '420px',
              overflow: 'hidden',
              animation: 'ciCardIn 0.28s cubic-bezier(0.34,1.56,0.64,1)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '10px',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ClockIcon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Clock In</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Attendance Verification</div>
                </div>
              </div>
              <button
                onClick={() => setCiModal(false)}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-app)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', transition: 'background 0.15s',
                  padding: 0
                }}
              >
                <CloseIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px 24px 24px' }}>

              {/* STEP: checking */}
              {ciStep === 'checking' && (
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: '3px solid var(--primary-border)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 20px'
                  }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 6 }}>Verifying Location…</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
                    Please allow GPS access if prompted. We're checking your office boundary.
                  </div>
                </div>
              )}

              {/* STEP: success */}
              {ciStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '2px solid rgba(16,185,129,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', color: '#10b981'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: 6 }}>Clocked In!</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-light)', marginBottom: 20 }}>
                    Your attendance has been logged at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                    {ciClosest && ciDistance !== null && (
                      <span><br />Verified at <strong>{ciClosest.name}</strong> ({ciDistance.toFixed(0)}m)</span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setCiModal(false)}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    Done
                  </button>
                </div>
              )}

              {/* STEP: failed */}
              {ciStep === 'failed' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '2px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', color: '#ef4444'
                  }}>
                    <WarningIcon size={26} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444', marginBottom: 10 }}>Verification Failed</div>
                  <div style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10, padding: '12px 14px',
                    fontSize: '0.82rem', color: '#b91c1c', textAlign: 'left', lineHeight: 1.5, marginBottom: 20
                  }}>
                    {ciError}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: 16 }}>
                    If you're on-site but GPS failed, you can verify with a live photo instead.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onClick={() => { setCiStep('camera'); ciStartCamera('user'); }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Use Camera Instead
                    </button>
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '11px' }} onClick={() => setCiModal(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: camera */}
              {ciStep === 'camera' && (
                <div>
                  {/* Camera feed */}
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '4/3',
                    background: '#0f172a', borderRadius: 12, overflow: 'hidden',
                    marginBottom: 16, border: '1px solid var(--border)'
                  }}>
                    {ciPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- Clock-in webcam captured photo */
                      <img src={ciPhoto} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : ciStream ? (
                      <>
                        <video
                          ref={ciVideoRef}
                          autoPlay playsInline muted
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {/* Flip camera */}
                        <button
                          onClick={() => { const m = ciFacing === 'user' ? 'environment' : 'user'; setCiFacing(m); ciStartCamera(m); }}
                          style={{
                            position: 'absolute', bottom: 10, right: 10,
                            width: 34, height: 34, borderRadius: '50%', border: 'none',
                            background: 'rgba(0,0,0,0.5)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(4px)'
                          }}
                          title="Switch camera"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 12, color: '#94a3b8'
                      }}>
                        {ciSubmitting ? (
                          <div style={{ width: 32, height: 32, border: '3px solid #334155', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <>
                            <button
                              onClick={() => ciStartCamera('user')}
                              style={{
                                width: 52, height: 52, borderRadius: '50%', border: 'none',
                                background: 'var(--primary)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
                              }}
                            >
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                            </button>
                            <span style={{ fontSize: '0.8rem' }}>Tap to activate camera</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {ciError && (
                    <div style={{
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 8, padding: '10px 12px',
                      fontSize: '0.8rem', color: '#b91c1c', marginBottom: 14
                    }}>{ciError}</div>
                  )}



                  <div style={{ display: 'flex', gap: 10 }}>
                    {ciPhoto ? (
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}
                        onClick={() => { setCiPhoto(null); ciStartCamera(ciFacing); }}
                      >Retake</button>
                    ) : null}
                    <button
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '11px', opacity: ciSubmitting ? 0.7 : 1 }}
                      disabled={ciSubmitting || (!ciStream && !ciPhoto)}
                      onClick={ciPunchWithPhoto}
                    >
                      {ciSubmitting ? 'Clocking in…' : ciPhoto ? 'Confirm & Clock In' : 'Capture & Clock In'}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}
                      onClick={() => setCiModal(false)}
                    >Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes ciOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ciCardIn { from { opacity: 0; transform: scale(0.93) translateY(12px) } to { opacity: 1; transform: none } }
      `}</style>
    </PageWrapper>
  );
}
