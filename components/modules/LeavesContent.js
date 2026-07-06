'use client';

import React, { useState, useEffect, Suspense } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LeavesIcon, 
  TasksIcon, 
  ChevronIcon, 
  WarningIcon, 
  ChangeIcon, 
  CheckIcon, 
  DeclineIcon, 
  CloseIcon,
  EditIcon
} from '@/components/Icons';
import ConfigureLeavesTab from '@/components/ConfigureLeavesTab';

// Removed static LEAVE_ALLOWANCES and LEAVE_TYPES

function LeavesContent() {
  const { currentUser, hasPermission, leaveTypes } = useApp();
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
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [dayType, setDayType] = useState('Full Day');

  const [myLeavesSearchQuery, setMyLeavesSearchQuery] = useState('');
  const [teamLeavesSearchQuery, setTeamLeavesSearchQuery] = useState('');

  // Leave Type Selector Step states
  const [applyStep, setApplyStep] = useState(1);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredExhaustedType, setHoveredExhaustedType] = useState('');
  const [clickedExhaustedMsg, setClickedExhaustedMsg] = useState('');

  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchLeavesData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = `${API_BASE_URL}/leaves/?status=${statusFilter}&employee_id=${employeeFilter}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to fetch leaves.');
      }
      const leavesData = await res.json();
      const mappedLeaves = leavesData.map(l => ({
        ...l,
        id: String(l.id),
        employeeId: String(l.employee),
        leaveTypeId: String(l.leaveType),
        leaveType: l.leaveTypeName
      }));
      setLeaves(mappedLeaves);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch leaves data');
    } finally {
      setLoading(false);
    }
  };

  // Sync session & cached employees on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cubelogs_access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const cachedEmployeesStr = localStorage.getItem('cubelogs_employees');
      if (cachedEmployeesStr) {
        try {
          setCachedEmployees(JSON.parse(cachedEmployeesStr));
        } catch (e) {
          console.warn('Failed to parse cached employees');
        }
      }
    }
  }, [router]);

  // Re-fetch leaves when statusFilter or employeeFilter changes
  useEffect(() => {
    fetchLeavesData();
  }, [statusFilter, employeeFilter]);

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

      const res = await fetch(`${API_BASE_URL}/leaves/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to submit leave.');
      }

      const response = await res.json();
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
      const res = await fetch(`${API_BASE_URL}/leaves/${id}/status/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to update leave status.');
      }

      const updatedLeave = await res.json();
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

  const displayLeaves = leaves.filter(l => {
    const matchesEmployee = !employeeFilter || l.employeeId === employeeFilter;
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesSearch = !teamLeavesSearchQuery || 
                          (l.employeeName && l.employeeName.toLowerCase().includes(teamLeavesSearchQuery.toLowerCase())) ||
                          (l.leaveType && l.leaveType.toLowerCase().includes(teamLeavesSearchQuery.toLowerCase()));
    return matchesEmployee && matchesStatus && matchesSearch;
  });

  if (loading && !currentUser) {
    return (
      <PageWrapper title="Leave Management Center" requiredPermission={['leaves:apply', 'leaves:approve', 'leaves:manage', 'attendance:staff']}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading leave data...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  const myLeaves = leaves.filter(l => l.employeeId === currentUser.id);
  const canApplyLeaves = hasPermission('leaves:apply');
  const canApproveLeaves = hasPermission('leaves:approve');
  const canManageLeaves = hasPermission('leaves:manage');

  return (
    <PageWrapper title="Leave Management Center" requiredPermission={['leaves:apply', 'leaves:approve', 'leaves:manage', 'attendance:staff']}>
      
      {/* TABS NAVIGATION BAR */}
      <div className="tab-navigation-bar">
        {canApplyLeaves && (
          <button 
            className={`tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => handleTabChange('apply')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <LeavesIcon size={16} />
              <span>Apply Leave Form ({myLeaves.length})</span>
            </div>
          </button>
        )}
        {canApproveLeaves && (
          <button 
            className={`tab-btn ${activeTab === 'approve' ? 'active' : ''}`}
            onClick={() => handleTabChange('approve')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <TasksIcon size={16} />
              <span>Approval Dashboard ({leaves.filter(l => l.status === 'Pending').length} Pending)</span>
            </div>
          </button>
        )}
        {canManageLeaves && (
          <button 
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => handleTabChange('manage')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <EditIcon size={16} />
              <span>Configure Leave Rules</span>
            </div>
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

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          type="submit" 
                          className={`btn ${(blockedDate || advanceBlockReason) ? 'btn-disabled' : 'btn-primary'}`} 
                          style={{ padding: '12px 24px' }}
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
                          style={{ padding: '12px 24px' }}
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
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Active Leave Request Approvals</span>
                </h3>
                {(employeeFilter || statusFilter !== 'Pending') && (
                  <button 
                    onClick={() => {
                      setEmployeeFilter('');
                      setStatusFilter('Pending');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Clear Filters</span>
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Review and approve or decline pending vacation forms.
              </p>

              {/* Interactive Filter Bar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Search Requests</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search employee or type..."
                    value={teamLeavesSearchQuery}
                    onChange={(e) => setTeamLeavesSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Employee</label>
                  <select
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Status</label>
                  <select
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Dates Requested</th>
                      <th>Reasoning</th>
                      <th>Status Badge</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data-text">
                          {employeeFilter || statusFilter !== 'Pending' 
                            ? 'No leaves matching the selected filters.' 
                            : 'No leaves in system.'}
                        </td>
                      </tr>
                    ) : (
                      displayLeaves.map(leave => (
                        <tr key={leave.id}>
                          <td><strong>{leave.employeeName}</strong></td>
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
                          <td>
                            {leave.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  className="btn btn-primary btn-sm" 
                                  onClick={() => handleStatusChange(leave.id, 'Approved')}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <CheckIcon size={12} />
                                  <span>Approve</span>
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <DeclineIcon size={12} />
                                  <span>Decline</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Decided</span>
                            )}
                          </td>
                        </tr>
                      ))
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
        .tab-navigation-bar {
          display: flex;
          gap: 12px;
          border-bottom: 2px solid var(--border);
          margin-bottom: 24px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 12px 20px;
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-light);
          cursor: pointer;
          position: relative;
          transition: var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--primary);
        }

        .tab-btn.active {
          color: var(--primary);
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary);
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

        @media (max-width: 768px) {
          .form-panel, .list-panel {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .form-grid-2 {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tab-navigation-bar {
            gap: 6px;
            flex-wrap: wrap;
          }
          .tab-btn {
            width: 100%;
            text-align: center;
            padding: 10px 14px;
          }
        }
      `}</style>
    </PageWrapper>
  );
}

export default LeavesContent;
