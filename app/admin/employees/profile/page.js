'use client';

import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { useApp, PERMISSION_FLAGS } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import SalaryCompensationTab from '@/components/SalaryCompensationTab';
import AttendanceCalendar from '@/components/modules/attendance/AttendanceCalendar';
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
  CameraIcon,
  CalendarIcon,
  AuditIcon,
  DollarIcon,
  BankIcon
} from '@/components/Icons';

function EmployeeProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const empId = searchParams.get('id') || '';

  const { currentUser, authStatus } = useApp();

  // View mode state: 'calendar' (default) | 'list'
  const [attendanceViewMode, setAttendanceViewMode] = useState('calendar');

  // Local states
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employeePhotos, setEmployeePhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Log State
  const [editingLog, setEditingLog] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [recentLogsSearchQuery, setRecentLogsSearchQuery] = useState('');

  // Profile photo upload ref (in-place)
  const photoInputRef = useRef(null);

  // Bank Details Edit Modal States
  const [showBankModal, setShowBankModal] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');
  const [editAccountHolderName, setEditAccountHolderName] = useState('');
  const [editBankBranch, setEditBankBranch] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [bankModalSubmitting, setBankModalSubmitting] = useState(false);
  const [bankModalError, setBankModalError] = useState('');
  const [bankModalSuccess, setBankModalSuccess] = useState('');

  const handleOpenBankModal = () => {
    if (!employee) return;
    setEditBankName(employee.bank_name || '');
    setEditAccountNumber(employee.account_number || '');
    setEditIfscCode(employee.ifsc_code || '');
    setEditAccountHolderName(employee.account_holder_name || employee.name || '');
    setEditBankBranch(employee.bank_branch || '');
    setEditUpiId(employee.upi_id || '');
    setBankModalError('');
    setBankModalSuccess('');
    setShowBankModal(true);
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    if (!employee) return;
    setBankModalSubmitting(true);
    setBankModalError('');
    setBankModalSuccess('');
    try {
      const cleanAcc = editAccountNumber.replace(/[\s-]/g, '').trim();
      const cleanIfsc = editIfscCode.trim().toUpperCase();
      const payload = {
        bank_name: editBankName.trim(),
        account_number: cleanAcc,
        ifsc_code: cleanIfsc,
        account_holder_name: editAccountHolderName.trim() || employee.name || '',
        bank_branch: editBankBranch.trim(),
        upi_id: editUpiId.trim(),
      };
      const updated = await apiFetch(`/employees/${employee.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEmployee(prev => ({ ...prev, ...updated, id: String(updated.id) }));
      setBankModalSuccess('Bank account details updated successfully.');
      setTimeout(() => {
        setShowBankModal(false);
        setBankModalSuccess('');
      }, 1200);
    } catch (err) {
      console.error('Failed to update bank details:', err);
      setBankModalError(err.message || 'Failed to update bank details.');
    } finally {
      setBankModalSubmitting(false);
    }
  };

  // Shortcut Navigation State (Default to Salary & Compensation section)
  const [activeSection, setActiveSection] = useState('section-salary');

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['section-tasks', 'section-salary', 'section-attendance'];
      const scrollPos = window.scrollY + 140;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_attendance_enabled;

  const fetchProfileData = async () => {
    if (authStatus !== 'authenticated') return;
    if (!empId) {
      setErrorState({ status: 400, message: 'No employee ID provided in the URL.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorState(null);
    setErrorMsg('');
    try {
      // 1. Authoritative direct profile lookup
      const employeeData = await apiFetch(`/employees/${empId}/`);
      const mappedEmployee = { ...employeeData, id: String(employeeData.id) };

      // 2. Supporting list data with error isolation
      const [tasksData, leavesData, attendanceData, holidaysData, schedulesData] = await Promise.all([
        isProjectEnabled ? apiFetch('/project-tasks/').catch(() => []) : Promise.resolve([]),
        isAttendanceEnabled ? apiFetch('/leaves/').catch(() => []) : Promise.resolve([]),
        isAttendanceEnabled ? apiFetch('/attendance/').catch(() => []) : Promise.resolve([]),
        isAttendanceEnabled ? apiFetch('/holidays/').catch(() => []) : Promise.resolve([]),
        isAttendanceEnabled ? apiFetch('/schedules/').catch(() => []) : Promise.resolve([]),
      ]);

      const unpack = (res) =>
        Array.isArray(res)
          ? res
          : Array.isArray(res?.results)
            ? res.results
            : [];

      const mappedTasks = unpack(tasksData).map(t => ({ ...t, id: String(t.id), assignedTo: String(t.assignedTo) }));
      const mappedLeaves = unpack(leavesData).map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName
      }));
      const mappedAttendance = unpack(attendanceData).map(log => ({
        ...log,
        id: String(log.id),
        employeeId: String(log.employee)
      }));
      const mappedHolidays = unpack(holidaysData).map(h => ({ ...h, id: String(h.id) }));
      const mappedSchedules = unpack(schedulesData).map(s => ({ ...s, id: String(s.id) }));

      const photoMap = {};
      if (mappedEmployee.profilePhoto) {
        photoMap[mappedEmployee.id] = mappedEmployee.profilePhoto;
      }

      setEmployee(mappedEmployee);
      setTasks(mappedTasks);
      setLeaves(mappedLeaves);
      setAttendanceLogs(mappedAttendance);
      setHolidays(mappedHolidays);
      setSchedules(mappedSchedules);
      setEmployeePhotos(photoMap);
    } catch (err) {
      console.error('Error loading employee profile:', err);
      const status = err.status || (err.message && err.message.includes('404') ? 404 : 500);
      setErrorState({
        status,
        message: err.message || 'Failed to load employee profile data'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProfileData();
    }
  }, [empId, authStatus]);

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };

  const canViewSalary = currentUser?.isSuperAdmin || hasPermission('salary:view') || hasPermission('salary:manage') || (currentUser?.id && String(currentUser.id) === String(employee?.id));
  const canManageSalary = currentUser?.isSuperAdmin || hasPermission('salary:manage');

  const localSaveEmployee = async (updatedData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const saved = await apiFetch(`/employees/${updatedData.id}/`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });
      const mappedSaved = { ...saved, id: String(saved.id) };

      setEmployee(mappedSaved);
      if (mappedSaved.profilePhoto) {
        setEmployeePhotos(prev => ({ ...prev, [mappedSaved.id]: mappedSaved.profilePhoto }));
      } else {
        setEmployeePhotos(prev => {
          const next = { ...prev };
          delete next[mappedSaved.id];
          return next;
        });
      }

      if (currentUser && String(currentUser.id) === mappedSaved.id) {
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
    if (currentUser && String(currentUser.id) === String(employee.id)) {
      alert("You cannot delete your own profile.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete ${employee.name || employee.email}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await apiFetch(`/employees/${employee.id}/`, {
        method: 'DELETE',
      });

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
      const response = await apiFetch(`/attendance/${logId}/`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
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

  // Centralized backend monthly attendance summaries
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  useEffect(() => {
    if (!employee?.id || !isAttendanceEnabled) {
      setMonthlySummaries([]);
      return;
    }
    const fetchMonthly = async () => {
      setLoadingSummaries(true);
      try {
        const yearStr = filterYear;
        const monthStr = String(filterMonth + 1).padStart(2, '0');
        const data = await apiFetch(`/attendance/daily-summary/?employee_id=${employee.id}&month=${yearStr}-${monthStr}`).catch(() => []);
        if (Array.isArray(data)) {
          setMonthlySummaries(data);
        } else if (data && Array.isArray(data?.results)) {
          setMonthlySummaries(data.results);
        } else {
          setMonthlySummaries([]);
        }
      } catch (err) {
        const isPlanError = err?.status === 403 || err?.message?.includes('subscription plan') || err?.message?.includes('403');
        if (!isPlanError) {
          console.warn('Failed to fetch monthly attendance summaries:', err);
        }
        setMonthlySummaries([]);
      } finally {
        setLoadingSummaries(false);
      }
    };
    fetchMonthly();
  }, [employee?.id, isAttendanceEnabled, filterMonth, filterYear]);

  if (loading) {
    return (
      <PageWrapper title="Employee Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading employee profile...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  if (errorState?.status === 403) {
    return (
      <PageWrapper title="Employee Profile">
        <div className="panel alert-box alert-box-danger">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldIcon size={20} style={{ color: 'var(--danger)' }} />
            <span>Access Denied</span>
          </h3>
          <p>You do not have permission to view this employee profile.</p>
          <div style={{ marginTop: '16px' }}>
            <button type="button" onClick={() => router.back()} className="btn btn-primary">
              Return to Previous Page
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (errorState?.status === 404 || (!employee && !errorState)) {
    return (
      <PageWrapper title="Employee Profile">
        <div className="panel alert-box alert-box-danger">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DeclineIcon size={20} style={{ color: 'var(--danger)' }} />
            <span>Profile Not Found</span>
          </h3>
          <p>The employee profile with ID <code>{empId}</code> could not be located on the system.</p>
          <div style={{ marginTop: '16px' }}>
            <button type="button" onClick={() => router.back()} className="btn btn-primary">
              Return to Previous Page
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (errorState) {
    return (
      <PageWrapper title="Employee Profile">
        <div className="panel alert-box alert-box-danger">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningIcon size={20} style={{ color: 'var(--danger)' }} />
            <span>Error Loading Profile</span>
          </h3>
          <p>{errorState.message || 'An unexpected error occurred while loading the employee profile.'}</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="button" onClick={fetchProfileData} className="btn btn-primary">
              Retry
            </button>
            <button type="button" onClick={() => router.back()} className="btn btn-secondary">
              Return to Previous Page
            </button>
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
  const displayName = employee.name?.trim() || employee.email || 'Employee';
  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'EM';

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

  const handleStartOverride = (log) => {
    if (!log) return;
    setEditingLog(log);
    setEditClockIn(formatDateTimeLocal(log.clockIn));
    setEditClockOut(log.clockOut ? formatDateTimeLocal(log.clockOut) : '');
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

  const calculateDuration = (clockIn, clockOut) => {
    return formatDurationStr(null, clockIn, clockOut);
  };

  // Full selected month logs (sorted newest first)
  const logs = Array.isArray(empLogs) ? empLogs : [];
  const validYear = Number(filterYear) || new Date().getFullYear();
  const validMonth = typeof filterMonth === 'number' && !isNaN(filterMonth) ? filterMonth : new Date().getMonth();
  const selectedMonthPrefix = `${validYear}-${String(validMonth + 1).padStart(2, '0')}`;

  const filteredMonthLogs = logs.filter(log => {
    if (!log || typeof log.date !== 'string') return false;
    if (log.date.startsWith(selectedMonthPrefix)) return true;
    const d = new Date(log.date);
    return !isNaN(d.getTime()) && d.getFullYear() === validYear && d.getMonth() === validMonth;
  });

  const monthLogsToUse = filteredMonthLogs.length > 0 ? filteredMonthLogs : logs;
  const monthLogs = monthLogsToUse
    .slice()
    .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));

  // Generate days of selected month calendar days
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
    
    const summary = monthlySummaries.find(s => s.date === dateKey);
    const dayLogs = empLogs.filter(l => l.date === dateKey);
    const leave = empLeaves.find(l => dateKey >= l.startDate && dateKey <= l.endDate);
    const holiday = holidays.find(h => h.date === dateKey);
    const isWeekend = summary ? summary.is_weekly_off : (dateObj.getDay() === 0 || dateObj.getDay() === 6);

    calendarDays.push({
      dayNum,
      dateKey,
      weekday,
      dateObj,
      summary,
      dayLogs,
      log: dayLogs[0] || null,
      leave,
      holiday,
      isWeekend
    });
  }

  // Filtered calendar days for modal table
  const filteredDays = calendarDays.filter(day => {
    const st = day.summary?.daily_status;
    if (filterType === 'Present' && st !== 'Present' && st !== 'Half Day') return false;
    if (filterType === 'Leave' && st !== 'Leave' && (!day.summary || day.summary.leave_fraction === 0)) return false;
    if (filterType === 'Late' && !day.summary?.is_late) return false;
    if (filterType === 'Absent' && st !== 'Absent') return false;

    if (filterSearch) {
      const query = filterSearch.toLowerCase();
      const matchDate = day.dateKey.includes(query) || day.weekday.toLowerCase().includes(query);
      const matchStatus = st ? st.toLowerCase().includes(query) : false;
      const matchLeave = day.summary?.leave_type ? day.summary.leave_type.toLowerCase().includes(query) : false;
      const matchHoliday = day.summary?.holiday_name ? day.summary.holiday_name.toLowerCase().includes(query) : false;
      
      return matchDate || matchStatus || matchLeave || matchHoliday;
    }

    return true;
  });

  // Calculate monthly ledger metrics directly from backend summaries
  const presentCount = monthlySummaries.filter(s => s.daily_status === 'Present').length;
  const halfDayCount = monthlySummaries.filter(s => s.daily_status === 'Half Day').length;
  const leaveCount = monthlySummaries.filter(s => s.daily_status === 'Leave' || s.leave_fraction > 0).length;
  const lateCount = monthlySummaries.filter(s => s.is_late).length;
  const absentCount = monthlySummaries.filter(s => s.daily_status === 'Absent').length;
  const needsReviewCount = monthlySummaries.filter(s => !s.is_payroll_ready).length;

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  return (
    <PageWrapper title={`${displayName}'s Profile`}>
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="profile-page-wrapper">
        
        {/* Navigation Action Row */}
        <div className="nav-row">
          {currentUser?.isSuperAdmin ? (
            <Link href="/admin/employees" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <BackIcon size={14} />
              <span>Back to Directory</span>
            </Link>
          ) : (
            <button type="button" onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <BackIcon size={14} />
              <span>Back</span>
            </button>
          )}
          {currentUser?.isSuperAdmin && (
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
          )}
        </div>

        {/* Profile Card details */}
        <div className="profile-layout-grid">
          
          {/* Card Left: Personal Info */}
          <div className="panel left-card">
            {/* Clickable avatar – hover reveals camera overlay for in-place photo upload only if SuperAdmin */}
            <div
              className={`avatar-large-wrapper ${isSuperAdmin ? 'editable' : ''}`}
              onClick={() => isSuperAdmin && photoInputRef.current?.click()}
              title={isSuperAdmin ? 'Click to change profile photo' : employee.name}
              style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}
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
              {isSuperAdmin && (
                <div className="avatar-camera-overlay">
                  <CameraIcon size={22} />
                  <span>Change Photo</span>
                </div>
              )}
              {isSuperAdmin && (
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleProfilePhotoChange}
                />
              )}
            </div>
            <h2>{displayName}</h2>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {(employee.designation || '').split(',').map(r => r.trim()).filter(Boolean).map(role => (
                <span key={role} className="badge badge-info designation-badge" style={{ margin: 0, color: '#1e40af', backgroundColor: '#dbeafe', border: '1px solid #93c5fd', fontWeight: '600' }}>{role}</span>
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
              <div className="detail-item">
                <span className="icon" style={{ display: 'flex', color: 'var(--primary)' }}>
                  <BankIcon size={18} />
                </span>
                <div className="text">
                  <span className="label">Bank Account</span>
                  {employee.account_number ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span className="val" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                        {employee.bank_name ? `${employee.bank_name} ` : ''}•••• {employee.account_number.slice(-4)}
                      </span>
                      {employee.ifsc_code && (
                        <span className="badge badge-info" style={{ margin: 0, padding: '1px 6px', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                          {employee.ifsc_code}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="badge badge-warning" style={{ margin: '2px 0 0', padding: '2px 8px', fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                      Bank Details Missing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Horizontal Navigation Strip (Blue buttons with white text) */}
          <div className="profile-fullwidth-nav-bar">
            <div className="fullwidth-nav-scroll">
              {canViewSalary && (
                <button
                  type="button"
                  className={`fullwidth-nav-btn ${activeSection === 'section-salary' ? 'active' : ''}`}
                  onClick={() => scrollToSection('section-salary')}
                >
                  <DollarIcon size={16} />
                  <span>Salary & Compensation Structure</span>
                </button>
              )}

              {isAttendanceEnabled && (
                <button
                  type="button"
                  className={`fullwidth-nav-btn ${activeSection === 'section-attendance' ? 'active' : ''}`}
                  onClick={() => scrollToSection('section-attendance')}
                >
                  <ClockIcon size={16} />
                  <span>Attendance History</span>
                </button>
              )}

              {isProjectEnabled && (
                <button
                  type="button"
                  className={`fullwidth-nav-btn ${activeSection === 'section-tasks' ? 'active' : ''}`}
                  onClick={() => scrollToSection('section-tasks')}
                >
                  <TasksIcon size={16} />
                  <span>Recent Project Tasks</span>
                </button>
              )}

              {isAttendanceEnabled && (
                <button
                  type="button"
                  className="fullwidth-nav-btn"
                  onClick={() => setShowMonthlyModal(true)}
                >
                  <CalendarIcon size={16} />
                  <span>Full Month Ledger</span>
                </button>
              )}

              {/* Mobile-only metrics chips */}
              <div className="mobile-only-metrics">
                {isProjectEnabled && (
                  <div className="mobile-metric-chip">
                    <TasksIcon size={14} />
                    <span>Tasks: <strong>{completedTasks}/{empTasks.length} ({taskCompletionRate}%)</strong></span>
                  </div>
                )}
                {isAttendanceEnabled && (
                  <>
                    <div className="mobile-metric-chip">
                      <LeavesIcon size={14} />
                      <span>Leaves: <strong>{approvedLeavesCount} Approved</strong></span>
                    </div>
                    <div className="mobile-metric-chip">
                      <ClockIcon size={14} />
                      <span>Total Days Work: <strong>{totalClockIns} Days</strong></span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card Right: Analytics & Permissions list */}
          <div className="right-panels-wrapper">
            
            {/* Stats Metrics row (Desktop) */}
            <div className="metrics-grid desktop-metrics-grid">
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
              {isAttendanceEnabled && (
                <>
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
                </>
              )}
            </div>


            {/* List of Recent Tasks assigned */}
            {isProjectEnabled && (
              <div id="section-tasks" className="panel recent-tasks-panel" style={{ scrollMarginTop: '80px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                    <span>Recent Assigned Project Tasks</span>
                  </h3>
                  <Link href="/projects" className="btn btn-secondary btn-sm">
                    View All
                  </Link>
                </div>
                <div className="task-scroller">
                  {empTasks.length === 0 ? (
                    <p className="no-tasks-text">No tasks assigned to this employee.</p>
                  ) : (
                    empTasks.map(t => {
                      const taskProjectId = t.project_id || t.project || t.projectId;
                      return (
                        <div className="task-row-item" key={t.id}>
                          <div className="left-info">
                            <Link
                              href={taskProjectId ? `/projects/${taskProjectId}/tasks` : '/projects'}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <strong>{t.title}</strong>
                            </Link>
                            <span className="due-date">Due: {t.dueDate}</span>
                          </div>
                          <span className={`badge ${
                            t.status === 'Completed' ? 'badge-success' :
                            t.status === 'In Progress' ? 'badge-info' : 'badge-pending'
                          }`}>{t.status}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Salary & Compensation Management Section */}
        {canViewSalary && (
          <div id="section-salary" style={{ scrollMarginTop: '80px' }}>
            <SalaryCompensationTab 
              employeeId={employee?.id} 
              employeeName={displayName} 
              canManage={canManageSalary} 
            />

            {/* Employee Bank Account Details Summary Card */}
            <div className="panel" style={{ marginTop: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <BankIcon size={20} style={{ color: 'var(--primary, #0284c7)' }} />
                  <span>Bank Account &amp; Disbursement Details</span>
                </h3>
                {canManageSalary && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenBankModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <EditIcon size={13} />
                    <span>{employee.account_number ? 'Edit Bank Details' : 'Configure Bank Account'}</span>
                  </button>
                )}
              </div>

              {employee.account_number ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bank Name</span>
                    <strong style={{ fontSize: '0.95rem' }}>{employee.bank_name || '—'}</strong>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Number</span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {canManageSalary ? employee.account_number : `•••• •••• •••• ${employee.account_number.slice(-4)}`}
                    </strong>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>IFSC Code</span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{employee.ifsc_code || '—'}</strong>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Holder</span>
                    <strong style={{ fontSize: '0.95rem' }}>{employee.account_holder_name || employee.name || '—'}</strong>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bank Branch</span>
                    <strong style={{ fontSize: '0.95rem' }}>{employee.bank_branch || '—'}</strong>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UPI ID / VPA</span>
                    <strong style={{ fontSize: '0.95rem' }}>{employee.upi_id || '—'}</strong>
                  </div>
                </div>
              ) : (
                <div className="alert-box alert-box-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <WarningIcon size={20} style={{ color: '#b45309' }} />
                    <span style={{ fontSize: '0.85rem' }}>
                      No bank details configured. This employee cannot be included in automated bank payout files until account and IFSC details are added.
                    </span>
                  </div>
                  {canManageSalary && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleOpenBankModal}
                    >
                      + Add Bank Account
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendance History Container with Segmented View Control */}
        {isAttendanceEnabled && (
          <div id="section-attendance" className="panel daily-logs-container" style={{ marginTop: '24px', scrollMarginTop: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Attendance History</span>
                </h3>

                {/* Segmented Control Toggle Buttons */}
                <div
                  className="view-segmented-control"
                  role="tablist"
                  aria-label="Attendance view mode"
                  style={{
                    display: 'inline-flex',
                    padding: '3px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    gap: '4px'
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={attendanceViewMode === 'calendar'}
                    data-active-blue={attendanceViewMode === 'calendar' ? 'true' : undefined}
                    className={`btn btn-sm ${attendanceViewMode === 'calendar' ? 'btn-blue-active active-blue-btn' : ''}`}
                    onClick={() => setAttendanceViewMode('calendar')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-sm)',
                      background: attendanceViewMode === 'calendar' ? 'var(--primary)' : '#ffffff',
                      color: attendanceViewMode === 'calendar' ? '#ffffff' : '#334155',
                      border: attendanceViewMode === 'calendar' ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CalendarIcon style={{ width: '14px', height: '14px', color: attendanceViewMode === 'calendar' ? '#ffffff' : '#334155' }} />
                    <span style={{ color: attendanceViewMode === 'calendar' ? '#ffffff' : '#334155' }}>Calendar View</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={attendanceViewMode === 'list'}
                    data-active-blue={attendanceViewMode === 'list' ? 'true' : undefined}
                    className={`btn btn-sm ${attendanceViewMode === 'list' ? 'btn-blue-active active-blue-btn' : ''}`}
                    onClick={() => setAttendanceViewMode('list')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-sm)',
                      background: attendanceViewMode === 'list' ? 'var(--primary)' : '#ffffff',
                      color: attendanceViewMode === 'list' ? '#ffffff' : '#334155',
                      border: attendanceViewMode === 'list' ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <AuditIcon style={{ width: '14px', height: '14px', color: attendanceViewMode === 'list' ? '#ffffff' : '#334155' }} />
                    <span style={{ color: attendanceViewMode === 'list' ? '#ffffff' : '#334155' }}>List View</span>
                  </button>
                </div>
              </div>

              {/* Right side controls */}
              {attendanceViewMode === 'list' && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search date or time..."
                    value={recentLogsSearchQuery}
                    onChange={(e) => setRecentLogsSearchQuery(e.target.value)}
                    style={{ minWidth: '180px', padding: '6px 12px', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowMonthlyModal(true)}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <CalendarIcon size={14} />
                    View All
                  </button>
                </div>
              )}
            </div>

            {/* CALENDAR VIEW */}
            {attendanceViewMode === 'calendar' && (
              <div style={{ marginTop: '12px' }}>
                <AttendanceCalendar
                  employeeId={employee?.id}
                  employeeName={displayName}
                  year={filterYear}
                  month={filterMonth}
                  dailySummaries={monthlySummaries}
                  attendanceLogs={empLogs}
                  onMonthChange={(y, m) => {
                    setFilterYear(y);
                    setFilterMonth(m);
                  }}
                />
              </div>
            )}

            {/* LIST VIEW */}
            {attendanceViewMode === 'list' && (
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
                      {hasPermission('attendance:admin') && (
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>Actions / Override</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {monthLogs.filter(log => !recentLogsSearchQuery || (log.date && log.date.includes(recentLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(recentLogsSearchQuery.toLowerCase()))).length === 0 ? (
                      <tr>
                        <td colSpan={hasPermission('attendance:admin') ? 6 : 5} className="no-tasks-text" style={{ padding: '30px 0', textAlign: 'center' }}>
                          No attendance logs recorded matching search.
                        </td>
                      </tr>
                    ) : (
                      monthLogs.filter(log => !recentLogsSearchQuery || (log.date && log.date.includes(recentLogsSearchQuery)) || (log.clockIn && formatTimeStr(log.clockIn).toLowerCase().includes(recentLogsSearchQuery.toLowerCase()))).map(log => {
                        const wasLate = isLate(log.clockIn);
                        return (
                          <tr key={log.id}>
                            <td><strong>{log.date}</strong></td>
                            <td>
                              <span className={wasLate ? 'text-late' : 'text-on-time'}>
                                {log.clockIn ? formatTimeStr(log.clockIn) : '--:--'}
                              </span>
                            </td>
                            <td>{log.clockOut ? formatTimeStr(log.clockOut) : '--:--'}</td>
                            <td>{calculateDuration(log.clockIn, log.clockOut)}</td>
                            <td>
                              <span className={`badge ${
                                !log.clockOut ? 'badge-info' :
                                wasLate ? 'badge-late' : 'badge-success'
                              }`}>
                                {!log.clockOut ? 'Clocked In' : wasLate ? 'Late Clock-in' : 'On Time'}
                              </span>
                            </td>
                            {hasPermission('attendance:admin') && (
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleStartOverride(log)}
                                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                >
                                  Override
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
            )}
          </div>
        )}

        {/* EDIT / OVERRIDE PANEL FOR ADMINS */}
        {isAttendanceEnabled && editingLog && hasPermission('attendance:admin') && (
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
        {/* EDIT BANK DETAILS MODAL */}
        {showBankModal && (
          <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', padding: '24px' }}>
              <button className="modal-close-btn" onClick={() => setShowBankModal(false)}>
                <CloseIcon size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BankIcon size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Bank Account Details</h3>
              </div>

              {bankModalSuccess && (
                <div className="alert-box alert-box-success" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                  <CheckIcon size={16} />
                  <span>{bankModalSuccess}</span>
                </div>
              )}

              {bankModalError && (
                <div className="alert-box alert-box-danger" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                  <WarningIcon size={16} />
                  <span>{bankModalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveBankDetails}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Account Holder Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Legal name as per bank records"
                      value={editAccountHolderName}
                      onChange={(e) => setEditAccountHolderName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 50100123456789"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value.replace(/[\s-]/g, ''))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC0001234"
                      maxLength={11}
                      value={editIfscCode}
                      onChange={(e) => setEditIfscCode(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 11))}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      required
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      11 characters: 4 letters, 0, 6 alphanumeric (e.g. HDFC0001234)
                    </span>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Bank Branch &amp; City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Indiranagar, Bengaluru"
                      value={editBankBranch}
                      onChange={(e) => setEditBankBranch(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>UPI ID / VPA (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. employee@okhdfcbank"
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value.trim())}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBankModal(false)} disabled={bankModalSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={bankModalSubmitting}>
                    {bankModalSubmitting ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FULL MONTH ATTENDANCE & LEAVE LEDGER MODAL OVERLAY */}
        {isAttendanceEnabled && showMonthlyModal && (
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
                  Monthly check-in records and applied leaves for <strong>{displayName}</strong>
                </p>
              </div>

              {/* Modal Metrics Row */}
              <div className="modal-metrics-grid">
                <div className="mini-metric-box">
                  <span className="lbl">Present Days</span>
                  <span className="val" style={{ color: 'var(--success)' }}>{presentCount}</span>
                </div>
                <div className="mini-metric-box">
                  <span className="lbl">Half Days</span>
                  <span className="val" style={{ color: '#3730a3' }}>{halfDayCount}</span>
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
                  <span className="lbl">Absences</span>
                  <span className="val" style={{ color: '#b91c1c' }}>{absentCount}</span>
                </div>
                {needsReviewCount > 0 && (
                  <div className="mini-metric-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                    <span className="lbl" style={{ color: '#b45309' }}>Needs Review</span>
                    <span className="val" style={{ color: '#b45309' }}>{needsReviewCount}</span>
                  </div>
                )}
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
                      <th style={{ background: 'var(--primary-light)' }}>Daily Status</th>
                      <th style={{ background: 'var(--primary-light)' }}>Punch-In</th>
                      <th style={{ background: 'var(--primary-light)' }}>Punch-Out</th>
                      <th style={{ background: 'var(--primary-light)' }}>Worked Hours</th>
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
                        const sum = day.summary;
                        let statusBadge = null;
                        let punchInCell = '—';
                        let punchOutCell = '—';
                        let hoursCell = '—';
                        let detailsCell = '';

                        const st = sum?.daily_status || (day.holiday ? 'Holiday' : (day.leave ? 'Leave' : (day.log ? 'Present' : (day.isWeekend ? 'Weekly Off' : 'Absent'))));

                        if (st === 'Holiday') {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Holiday</span>;
                          detailsCell = sum?.holiday_name ? `Holiday: ${sum.holiday_name}` : (day.holiday?.name ? `Holiday: ${day.holiday.name}` : 'Holiday');
                        } else if (st === 'Leave') {
                          statusBadge = <span className="badge badge-success">Leave ({sum?.leave_fraction === 0.5 ? '0.5' : '1.0'})</span>;
                          detailsCell = sum?.leave_type || day.leave?.leaveType || 'Approved Leave';
                        } else if (st === 'Half Day') {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>Half Day</span>;
                          detailsCell = sum?.leave_type ? `Half Day Leave: ${sum.leave_type}` : 'Half Day Worked';
                        } else if (st === 'Present') {
                          statusBadge = <span className="badge badge-success">Present</span>;
                        } else if (st === 'Weekly Off') {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>Weekly Off</span>;
                          detailsCell = 'Off Duty';
                        } else if (st === 'In Progress') {
                          statusBadge = <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>In Progress</span>;
                          detailsCell = 'Active shift';
                        } else if (st === 'Incomplete') {
                          statusBadge = <span className="badge badge-danger">Incomplete</span>;
                          detailsCell = 'Missing Clock-Out (Needs Review)';
                        } else {
                          statusBadge = <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>Absent</span>;
                          detailsCell = 'No punch-in recorded';
                        }

                        if (sum) {
                          if (sum.first_clock_in) punchInCell = formatTimeStr(sum.first_clock_in);
                          if (sum.is_open_session) punchOutCell = 'Active Shift';
                          else if (sum.last_clock_out) punchOutCell = formatTimeStr(sum.last_clock_out);

                          if (sum.worked_minutes > 0) {
                            hoursCell = sum.worked_minutes >= 60 
                              ? `${(sum.worked_minutes / 60).toFixed(1)}h (${sum.worked_minutes}m)`
                              : `${sum.worked_minutes}m`;
                          } else if (sum.is_open_session) {
                            hoursCell = 'Ticking...';
                          }

                          if (sum.has_conflict) {
                            detailsCell = `⚠️ Conflict: Attendance on Full-Day Leave`;
                          } else if (sum.requires_admin_resolution) {
                            detailsCell = `⚠️ Requires Admin Resolution`;
                          } else if (sum.has_pending_approval) {
                            detailsCell = `⏳ Pending Manager Approval`;
                          }
                        } else if (day.log) {
                          punchInCell = formatTimeStr(day.log.clockIn);
                          punchOutCell = day.log.clockOut ? formatTimeStr(day.log.clockOut) : 'Active Shift';
                          hoursCell = day.log.clockOut ? formatDurationStr(day.log.totalDuration) : 'Ticking...';
                        }

                        return (
                          <tr key={day.dateKey} style={{
                            backgroundColor: day.isWeekend ? '#fafafa' : 'transparent'
                          }}>
                            <td><strong>{day.dateKey}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>({day.weekday})</span></td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {statusBadge}
                                {sum?.is_late && (
                                  <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', width: 'fit-content' }}>
                                    +{sum.minutes_late}m late
                                  </span>
                                )}
                                {sum && !sum.is_payroll_ready && (
                                  <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.68rem', width: 'fit-content' }}>
                                    Needs Review
                                  </span>
                                )}
                              </div>
                            </td>
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
          align-items: stretch;
        }

        .left-card {
          flex: 1;
          min-width: 300px;
          order: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 24px;
          text-align: center;
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

        /* Settings-style pill navigation bar */
        .profile-fullwidth-nav-bar {
          width: 100%;
          flex: 1 1 100%;
          order: 3;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--border, #d2e0f5);
          padding: 4px 0 12px 0;
          margin: 4px 0 16px 0;
          box-sizing: border-box;
        }

        :root.dark .profile-fullwidth-nav-bar {
          border-bottom-color: #334155;
        }

        .fullwidth-nav-scroll {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          padding: 2px 2px 4px 2px;
          width: 100%;
          box-sizing: border-box;
        }

        .fullwidth-nav-scroll::-webkit-scrollbar {
          height: 3px;
        }

        .fullwidth-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fullwidth-nav-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }

        :root.dark .fullwidth-nav-scroll::-webkit-scrollbar-thumb {
          background: #475569;
        }

        .fullwidth-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          outline: none;
          flex-shrink: 0;
          background-color: #ffffff;
          color: #1e293b;
          border: 1px solid #bfdbfe;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .fullwidth-nav-btn :global(svg) {
          color: #2563eb;
          stroke: #2563eb;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .fullwidth-nav-btn:hover {
          background-color: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
          transform: translateY(-1px);
        }

        .fullwidth-nav-btn:hover :global(svg) {
          color: #1d4ed8;
          stroke: #1d4ed8;
        }

        .fullwidth-nav-btn.active {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
        }

        .fullwidth-nav-btn.active :global(svg) {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }

        :root.dark .fullwidth-nav-btn {
          background-color: #1e293b;
          color: #f1f5f9;
          border-color: #334155;
          box-shadow: none;
        }

        :root.dark .fullwidth-nav-btn :global(svg) {
          color: #60a5fa;
          stroke: #60a5fa;
        }

        :root.dark .fullwidth-nav-btn:hover {
          background-color: rgba(37, 99, 235, 0.2);
          border-color: #3b82f6;
          color: #93c5fd;
        }

        :root.dark .fullwidth-nav-btn:hover :global(svg) {
          color: #93c5fd;
          stroke: #93c5fd;
        }

        :root.dark .fullwidth-nav-btn.active {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35) !important;
        }

        :root.dark .fullwidth-nav-btn.active :global(svg) {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }

        .mobile-only-metrics {
          display: none;
        }

        .right-panels-wrapper {
          flex: 2;
          min-width: 400px;
          order: 2;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .recent-tasks-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 280px;
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
          flex: 1;
          min-height: 200px;
          max-height: 420px;
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
          font-size: 0.9rem;
          color: var(--text-light);
          text-align: center;
          padding: 50px 0;
          margin: auto 0;
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
            gap: 16px;
          }
          .left-card {
            order: 1 !important;
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .profile-fullwidth-nav-bar {
            order: 2 !important;
            padding: 4px 0 10px 0 !important;
            margin: 0 0 10px 0 !important;
            border-bottom: 1.5px solid var(--border, #d2e0f5) !important;
          }
          :root.dark .profile-fullwidth-nav-bar {
            border-bottom-color: #334155 !important;
          }
          .fullwidth-nav-btn {
            font-size: 0.8rem !important;
            padding: 7px 14px !important;
            gap: 6px !important;
            border-radius: 9999px !important;
          }
          .right-panels-wrapper {
            order: 3 !important;
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .desktop-metrics-grid {
            display: none !important;
          }
          .mobile-only-metrics {
            display: inline-flex !important;
            align-items: center;
            gap: 8px;
            margin-left: 4px;
            flex-shrink: 0;
          }
          .mobile-metric-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 12px;
            background: #eff6ff;
            color: #1e40af;
            border: 1px solid #bfdbfe;
            border-radius: 9999px;
            font-size: 0.76rem;
            white-space: nowrap;
            flex-shrink: 0;
          }
          :root.dark .mobile-metric-chip {
            background: #0f172a;
            color: #93c5fd;
            border-color: #334155;
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
