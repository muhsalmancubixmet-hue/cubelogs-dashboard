'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { API_BASE_URL, apiFetch, normalizeListResponse } from '@/lib/api';
import { 
  LeavesIcon, 
  TasksIcon, 
  ChevronIcon, 
  WarningIcon, 
  ChangeIcon, 
  CheckIcon, 
  DeclineIcon, 
  CloseIcon,
  EditIcon,
  DownloadIcon,
  CalendarIcon
} from '@/components/Icons';
import ConfigureLeavesTab from '@/components/ConfigureLeavesTab';


// Removed static LEAVE_ALLOWANCES and LEAVE_TYPES

function LeavesContent() {
  const { currentUser, hasPermission } = useApp();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Local states
  const [cachedEmployees, setCachedEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Derive unique employees from leaves data and combine with cached employees
  const derivedEmployees = Array.from(
    new Map(leaves.map(l => [l.employeeId, { id: l.employeeId, name: l.employeeName || `Employee ${l.employeeId}` }])).values()
  );
  const employees = Array.from(
    new Map([
      ...cachedEmployees.map(e => [e.id, e]),
      ...derivedEmployees.map(e => [e.id, e])
    ]).values()
  );

  // Tab state — sidebar sends 'leaves-apply', 'leaves-approve', 'leaves-manage'
  // Normalize by stripping the 'leaves-' prefix so existing JSX comparisons still work
  const rawTab = searchParams.get('tab') || 'leaves-apply';
  const activeTab = rawTab.startsWith('leaves-') ? rawTab.replace('leaves-', '') : rawTab;

  // Apply Form State
  const [startDate, setStartDate] = useState('');
  const [reason, setReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [dayType, setDayType] = useState('Full Day');

  // Time period filter states (All, Day-wise, Month-wise, Year-wise, Custom Range)
  const [timeFilterMode, setTimeFilterMode] = useState('all'); // 'all', 'day', 'month', 'year', 'range'
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('all'); // 'all', '7', '8', '9', etc.
  const [filterYear, setFilterYear] = useState('all');  // 'all', '2026', '2025'
  const [filterRangeStart, setFilterRangeStart] = useState('');
  const [filterRangeEnd, setFilterRangeEnd] = useState('');

  const [myLeavesSearchQuery, setMyLeavesSearchQuery] = useState('');
  const [teamLeavesSearchQuery, setTeamLeavesSearchQuery] = useState('');

  // Month-based pagination state (e.g. '2026-09', '2026-08', '2026-07', 'all')
  const [selectedMonthPage, setSelectedMonthPage] = useState('2026-09');

  // Derive available months from leaves dataset
  const availableMonthPages = React.useMemo(() => {
    const monthSet = new Set();
    leaves.forEach(l => {
      if (l.startDate) {
        const ym = l.startDate.slice(0, 7);
        if (ym && ym.length === 7) monthSet.add(ym);
      }
    });
    monthSet.add('2026-09');
    monthSet.add('2026-08');
    monthSet.add('2026-07');
    return Array.from(monthSet).sort().reverse();
  }, [leaves]);

  // Leave Type Selector Step states
  const [applyStep, setApplyStep] = useState(1);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredExhaustedType, setHoveredExhaustedType] = useState('');
  const [clickedExhaustedMsg, setClickedExhaustedMsg] = useState('');

  const fetchLeavesData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch all leaves for the organization so client can filter seamlessly across all dimensions
      const leavesData = await apiFetch('/leaves/');
      const leavesList = normalizeListResponse(leavesData);
      const mappedLeaves = leavesList.map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName || 'Leave'
      }));
      setLeaves(mappedLeaves);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch leaves data');
    } finally {
      setLoading(false);
    }
  };

  // Sync session & fetch dependencies on mount
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [ltData, empData] = await Promise.all([
          apiFetch('/leave-types/'),
          apiFetch('/employees/')
        ]);
        const leaveTypesList = normalizeListResponse(ltData);
        const employeesList = normalizeListResponse(empData);
        setLeaveTypes(leaveTypesList.map(lt => ({ ...lt, id: String(lt.id) })));
        setCachedEmployees(employeesList.map(emp => ({ ...emp, id: String(emp.id) })));
      } catch (err) {
        console.error('Failed to load leaves dependencies:', err);
      }
    };
    loadDependencies();
    fetchLeavesData();
  }, [router]);


  // Dynamically resolve leaveTypes & limits
  const activeLeaveTypes = leaveTypes ? leaveTypes.filter(lt => lt.status === 'Active') : [];
  const dynamicLeaveTypes = activeLeaveTypes.map(lt => lt.name);
  const dynamicLeaveAllowances = {};
  activeLeaveTypes.forEach(lt => {
    dynamicLeaveAllowances[lt.name] = lt.maxLimit;
  });

  // Get all dates in the range [startDate, endDate] using local timezone
  const getDatesInRange = (startStr, endStr) => {
    const dates = [];
    if (!startStr || !endStr) return [];
    
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);
    
    let current = new Date(sY, sM - 1, sD);
    const end = new Date(eY, eM - 1, eD);
    
    if (isNaN(current) || isNaN(end) || current > end) return [];
    
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Check if requested date range overlaps with any configured restricted dates
  const getBlockedDateReason = () => {
    if (!startDate || !selectedLeaveType) return null;
    const leaveRules = activeLeaveTypes.find(lt => lt.name === selectedLeaveType);
    if (!leaveRules || !leaveRules.restrictedDates || leaveRules.restrictedDates.length === 0) return null;

    const requestedDates = getDatesInRange(startDate, startDate);
    for (const rd of leaveRules.restrictedDates) {
      if (requestedDates.includes(rd.date)) {
        return { date: rd.date, reason: rd.reason };
      }
    }
    return null;
  };

  const blockedDate = getBlockedDateReason();

  // Get the dynamic policy message based on advance notice requirement
  const getPolicyMessage = (leaveRules) => {
    if (!leaveRules) return null;
    const N = leaveRules.minAdvanceDays || 0;
    if (N <= 0) return leaveRules.description ? `"${leaveRules.description}"` : null;

    // Calculate earliest selectable date
    const today = new Date();
    const earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate() + N);
    const dd = String(earliest.getDate()).padStart(2, '0');
    const mm = String(earliest.getMonth() + 1).padStart(2, '0');
    const yyyy = earliest.getFullYear();
    const earliestDateFormatted = `${dd}/${mm}/${yyyy}`;

    let blockedDaysStr = '';
    if (N === 1) {
      blockedDaysStr = 'today';
    } else if (N === 2) {
      blockedDaysStr = 'today or tomorrow';
    } else {
      blockedDaysStr = `today and the next ${N - 1} days`;
    }

    return {
      info: `ℹ️ ${leaveRules.name} must be applied at least ${N} days in advance.`,
      warning: `⚠️ Minimum advance notice required: ${N} days. Please select a date from ${earliestDateFormatted} onwards.`
    };
  };

  // Get the minimum selectable date based on advance notice configuration in local timezone
  const getMinDateStr = () => {
    const today = new Date();
    const leaveRules = activeLeaveTypes.find(lt => lt.name === selectedLeaveType);
    const advanceDays = leaveRules ? (leaveRules.minAdvanceDays || 0) : 0;
    
    today.setDate(today.getDate() + advanceDays);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get reason if selected date violates the advance notice requirement in local timezone
  const getAdvanceBlockReason = () => {
    if (!startDate || !selectedLeaveType) return null;
    const leaveRules = activeLeaveTypes.find(lt => lt.name === selectedLeaveType);
    if (!leaveRules || !leaveRules.minAdvanceDays) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [yyyy, mm, dd] = startDate.split('-').map(Number);
    const start = new Date(yyyy, mm - 1, dd);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = start - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < leaveRules.minAdvanceDays) {
      return `You must apply for ${selectedLeaveType} at least ${leaveRules.minAdvanceDays} days in advance.`;
    }
    return null;
  };

  const advanceBlockReason = getAdvanceBlockReason();

  // Calculate remaining balance helper (period-aware: Monthly vs Yearly)
  const calculateRemaining = (type) => {
    if (!currentUser) return 0;
    const rule = activeLeaveTypes.find(lt => lt.name === type);
    if (!rule) return 0;
    
    const allowance = rule.maxLimit;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const relevantLeaves = leaves.filter(l => 
      l.employeeId === currentUser.id && 
      l.leaveType === type && 
      (l.status === 'Approved' || l.status === 'Pending')
    );
    
    let takenDays = 0;
    relevantLeaves.forEach(l => {
      if (!l.startDate || !l.endDate) return;
      const [sY, sM, sD] = l.startDate.split('-').map(Number);
      const [eY, eM, eD] = l.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      
      if (!isNaN(start) && !isNaN(end)) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const weight = l.dayType === 'Half Day' ? 0.5 : 1.0;
        
        if (rule.limitPeriod === 'Monthly') {
          if (start.getFullYear() === currentYear && start.getMonth() === currentMonth) {
            takenDays += diffDays * weight;
          }
        } else {
          // Yearly
          if (start.getFullYear() === currentYear) {
            takenDays += diffDays * weight;
          }
        }
      }
    });
    
    return Math.max(0, allowance - takenDays);
  };

  const handleTabChange = (tabName) => {
    // Match the URL pattern used by the sidebar: /attendance?tab=leaves-{tabName}
    router.push(`/attendance?tab=leaves-${tabName}`);
  };

  const localApplyLeave = async (leave) => {
    setLoading(true);
    setErrorMsg('');
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
      const mappedLeave = {
        ...response,
        id: String(response.id),
        employeeId: String(response.employee),
        leaveTypeId: String(response.leaveType),
        leaveType: response.leaveTypeName
      };
      setLeaves(prev => [mappedLeave, ...prev]);
      await fetchLeavesData();
      
      setStartDate('');
      setReason('');
      setSelectedLeaveType('');
      setDayType('Full Day');
      setApplyStep(1);
      setSuccessMsg('Leave request submitted successfully! Pending administrator approval.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to apply leave.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!startDate || !reason || !selectedLeaveType) return;

    setErrorMsg('');

    const leaveRules = activeLeaveTypes.find(lt => lt.name === selectedLeaveType);
    if (!leaveRules) return;

    // 1. Restricted dates check
    const requestedDates = getDatesInRange(startDate, startDate);
    if (leaveRules.restrictedDates && leaveRules.restrictedDates.length > 0) {
      for (const rd of leaveRules.restrictedDates) {
        if (requestedDates.includes(rd.date)) {
          setErrorMsg(`Error: Leave cannot be taken on ${rd.date} because: "${rd.reason}"`);
          return;
        }
      }
    }

    // 1.1 Advance notice days check in local timezone
    if (leaveRules.minAdvanceDays > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [yyyy, mm, dd] = startDate.split('-').map(Number);
      const start = new Date(yyyy, mm - 1, dd);
      start.setHours(0, 0, 0, 0);
      
      const diffTime = start - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < leaveRules.minAdvanceDays) {
        setErrorMsg(`Error: You must apply for ${selectedLeaveType} at least ${leaveRules.minAdvanceDays} days in advance.`);
        return;
      }
    }

    // 2. Limit period accumulation checks (Monthly / Yearly limit checks) using local timezone date diffs
    const [reqStartYear, reqStartMonth] = startDate.split('-').map(Number);
    const reqYear = reqStartYear;
    const reqMonth = reqStartMonth - 1; // Month is 0-indexed in JS date
    const requestedDays = requestedDates.length * (dayType === 'Half Day' ? 0.5 : 1.0);

    const relevantLeaves = leaves.filter(l => 
      l.employeeId === currentUser.id && 
      l.leaveType === selectedLeaveType && 
      (l.status === 'Approved' || l.status === 'Pending')
    );

    let takenDaysInPeriod = 0;
    relevantLeaves.forEach(l => {
      if (!l.startDate || !l.endDate) return;
      const [sY, sM, sD] = l.startDate.split('-').map(Number);
      const [eY, eM, eD] = l.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      
      if (!isNaN(start) && !isNaN(end)) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const weight = l.dayType === 'Half Day' ? 0.5 : 1.0;
        
        if (leaveRules.limitPeriod === 'Monthly') {
          if (start.getFullYear() === reqYear && start.getMonth() === reqMonth) {
            takenDaysInPeriod += diffDays * weight;
          }
        } else {
          // Yearly
          if (start.getFullYear() === reqYear) {
            takenDaysInPeriod += diffDays * weight;
          }
        }
      }
    });

    const periodLabel = leaveRules.limitPeriod === 'Monthly' ? 'this month' : 'this year';
    if (takenDaysInPeriod + requestedDays > leaveRules.maxLimit) {
      setErrorMsg(`Error: This request of ${requestedDays} days exceeds your maximum allowed limit of ${leaveRules.maxLimit} days ${periodLabel}. (Used/pending: ${takenDaysInPeriod} days)`);
      return;
    }

    const leaveData = {
      employeeId: currentUser.id,
      leaveType: selectedLeaveType,
      startDate,
      endDate: startDate,
      dayType,
      reason,
    };

    localApplyLeave(leaveData);
  };

  const localUpdateLeaveStatus = async (id, status) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const updatedLeave = await apiFetch(`/leaves/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const mappedLeave = {
        ...updatedLeave,
        id: String(updatedLeave.id),
        employeeId: String(updatedLeave.employee),
        leaveTypeId: String(updatedLeave.leaveType),
        leaveType: updatedLeave.leaveTypeName
      };
      
      setLeaves(prev => prev.map(l => l.id === id ? mappedLeave : l));
      await fetchLeavesData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update leave status.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    localUpdateLeaveStatus(id, newStatus);
  };

  // KPI calculations from complete dataset
  const totalLeavesCount = leaves.length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedLeavesCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedLeavesCount = leaves.filter(l => l.status === 'Rejected').length;

  const handleClearFilters = () => {
    setEmployeeFilter('');
    setStatusFilter('All');
    setLeaveTypeFilter('All');
    setTimeFilterMode('all');
    setFilterDate('');
    setFilterMonth('all');
    setFilterYear('all');
    setFilterRangeStart('');
    setFilterRangeEnd('');
    setTeamLeavesSearchQuery('');
  };

  const hasActiveFilters = 
    employeeFilter !== '' ||
    statusFilter !== 'All' ||
    leaveTypeFilter !== 'All' ||
    timeFilterMode !== 'all' ||
    filterDate !== '' ||
    filterMonth !== 'all' ||
    filterYear !== 'all' ||
    filterRangeStart !== '' ||
    filterRangeEnd !== '' ||
    teamLeavesSearchQuery !== '';

  const displayLeaves = leaves.filter(l => {
    // 0. Month-Based Pagination filter (defaults to active month, e.g. 2026-09)
    if (selectedMonthPage !== 'all') {
      const leaveMonth = l.startDate ? l.startDate.slice(0, 7) : '';
      if (leaveMonth !== selectedMonthPage) return false;
    }

    // 1. Employee Filter
    if (employeeFilter && l.employeeId !== employeeFilter) return false;

    // 2. Status Filter
    if (statusFilter !== 'All' && l.status !== statusFilter) return false;

    // 3. Leave Type Filter
    if (leaveTypeFilter !== 'All' && l.leaveType !== leaveTypeFilter) return false;

    // 4. Time Period Filter (Day-wise, Month-wise, Year-wise, Date Range)
    if (timeFilterMode === 'day' && filterDate) {
      if (l.startDate > filterDate || l.endDate < filterDate) return false;
    } else if (timeFilterMode === 'month') {
      if (filterYear !== 'all') {
        const leaveYear = l.startDate ? l.startDate.split('-')[0] : '';
        if (leaveYear !== filterYear) return false;
      }
      if (filterMonth !== 'all') {
        const leaveMonth = l.startDate ? String(parseInt(l.startDate.split('-')[1], 10)) : '';
        if (leaveMonth !== String(parseInt(filterMonth, 10))) return false;
      }
    } else if (timeFilterMode === 'year') {
      if (filterYear !== 'all') {
        const leaveYear = l.startDate ? l.startDate.split('-')[0] : '';
        if (leaveYear !== filterYear) return false;
      }
    } else if (timeFilterMode === 'range') {
      if (filterRangeStart && l.endDate < filterRangeStart) return false;
      if (filterRangeEnd && l.startDate > filterRangeEnd) return false;
    }

    // 5. Search Query (Employee Name, Department, Type, Reason, Status)
    if (teamLeavesSearchQuery) {
      const q = teamLeavesSearchQuery.toLowerCase();
      const empName = (l.employeeName || '').toLowerCase();
      const lType = (l.leaveType || '').toLowerCase();
      const reasonText = (l.reason || '').toLowerCase();
      const statusText = (l.status || '').toLowerCase();
      if (!empName.includes(q) && !lType.includes(q) && !reasonText.includes(q) && !statusText.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleExportCSV = () => {
    if (displayLeaves.length === 0) {
      alert('No leave records found to export for the selected filter.');
      return;
    }

    const headers = [
      'Leave ID',
      'Employee Code',
      'Employee Name',
      'Department',
      'Leave Type',
      'Day Type',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Status',
      'Reason'
    ];

    const rows = displayLeaves.map(l => {
      const empObj = employees.find(e => String(e.id) === String(l.employeeId));
      const empCode = empObj?.employee_code || empObj?.employeeCode || `EMP-${l.employeeId}`;
      const dept = empObj?.department || 'General';
      const cleanReason = (l.reason || '').replace(/\[PROD-DEMO-DATA\]\s*/g, '').replace(/"/g, '""');

      return [
        l.id,
        empCode,
        `"${(l.employeeName || '').replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        `"${(l.leaveType || '').replace(/"/g, '""')}"`,
        l.dayType || 'Full',
        l.startDate,
        l.endDate,
        l.duration,
        l.status,
        `"${cleanReason}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `CubeLogs_Leave_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Loading leave data...</span>
      </div>
    );
  }

  if (!currentUser) return null;

  const myLeaves = leaves.filter(l => l.employeeId === currentUser.id);
  const canApplyLeaves = hasPermission('leaves:apply');
  const canApproveLeaves = hasPermission('leaves:approve');
  const canManageLeaves = hasPermission('leaves:manage');

  return (
    <div className="leaves-content-wrapper">
      
      {/* TABS NAVIGATION BAR */}
      <div className="tab-navigation-bar">
        {canApplyLeaves && (
          <button 
            type="button"
            data-white-text={activeTab === 'apply' ? 'true' : undefined}
            className={`tab-btn ${activeTab === 'apply' ? 'active btn-white-text' : ''}`}
            onClick={() => handleTabChange('apply')}
          >
            <LeavesIcon size={15} />
            <span className="tab-text-full">Apply Leave Form</span>
            <span className="tab-text-short">Apply</span>
            <span className="tab-pill-badge">{myLeaves.length}</span>
          </button>
        )}
        {canApproveLeaves && (
          <button 
            type="button"
            data-white-text={activeTab === 'approve' ? 'true' : undefined}
            className={`tab-btn ${activeTab === 'approve' ? 'active btn-white-text' : ''}`}
            onClick={() => handleTabChange('approve')}
          >
            <TasksIcon size={15} />
            <span className="tab-text-full">Approval Dashboard</span>
            <span className="tab-text-short">Approvals</span>
            <span className={`tab-pill-badge ${leaves.filter(l => l.status === 'Pending').length > 0 ? 'pending' : ''}`}>
              {leaves.filter(l => l.status === 'Pending').length}
            </span>
          </button>
        )}
        {canManageLeaves && (
          <button 
            type="button"
            data-white-text={activeTab === 'manage' ? 'true' : undefined}
            className={`tab-btn ${activeTab === 'manage' ? 'active btn-white-text' : ''}`}
            onClick={() => handleTabChange('manage')}
          >
            <EditIcon size={15} />
            <span className="tab-text-full">Configure Leave Rules</span>
            <span className="tab-text-short">Rules</span>
          </button>
        )}
      </div>

      <div className="tab-contents-container">
        
        {/* VIEW 1: APPLY LEAVE FORM */}
        {activeTab === 'apply' && canApplyLeaves && (
          <div className="tab-panel-wrapper fade-in">
            <div className="leaves-grid">
              
              {/* Form card */}
              <div className="panel form-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LeavesIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>File Leave Request</span>
                </h3>
                
                {successMsg && <div className="alert-box" style={{ marginBottom: '18px' }}>{successMsg}</div>}
                {errorMsg && (
                  <div className="alert-box alert-box-danger" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WarningIcon size={16} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {applyStep === 1 ? (
                  <div className="leave-step-container fade-in">
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                      Select a leave category to check your remaining balance and proceed.
                    </p>

                    <div className="custom-dropdown-container">
                      <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Choose Leave Category</label>
                      <div className="custom-dropdown">
                        <button 
                          type="button" 
                          className="dropdown-toggle-btn"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                          <span>
                            {selectedLeaveType 
                              ? `${selectedLeaveType} (${calculateRemaining(selectedLeaveType)} days remaining)`
                              : 'Select Leave Category...'}
                          </span>
                          <span className="arrow" style={{ display: 'flex', alignItems: 'center' }}>
                            <ChevronIcon direction={dropdownOpen ? 'up' : 'down'} size={12} />
                          </span>
                        </button>
                        
                        {dropdownOpen && (
                          <ul className="dropdown-options-list">
                            {activeLeaveTypes.map(typeObj => {
                              const type = typeObj.name;
                              const balance = calculateRemaining(type);
                              const isExhausted = balance <= 0;
                              return (
                                <li 
                                  key={typeObj.id} 
                                  className={`dropdown-option-item ${isExhausted ? 'exhausted' : ''}`}
                                  onClick={() => {
                                    if (isExhausted) {
                                      setClickedExhaustedMsg(`You cannot apply for ${type} because your balance is fully exhausted (0 days remaining out of ${dynamicLeaveAllowances[type]} days allowance).`);
                                    } else {
                                      setClickedExhaustedMsg('');
                                      setSelectedLeaveType(type);
                                      setDropdownOpen(false);
                                      setApplyStep(2);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (isExhausted) setHoveredExhaustedType(type);
                                  }}
                                  onMouseLeave={() => setHoveredExhaustedType('')}
                                >
                                  <span className="option-name">{type}</span>
                                  <span className={`option-balance ${isExhausted ? 'zero' : ''}`}>
                                    {balance} / {dynamicLeaveAllowances[type]} left ({activeLeaveTypes.find(lt => lt.name === type)?.limitPeriod || 'Yearly'})
                                  </span>

                                  {isExhausted && hoveredExhaustedType === type && (
                                    <div className="exhausted-tooltip" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <WarningIcon size={12} style={{ color: 'white', flexShrink: 0 }} />
                                      <span>Allowance of {dynamicLeaveAllowances[type]} days is fully used or pending.</span>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {clickedExhaustedMsg && (
                        <div className="exhausted-alert-msg" style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid var(--primary-border)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <WarningIcon size={16} style={{ flexShrink: 0 }} />
                          <span>{clickedExhaustedMsg}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="leave-step-container fade-in">
                    <div className="selected-type-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', width: '70%' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Selected Leave Category:</span>
                        <strong>{selectedLeaveType}</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.8rem' }}>
                            Remaining: {calculateRemaining(selectedLeaveType)} days
                          </span>
                          {activeLeaveTypes.find(lt => lt.name === selectedLeaveType)?.minAdvanceDays > 0 && (
                            <span style={{ color: '#b91c1c', fontWeight: '600', fontSize: '0.8rem' }}>
                              Notice Required: {activeLeaveTypes.find(lt => lt.name === selectedLeaveType).minAdvanceDays} Days
                            </span>
                          )}
                        </div>
                        {(() => {
                          const leaveRules = activeLeaveTypes.find(lt => lt.name === selectedLeaveType);
                          const policy = getPolicyMessage(leaveRules);
                          if (!policy) return null;
                          if (typeof policy === 'string') {
                            return (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: '4px', borderLeft: '2px solid var(--primary-border)', paddingLeft: '6px' }}>
                                {policy}
                              </span>
                            );
                          }
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', padding: '10px 12px', background: 'rgba(37, 99, 235, 0.04)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                                {policy.info}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600' }}>
                                {policy.warning}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setApplyStep(1);
                          setDropdownOpen(true);
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'center' }}
                      >
                        <ChangeIcon size={12} />
                        <span>Change Type</span>
                      </button>
                    </div>

                    <form onSubmit={handleApply} className="leave-form">
                      <div className="form-group">
                        <label className="form-label" htmlFor="start-date">Select Leave Date</label>
                        <input
                          id="start-date"
                          type="date"
                          className="form-input"
                          min={getMinDateStr()}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Leave Duration</label>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                            <input
                              type="radio"
                              name="dayType"
                              value="Full Day"
                              checked={dayType === 'Full Day'}
                              onChange={(e) => setDayType(e.target.value)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                            />
                            <span>Full Day</span>
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                            <input
                              type="radio"
                              name="dayType"
                              value="Half Day"
                              checked={dayType === 'Half Day'}
                              onChange={(e) => setDayType(e.target.value)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                            />
                            <span>Half Day</span>
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="reason">Reason / Comments</label>
                        <textarea
                          id="reason"
                          rows="3"
                          className="form-input"
                          style={{ resize: 'vertical' }}
                          placeholder="Explain details for request approval..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required
                        ></textarea>
                      </div>

                      {blockedDate && (
                        <div className="alert-box alert-box-danger" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px', marginBottom: '16px', borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '700', fontSize: '0.85rem' }}>
                            <WarningIcon size={16} />
                            <span>Blocked Date Alert: {blockedDate.date}</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>
                            <strong>Reason:</strong> {blockedDate.reason}
                          </p>
                        </div>
                      )}

                      {advanceBlockReason && (
                        <div className="alert-box alert-box-danger" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px', marginBottom: '16px', borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '700', fontSize: '0.85rem' }}>
                            <WarningIcon size={16} />
                            <span>Advance Notice Blocked Date</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>
                            {advanceBlockReason}
                          </p>
                        </div>
                      )}

                      <div className="form-actions-row">
                        <button 
                          type="submit" 
                          className={`btn ${(blockedDate || advanceBlockReason) ? 'btn-disabled' : 'btn-primary'}`} 
                          disabled={!!blockedDate || !!advanceBlockReason}
                        >
                          Submit Leave Application
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setApplyStep(1);
                            setStartDate('');
                            setReason('');
                            setSelectedLeaveType('');
                            setDayType('Full Day');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Personal Leave History */}
              <div className="panel list-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LeavesIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>My Requests History</span>
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    History of time-off applications.
                  </p>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by date or type..."
                    value={myLeavesSearchQuery}
                    onChange={(e) => setMyLeavesSearchQuery(e.target.value)}
                    style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date Span</th>
                        <th>Reason Details</th>
                        <th>State Badge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLeaves.filter(leave => !myLeavesSearchQuery || (leave.startDate && leave.startDate.includes(myLeavesSearchQuery)) || (leave.leaveType && leave.leaveType.toLowerCase().includes(myLeavesSearchQuery.toLowerCase()))).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="no-data-text">No leaves filed matching search.</td>
                        </tr>
                      ) : (
                        myLeaves.filter(leave => !myLeavesSearchQuery || (leave.startDate && leave.startDate.includes(myLeavesSearchQuery)) || (leave.leaveType && leave.leaveType.toLowerCase().includes(myLeavesSearchQuery.toLowerCase()))).map(leave => (
                          <tr key={leave.id}>
                            <td>
                              <strong>{leave.startDate}</strong>
                              {leave.startDate !== leave.endDate && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>to {leave.endDate}</div>
                              )}
                              {leave.leaveType && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                    {leave.leaveType}
                                  </span>
                                  {leave.dayType && (
                                    <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: 'var(--text-muted)' }}>
                                      {leave.dayType}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{leave.reason}</td>
                            <td>
                              <span className={`badge ${
                                leave.status === 'Approved' ? 'badge-success' :
                                leave.status === 'Rejected' ? 'badge-danger' : 'badge-pending'
                              }`}>
                                {leave.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: APPROVAL DASHBOARD (ADMIN) */}
        {activeTab === 'approve' && canApproveLeaves && (
          <div className="tab-panel-wrapper fade-in">
            <div className="panel leaves-panel">
              
              {/* Header Bar */}
              <div className="leaves-header-bar">
                <div className="leaves-header-titles">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '700' }}>
                    <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                    <span>Active Leave Request Approvals</span>
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Review vacation applications, track historical leaves, and export compliance reports.
                  </p>
                </div>
                <div className="leaves-header-actions">
                  {hasActiveFilters && (
                    <button 
                      onClick={handleClearFilters}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-md)' }}
                    >
                      <CloseIcon size={12} />
                      <span>Clear Filters</span>
                    </button>
                  )}
                  <button
                    onClick={handleExportCSV}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-md)', fontWeight: '600', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
                    title="Export filtered records as CSV spreadsheet"
                  >
                    <DownloadIcon size={14} />
                    <span>Download Report ({displayLeaves.length})</span>
                  </button>
                </div>
              </div>

              {/* 1. KPI Metric Cards */}
              <div className="leaves-kpi-grid">
                {/* Total Requests */}
                <div 
                  className={`kpi-card ${statusFilter === 'All' ? 'kpi-active' : ''}`}
                  onClick={() => setStatusFilter('All')}
                >
                  <div className="kpi-label">Total Leaves</div>
                  <div className="kpi-body">
                    <span className="kpi-value">{totalLeavesCount}</span>
                    <span className="kpi-sub">All Records</span>
                  </div>
                </div>

                {/* Pending Approvals */}
                <div 
                  className={`kpi-card ${statusFilter === 'Pending' ? 'kpi-active pending' : ''}`}
                  onClick={() => setStatusFilter('Pending')}
                >
                  <div className="kpi-label pending">Pending</div>
                  <div className="kpi-body">
                    <span className="kpi-value pending">{pendingLeavesCount}</span>
                    <span className="badge kpi-badge pending">Action</span>
                  </div>
                </div>

                {/* Approved Leaves */}
                <div 
                  className={`kpi-card ${statusFilter === 'Approved' ? 'kpi-active approved' : ''}`}
                  onClick={() => setStatusFilter('Approved')}
                >
                  <div className="kpi-label approved">Approved</div>
                  <div className="kpi-body">
                    <span className="kpi-value approved">{approvedLeavesCount}</span>
                    <span className="badge kpi-badge approved">Granted</span>
                  </div>
                </div>

                {/* Rejected Leaves */}
                <div 
                  className={`kpi-card ${statusFilter === 'Rejected' ? 'kpi-active rejected' : ''}`}
                  onClick={() => setStatusFilter('Rejected')}
                >
                  <div className="kpi-label rejected">Rejected</div>
                  <div className="kpi-body">
                    <span className="kpi-value rejected">{rejectedLeavesCount}</span>
                    <span className="badge kpi-badge rejected">Denied</span>
                  </div>
                </div>
              </div>

              {/* 2. Comprehensive Filter Toolbar */}
              <div className="leaves-filter-toolbar">
                
                {/* Time-Period Filter Mode Tabs */}
                <div className="filter-time-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={15} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>Time Range:</span>
                  </div>
                  <div className="time-pills-row">
                    {[
                      { id: 'all', label: 'All Dates' },
                      { id: 'day', label: 'Day-wise' },
                      { id: 'month', label: 'Month-wise' },
                      { id: 'year', label: 'Year-wise' },
                      { id: 'range', label: 'Date Range' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTimeFilterMode(tab.id)}
                        className={`btn btn-sm ${timeFilterMode === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontSize: '0.74rem',
                          padding: '4px 8px',
                          fontWeight: timeFilterMode === tab.id ? '700' : '500',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Controls based on selected timeFilterMode */}
                {timeFilterMode === 'day' && (
                  <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#ffffff', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Specific Day:</label>
                    <input
                      type="date"
                      className="form-input"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '160px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick picks:</span>
                      {[
                        { label: 'Sep 24 (Tech Summit)', val: '2026-09-24' },
                        { label: 'Sep 18 (Dental)', val: '2026-09-18' },
                        { label: 'Aug 11 (Flu)', val: '2026-08-11' },
                        { label: 'Jul 10 (Family)', val: '2026-07-10' },
                      ].map(qp => (
                        <button
                          key={qp.val}
                          type="button"
                          onClick={() => setFilterDate(qp.val)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', background: filterDate === qp.val ? 'var(--primary-light)' : '#f8fafc', borderColor: filterDate === qp.val ? 'var(--primary)' : '#e2e8f0' }}
                        >
                          {qp.label}
                        </button>
                      ))}
                      {filterDate && (
                        <button onClick={() => setFilterDate('')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          Clear Day
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {timeFilterMode === 'month' && (
                  <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#ffffff', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>Month:</label>
                      <select
                        className="form-input"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '160px', appearance: 'auto' }}
                      >
                        <option value="all">All Months</option>
                        <option value="7">July (Month 1)</option>
                        <option value="8">August (Month 2)</option>
                        <option value="9">September (Month 3)</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>Year:</label>
                      <select
                        className="form-input"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '110px', appearance: 'auto' }}
                      >
                        <option value="all">All Years</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => { setFilterMonth('9'); setFilterYear('2026'); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>September 2026</button>
                      <button type="button" onClick={() => { setFilterMonth('8'); setFilterYear('2026'); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>August 2026</button>
                      <button type="button" onClick={() => { setFilterMonth('7'); setFilterYear('2026'); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>July 2026</button>
                    </div>
                  </div>
                )}

                {timeFilterMode === 'year' && (
                  <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#ffffff', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Year:</label>
                    <select
                      className="form-input"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '140px', appearance: 'auto' }}
                    >
                      <option value="all">All Years</option>
                      <option value="2026">2026 (Current Active)</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                )}

                {timeFilterMode === 'range' && (
                  <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#ffffff', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>From:</label>
                      <input
                        type="date"
                        className="form-input"
                        value={filterRangeStart}
                        onChange={(e) => setFilterRangeStart(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '150px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>To:</label>
                      <input
                        type="date"
                        className="form-input"
                        value={filterRangeEnd}
                        onChange={(e) => setFilterRangeEnd(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', width: '150px' }}
                      />
                    </div>
                    {(filterRangeStart || filterRangeEnd) && (
                      <button onClick={() => { setFilterRangeStart(''); setFilterRangeEnd(''); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                        Reset Range
                      </button>
                    )}
                  </div>
                )}

                {/* Entity & Status Dropdown Filters */}
                <div className="filter-dropdowns-grid">
                  {/* Search Query */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Search Requests</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search name, department, reason..."
                      value={teamLeavesSearchQuery}
                      onChange={(e) => setTeamLeavesSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
                    />
                  </div>

                  {/* Filter by Status */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Status</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto', width: '100%' }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses ({totalLeavesCount})</option>
                      <option value="Pending">Pending ({pendingLeavesCount})</option>
                      <option value="Approved">Approved ({approvedLeavesCount})</option>
                      <option value="Rejected">Rejected ({rejectedLeavesCount})</option>
                    </select>
                  </div>

                  {/* Filter by Employee */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Employee</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto', width: '100%' }}
                      value={employeeFilter}
                      onChange={(e) => setEmployeeFilter(e.target.value)}
                    >
                      <option value="">All Employees ({employees.length})</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Leave Type */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Leave Type</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto', width: '100%' }}
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                    >
                      <option value="All">All Leave Types</option>
                      <option value="Casual Leave">Casual Leave</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Privilege Leave">Privilege Leave</option>
                      <option value="Leave Without Pay">Leave Without Pay</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* 3. Standard Month Navigation Hub */}
              <div className="standard-month-navigator">
                {/* Header: Prev Month / Active Month Title / Next Month */}
                <div className="smn-header">
                  <button
                    type="button"
                    className="smn-nav-btn smn-prev"
                    disabled={availableMonthPages.indexOf(selectedMonthPage) >= availableMonthPages.length - 1 || selectedMonthPage === 'all'}
                    onClick={() => {
                      const currIdx = availableMonthPages.indexOf(selectedMonthPage);
                      if (currIdx < availableMonthPages.length - 1 && currIdx !== -1) {
                        setSelectedMonthPage(availableMonthPages[currIdx + 1]);
                      }
                    }}
                    title="Previous Month"
                  >
                    <ChevronIcon direction="left" size={13} />
                    <span>Prev Month</span>
                  </button>

                  <div className="smn-current-info">
                    <div className="smn-title">
                      <CalendarIcon size={16} style={{ color: '#2563eb' }} />
                      <span>
                        {selectedMonthPage === 'all' ? 'All Months Overview' : (() => {
                          const [y, m] = selectedMonthPage.split('-');
                          const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${mNames[parseInt(m, 10) - 1]} ${y}`;
                        })()}
                      </span>
                    </div>
                    <span className="smn-badge">
                      {displayLeaves.length} {displayLeaves.length === 1 ? 'Application' : 'Applications'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="smn-nav-btn smn-next"
                    disabled={availableMonthPages.indexOf(selectedMonthPage) <= 0 || selectedMonthPage === 'all'}
                    onClick={() => {
                      const currIdx = availableMonthPages.indexOf(selectedMonthPage);
                      if (currIdx > 0) {
                        setSelectedMonthPage(availableMonthPages[currIdx - 1]);
                      }
                    }}
                    title="Next Month"
                  >
                    <span>Next Month</span>
                    <ChevronIcon direction="right" size={13} />
                  </button>
                </div>

                {/* Horizontal Scrollable Month Pills Track */}
                <div className="smn-pills-row">
                  {availableMonthPages.map(mStr => {
                    const count = leaves.filter(l => l.startDate && l.startDate.startsWith(mStr)).length;
                    const [y, m] = mStr.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                    const isActive = selectedMonthPage === mStr;

                    return (
                      <button
                        key={mStr}
                        type="button"
                        data-white-text={isActive ? "true" : undefined}
                        className={`smn-pill ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedMonthPage(mStr)}
                      >
                        <span className="smn-pill-text">{monthLabel}</span>
                        <span className={`smn-pill-count ${isActive ? 'active' : ''}`}>{count}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    data-white-text={selectedMonthPage === 'all' ? "true" : undefined}
                    className={`smn-pill ${selectedMonthPage === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedMonthPage('all')}
                  >
                    <span className="smn-pill-text">All Months</span>
                    <span className={`smn-pill-count ${selectedMonthPage === 'all' ? 'active' : ''}`}>{leaves.length}</span>
                  </button>
                </div>
              </div>

              {/* 4. Leaves Table */}
              <div className="table-container" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700' }}>Employee</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700' }}>Leave Type</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700' }}>Duration & Dates</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700' }}>Reason Details</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="no-data-text" style={{ padding: '40px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No leave applications match your filters.</span>
                            {hasActiveFilters && (
                              <button onClick={handleClearFilters} className="btn btn-secondary btn-sm" style={{ marginTop: '6px' }}>
                                Reset All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayLeaves.map(leave => {
                        const empObj = employees.find(e => String(e.id) === String(leave.employeeId));
                        const initials = (leave.employeeName || 'Staff')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        const cleanReason = (leave.reason || '').replace(/\[PROD-DEMO-DATA\]\s*/g, '');

                        // Type badge colors
                        let typeBg = '#eff6ff';
                        let typeColor = '#1e40af';
                        let typeBorder = '#bfdbfe';
                        if (leave.leaveType === 'Sick Leave') {
                          typeBg = '#fef2f2';
                          typeColor = '#991b1b';
                          typeBorder = '#fecaca';
                        } else if (leave.leaveType === 'Privilege Leave') {
                          typeBg = '#f5f3ff';
                          typeColor = '#5b21b6';
                          typeBorder = '#ddd6fe';
                        } else if (leave.leaveType === 'Leave Without Pay') {
                          typeBg = '#fffbeb';
                          typeColor = '#92400e';
                          typeBorder = '#fde68a';
                        }

                        return (
                          <tr key={leave.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}>
                            {/* Employee */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div 
                                  className="avatar-circle table-emp-avatar"
                                  data-white-text="true"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                                  }}
                                >
                                  <span className="avatar-initials-text" style={{ color: '#ffffff !important', fontWeight: '700' }}>
                                    {initials}
                                  </span>
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                                    {leave.employeeName}
                                  </strong>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    {empObj?.department || 'Engineering'} • {empObj?.employee_code || `EMP-${leave.employeeId}`}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Leave Type */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                background: typeBg,
                                color: typeColor,
                                border: `1px solid ${typeBorder}`
                              }}>
                                {leave.leaveType}
                              </span>
                            </td>

                            {/* Duration & Dates */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                  {leave.startDate}
                                  {leave.startDate !== leave.endDate && ` → ${leave.endDate}`}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--primary)' }}>
                                    {leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}
                                  </span>
                                  {leave.dayType && leave.dayType !== 'Full' && (
                                    <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>
                                      {leave.dayType}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Reason Details */}
                            <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.4, display: 'block' }}>
                                {cleanReason || 'No justification provided.'}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span className={`badge ${
                                leave.status === 'Approved' ? 'badge-success' :
                                leave.status === 'Rejected' ? 'badge-danger' : 'badge-pending'
                              }`} style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '12px' }}>
                                {leave.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              {leave.status === 'Pending' ? (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button 
                                    type="button"
                                    className="btn btn-primary btn-white-text btn-sm" 
                                    data-white-text="true"
                                    onClick={() => handleStatusChange(leave.id, 'Approved')}
                                    style={{
                                      background: '#2563eb',
                                      color: '#ffffff',
                                      fontWeight: '700',
                                      border: 'none',
                                      padding: '6px 12px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                                    }}
                                    title="Approve leave request"
                                  >
                                    <CheckIcon size={12} />
                                    <span>Approve</span>
                                  </button>
                                  <button 
                                    type="button"
                                    className="btn btn-danger btn-white-text btn-sm" 
                                    data-white-text="true"
                                    onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                    style={{
                                      background: '#ef4444',
                                      color: '#ffffff',
                                      fontWeight: '700',
                                      border: 'none',
                                      padding: '6px 12px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
                                    }}
                                    title="Decline leave request"
                                  >
                                    <DeclineIcon size={12} />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                  Reviewed
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
        )}


        {/* VIEW 3: CONFIGURE LEAVE RULES */}
        {activeTab === 'manage' && canManageLeaves && (
          <div className="tab-panel-wrapper fade-in">
            <ConfigureLeavesTab />
          </div>
        )}

      </div>

      <style jsx>{`
        .leaves-content-wrapper {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .tab-navigation-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 5px;
          border-radius: var(--radius-lg, 12px);
          border: 1px solid var(--border, #e2e8f0);
          margin-bottom: 20px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .tab-navigation-bar::-webkit-scrollbar {
          display: none;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 8px 16px;
          font-family: var(--font-sans);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-light, #64748b);
          cursor: pointer;
          border-radius: var(--radius-md, 8px);
          transition: all var(--transition-fast);
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .tab-btn:hover {
          color: var(--primary);
          background: rgba(37, 99, 235, 0.08);
        }

        .tab-btn.active {
          background: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .tab-btn.active span,
        .tab-btn.active :global(span),
        .tab-btn.active :global(svg),
        .tab-btn.active :global(path),
        .tab-btn.active .tab-pill-badge {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }

        .tab-pill-badge {
          font-size: 0.72rem;
          padding: 1px 7px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.08);
          font-weight: 700;
          line-height: 1.3;
        }

        .tab-btn.active .tab-pill-badge {
          background: rgba(255, 255, 255, 0.28) !important;
          color: #ffffff !important;
        }

        .tab-pill-badge.pending {
          background: #f59e0b;
          color: #ffffff;
        }

        .tab-btn.active .tab-pill-badge.pending {
          background: rgba(255, 255, 255, 0.28) !important;
          color: #ffffff !important;
        }

        .tab-text-short {
          display: none;
        }
        .tab-text-full {
          display: inline;
        }

        .leaves-panel {
          padding: 24px;
        }

        .leaves-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .leaves-header-titles {
          flex: 1;
          min-width: 220px;
        }
        .leaves-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .leaves-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .kpi-card {
          padding: 14px 16px;
          border-radius: var(--radius-md);
          background: var(--bg-app);
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .kpi-active {
          background: var(--primary-light) !important;
          border-color: var(--primary) !important;
        }
        .kpi-active.pending {
          background: #fef3c7 !important;
          border-color: #f59e0b !important;
        }
        .kpi-active.approved {
          background: #ecfdf5 !important;
          border-color: #10b981 !important;
        }
        .kpi-active.rejected {
          background: #fef2f2 !important;
          border-color: #ef4444 !important;
        }

        .kpi-label {
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .kpi-label.pending { color: #b45309; }
        .kpi-label.approved { color: #047857; }
        .kpi-label.rejected { color: #b91c1c; }

        .kpi-body {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 6px;
        }
        .kpi-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
        }
        .kpi-value.pending { color: #d97706; }
        .kpi-value.approved { color: #059669; }
        .kpi-value.rejected { color: #dc2626; }

        .kpi-sub {
          font-size: 0.72rem;
          color: var(--primary);
          font-weight: 600;
        }
        .kpi-badge {
          font-size: 0.68rem;
        }
        .kpi-badge.pending {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .kpi-badge.approved {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .kpi-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .leaves-filter-toolbar {
          background: var(--primary-light);
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--primary-border);
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .filter-time-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .time-pills-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .filter-dropdowns-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .form-actions-row {
          display: flex;
          gap: 12px;
        }
        .form-actions-row .btn {
          padding: 10px 20px;
        }

        .leaves-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        /* Custom Dropdown Step Styling */
        .leave-step-container {
          width: 100%;
        }

        .custom-dropdown-container {
          margin-bottom: 20px;
          position: relative;
        }

        .custom-dropdown {
          position: relative;
          width: 100%;
        }

        .dropdown-toggle-btn {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background-color: white;
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 500;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .dropdown-toggle-btn:hover {
          border-color: var(--primary-border);
          background-color: #f8fafc;
        }

        .dropdown-options-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 100;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          margin-top: 6px;
          padding: 6px 0;
          list-style: none;
          max-height: 280px;
          overflow-y: auto;
        }

        .dropdown-option-item {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-size: 0.88rem;
          transition: var(--transition-fast);
          position: relative;
        }

        .dropdown-option-item:hover:not(.exhausted) {
          background-color: var(--primary-light);
          color: var(--primary);
        }

        .dropdown-option-item.exhausted {
          opacity: 0.55;
          cursor: not-allowed;
          background-color: #f8fafc;
        }

        .option-name {
          font-weight: 600;
          color: var(--text-main);
        }

        .dropdown-option-item.exhausted .option-name {
          color: var(--text-light);
        }

        .option-balance {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .option-balance.zero {
          color: var(--danger);
          font-weight: 600;
        }

        .exhausted-tooltip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          z-index: 200;
          width: 260px;
          padding: 10px 14px;
          background: #0a1931;
          color: white;
          font-size: 0.78rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          line-height: 1.4;
          pointer-events: none;
          animation: fadeIn 0.15s ease;
          border: 1px solid var(--primary-border);
        }

        .exhausted-tooltip::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 50%;
          margin-top: -6px;
          border-width: 6px;
          border-style: solid;
          border-color: transparent #0a1931 transparent transparent;
        }

        @media (max-width: 992px) {
          .exhausted-tooltip {
            left: 0;
            right: 0;
            top: 100%;
            transform: none;
            width: auto;
            margin-top: 4px;
            box-sizing: border-box;
          }
          .exhausted-tooltip::before {
            bottom: 100%;
            top: auto;
            left: 20px;
            right: auto;
            margin-top: 0;
            border-width: 6px;
            border-style: solid;
            border-color: transparent transparent #0a1931 transparent;
          }
          .leaves-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .filter-dropdowns-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        .form-panel {
          flex: 1;
          min-width: 320px;
        }

        .list-panel {
          flex: 1.2;
          min-width: 380px;
        }

        .leave-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        .no-data-text {
          font-size: 0.88rem;
          color: var(--text-light);
          text-align: center;
          padding: 40px 0;
        }

        /* Avatar initials white text */
        :global(.table-emp-avatar),
        :global(.table-emp-avatar *),
        :global(.avatar-initials-text) {
          color: #ffffff !important;
          fill: #ffffff !important;
        }

        /* Standard Month Navigation Hub */
        .standard-month-navigator {
          background: #ffffff;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .smn-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .smn-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #1e293b !important;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .smn-nav-btn:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a !important;
        }

        .smn-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          border-color: #e2e8f0;
          color: #94a3b8 !important;
        }

        .smn-current-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .smn-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .smn-badge {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb !important;
          border: 1px solid rgba(37, 99, 235, 0.2);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .smn-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding: 2px 0;
        }

        .smn-pills-row::-webkit-scrollbar {
          display: none;
        }

        .smn-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569 !important;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .smn-pill:hover:not(.active) {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #0f172a !important;
        }

        /* Active Pill: Straight Solid Royal Blue with White Letters */
        .smn-pill.active {
          background: #2563eb !important;
          color: #ffffff !important;
          border-color: #2563eb !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
          font-weight: 700;
        }

        .smn-pill.active * {
          color: #ffffff !important;
        }

        .smn-pill-count {
          font-size: 0.7rem;
          background: #e2e8f0;
          color: #475569;
          padding: 1px 6px;
          border-radius: 9999px;
          font-weight: 700;
          line-height: 1.3;
        }

        .smn-pill.active .smn-pill-count {
          background: rgba(255, 255, 255, 0.25) !important;
          color: #ffffff !important;
        }

        @media (max-width: 768px) {
          .form-panel, .list-panel {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .form-grid-2 {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .tab-navigation-bar {
            gap: 4px;
            padding: 3px;
            margin-bottom: 12px;
            flex-wrap: nowrap;
            overflow-x: auto;
            border-radius: 9999px;
          }
          .tab-btn {
            padding: 6px 12px;
            font-size: 0.78rem;
            border-radius: 9999px;
            height: 32px;
          }
          .tab-text-full {
            display: none !important;
          }
          .tab-text-short {
            display: inline !important;
          }
          .leaves-panel {
            padding: 14px 10px !important;
          }
          .leaves-header-bar {
            gap: 10px;
            margin-bottom: 14px;
          }
          .leaves-header-titles h3 {
            font-size: 1.05rem !important;
          }
          .leaves-header-titles p {
            font-size: 0.76rem !important;
          }
          .leaves-filter-toolbar {
            padding: 10px 8px;
            gap: 10px;
            margin-bottom: 14px;
          }
          .filter-dropdowns-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .form-actions-row {
            gap: 8px;
          }
          .form-actions-row .btn {
            flex: 1;
            padding: 8px 12px;
            font-size: 0.8rem;
          }
          .standard-month-navigator {
            padding: 10px 10px;
            gap: 8px;
          }
          .smn-header {
            gap: 6px;
          }
          .smn-nav-btn {
            padding: 5px 8px;
            font-size: 0.72rem;
          }
          .smn-title {
            font-size: 0.88rem;
          }
          .smn-badge {
            font-size: 0.68rem;
            padding: 1px 6px;
          }
          .smn-pill {
            padding: 5px 10px;
            font-size: 0.74rem;
          }
        }

        @media (max-width: 480px) {
          .smn-header {
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .smn-current-info {
            order: 1;
            width: 100%;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .smn-prev {
            order: 2;
            flex: 1;
            justify-content: center;
          }
          .smn-next {
            order: 3;
            flex: 1;
            justify-content: center;
          }
          .tab-navigation-bar {
            margin-bottom: 10px;
          }
          .tab-btn {
            padding: 5px 9px;
            font-size: 0.74rem;
            height: 30px;
          }
          .leaves-kpi-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 12px;
          }
          .kpi-card {
            padding: 8px 10px !important;
          }
          .kpi-label {
            font-size: 0.66rem !important;
          }
          .kpi-value {
            font-size: 1.25rem !important;
          }
          .kpi-sub {
            font-size: 0.65rem !important;
          }
          .filter-dropdowns-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .leaves-header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .leaves-header-actions .btn {
            flex: 1;
            justify-content: center;
          }
        }

      `}</style>
    </div>
  );
}

export default LeavesContent;
