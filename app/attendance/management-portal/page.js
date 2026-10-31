'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api';
import {
  AttendanceIcon,
  ClockIcon,
  CheckIcon,
  WarningIcon,
  LeavesIcon,
  AuditIcon,
  ChangeIcon,
  ShieldIcon,
  EyeIcon,
  CloseIcon,
  EmployeesIcon,
  CalendarIcon,
  SearchIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from '@/components/Icons';

const STATUS_CONFIG = {
  'Pending Approval': { bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1', dot: '#0284c7' },
  'Approved':         { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: '#1d4ed8' },
  'Late':             { bg: '#fef3c7', border: '#fde68a', text: '#b45309', dot: '#d97706' },
  'Half Day':         { bg: '#e0e7ff', border: '#c7d2fe', text: '#3730a3', dot: '#4338ca' },
  'Absent':           { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', dot: '#64748b' },
  'On Leave':         { bg: '#f3e8ff', border: '#e9d5ff', text: '#6b21a8', dot: '#8b5cf6' },
};

const fmt12h = (s) => {
  if (!s) return '--';
  try { return new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return s; }
};

const getInitials = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : 'E';

const AvatarPill = ({ name, color = '#2563eb', size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    backgroundColor: `${color}15`,
    color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    border: `1.5px solid ${color}30`,
  }}>
    {getInitials(name)}
  </div>
);

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Pending Approval'];
  const shortText = status === 'Pending Approval' ? 'Pending' : status;
  return (
    <span className="portal-status-pill" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: '16px', background: cfg.bg,
      border: `1px solid ${cfg.border}`, fontSize: '0.75rem', fontWeight: 600, color: cfg.text,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
      <span className="status-full">{status}</span>
      <span className="status-short">{shortText}</span>
      <style jsx>{`
        .status-short {
          display: none;
        }
        @media (max-width: 480px) {
          .status-full {
            display: none;
          }
          .status-short {
            display: inline;
          }
        }
      `}</style>
    </span>
  );
};

const LogRow = ({ log, onApprove, approving, approved }) => {
  const isApproved = approved || log.status === 'Approved';
  const isShiftActive = !log.clockOut && (() => {
    if (!log.clockIn) return false;
    const logDate = log.clockIn.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (logDate !== today) return false;
    if (log.shiftEnd) {
      try {
        const [shH, shM] = log.shiftEnd.split(':').map(Number);
        const now = new Date();
        const endDt = new Date();
        endDt.setHours(shH, shM, 0, 0);
        return now < endDt;
      } catch {
        return true;
      }
    }
    return true; // Still open session today
  })();

  return (
    <div className="portal-log-card">
      {/* Header: Avatar + Employee Name & Role + Status */}
      <div className="portal-card-header">
        <div className="portal-user-group">
          <AvatarPill name={log.employeeName} color={isApproved ? '#1d4ed8' : '#2563eb'} size={36} />
          <div className="portal-user-meta">
            <div className="portal-user-name">{log.employeeName}</div>
            <div className="portal-role-row">
              <span className="portal-role-tag">{log.employeeDesignation || 'Staff'}</span>
            </div>
          </div>
        </div>
        <div className="portal-status-wrapper">
          <StatusPill status={isApproved ? 'Approved' : log.status} />
        </div>
      </div>

      {/* Middle: Sleek, Unified Attendance Punch Bar */}
      <div className="portal-punch-strip">
        <div className="punch-col">
          <span className="punch-label">CLOCK IN</span>
          <span className="punch-value">{fmt12h(log.clockIn)}</span>
        </div>

        <div className="punch-divider" />

        <div className="punch-col">
          <span className="punch-label">CLOCK OUT</span>
          {log.clockOut ? (
            <span className="punch-value">{fmt12h(log.clockOut)}</span>
          ) : (
            <span className="punch-value punch-active-badge">
              <span className="active-dot" /> In Progress
            </span>
          )}
        </div>

        {log.minutesLate !== undefined && log.minutesLate > 0 && (
          <>
            <div className="punch-divider" />
            <div className="punch-col punch-col-late">
              <span className="punch-label">LATE</span>
              <span className="punch-value punch-late-text">+{log.minutesLate}m</span>
            </div>
          </>
        )}
      </div>

      {/* Bottom Footer: Notice or Approval Action */}
      {!isApproved && onApprove && (
        <div className="portal-action-row">
          {isShiftActive ? (
            <div className="portal-active-banner">
              <ClockIcon size={13} style={{ color: '#b45309', flexShrink: 0 }} />
              <span>Shift active &bull; Approvals unlock after clock-out</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary portal-approve-btn"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderColor: '#1d4ed8',
              }}
              onClick={() => onApprove(log.id)}
              disabled={approving}
            >
              {approving ? (
                <span style={{ color: '#ffffff' }}>Approving...</span>
              ) : (
                <span style={{ color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CheckIcon size={14} style={{ color: '#ffffff', stroke: '#ffffff' }} />
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Approve Attendance</span>
                </span>
              )}
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .portal-log-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .portal-log-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        .portal-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .portal-user-group {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          flex: 1;
        }
        .portal-user-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .portal-user-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text-main, #0f172a);
          line-height: 1.25;
          word-break: break-word;
        }
        .portal-role-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .portal-role-tag {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, #64748b);
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0 6px;
          line-height: 1.5;
          display: inline-block;
          width: fit-content;
        }
        .portal-status-wrapper {
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Unified Punch Strip */
        .portal-punch-strip {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          border-radius: 8px;
          padding: 8px 12px;
          gap: 10px;
        }
        .punch-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .punch-col-late {
          flex: 0 0 auto;
        }
        .punch-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1;
        }
        .punch-value {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-main, #0f172a);
          white-space: nowrap;
          line-height: 1.2;
        }
        .punch-active-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #b45309;
          font-weight: 700;
          font-size: 0.8rem;
        }
        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d97706;
          display: inline-block;
        }
        .punch-late-text {
          color: #b45309;
          font-weight: 700;
        }
        .punch-divider {
          width: 1px;
          height: 24px;
          background: #e2e8f0;
          flex-shrink: 0;
        }

        /* Action Row */
        .portal-action-row {
          margin-top: 1px;
          padding-top: 8px;
          border-top: 1px solid var(--border-light, #f1f5f9);
        }
        .portal-active-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #92400e;
          width: 100%;
        }
        .portal-approve-btn,
        .portal-approve-btn *,
        .portal-approve-btn span {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
        .portal-approve-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #ffffff !important;
          background-color: #2563eb !important;
          border: 1px solid #1d4ed8;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .portal-approve-btn:hover:not(:disabled) {
          background-color: #1d4ed8;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
        }
        .portal-approve-btn:active:not(:disabled) {
          background-color: #1e40af;
        }
        .portal-approve-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (min-width: 641px) {
          .portal-log-card {
            padding: 14px 18px;
            gap: 12px;
          }
          .portal-punch-strip {
            padding: 9px 16px;
          }
          .portal-approve-btn {
            width: auto;
            margin-left: auto;
          }
          .portal-action-row {
            display: flex;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

const AbsentRow = ({ item, isLeave }) => (
  <div className="portal-log-card">
    <div className="portal-card-header">
      <div className="portal-user-group">
        <AvatarPill name={item.employeeName} color={isLeave ? '#8b5cf6' : '#64748b'} size={36} />
        <div className="portal-user-meta">
          <div className="portal-user-name">{item.employeeName}</div>
          <div className="portal-role-row">
            <span className="portal-role-tag">{item.designation || item.employeeDesignation || 'Staff'}</span>
          </div>
        </div>
      </div>
      <div className="portal-status-wrapper">
        <StatusPill status={isLeave ? 'On Leave' : 'Absent'} />
      </div>
    </div>

    <div className="portal-punch-strip">
      {isLeave ? (
        <div className="punch-col">
          <span className="punch-label">LEAVE TYPE</span>
          <span className="punch-value" style={{ color: '#6b21a8', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <LeavesIcon size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
            {item.leaveTypeName || 'Approved Leave'}
          </span>
        </div>
      ) : (
        <div className="punch-col">
          <span className="punch-label">ATTENDANCE</span>
          <span className="punch-value" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <WarningIcon size={13} style={{ color: '#64748b', flexShrink: 0 }} />
            No clock-in recorded today
          </span>
        </div>
      )}
    </div>

    <style jsx>{`
      .portal-log-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border, #e2e8f0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      }
      .portal-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .portal-user-group {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        flex: 1;
      }
      .portal-user-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .portal-user-name {
        font-weight: 700;
        font-size: 0.88rem;
        color: var(--text-main, #0f172a);
        line-height: 1.25;
        word-break: break-word;
      }
      .portal-role-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .portal-role-tag {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted, #64748b);
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 0 6px;
        line-height: 1.5;
        display: inline-block;
        width: fit-content;
      }
      .portal-status-wrapper {
        flex-shrink: 0;
        margin-top: 1px;
      }
      .portal-punch-strip {
        display: flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid #edf2f7;
        border-radius: 8px;
        padding: 8px 12px;
      }
      .punch-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .punch-label {
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--text-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1;
      }
      .punch-value {
        font-size: 0.84rem;
        font-weight: 700;
        color: var(--text-main, #0f172a);
        line-height: 1.2;
      }
      @media (min-width: 641px) {
        .portal-log-card {
          padding: 14px 18px;
          gap: 12px;
        }
        .portal-punch-strip {
          padding: 9px 16px;
        }
      }
    `}</style>
  </div>
);

const EmptyState = ({ IconComponent = CheckIcon, msg }) => (
  <div style={{
    padding: '44px 20px', textAlign: 'center',
    background: 'var(--surface-elevated, #f8fafc)', borderRadius: 'var(--radius-md, 10px)',
    border: '1px dashed var(--border, #e2e8f0)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px'
  }}>
    <div style={{ color: 'var(--text-muted, #94a3b8)', display: 'flex' }}>
      <IconComponent size={32} />
    </div>
    <p style={{ color: 'var(--text-muted, #64748b)', fontWeight: 500, fontSize: '0.88rem', margin: 0 }}>{msg}</p>
  </div>
);

const getAuditActionStyle = (action) => {
  switch (action) {
    case 'Attendance Status Updated':
    case 'Approved':
      return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#2563eb', label: 'Status Approved' };
    case 'Attendance Override':
      return { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#d97706', label: 'Manual Override' };
    case 'Clocked In':
      return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#16a34a', label: 'Clocked In' };
    case 'Clocked Out':
      return { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', dot: '#64748b', label: 'Clocked Out' };
    case 'Clock-Out Attempt Rejected':
      return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#dc2626', label: 'Punch Rejected' };
    case 'Attendance Period Finalized':
      return { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', dot: '#9333ea', label: 'Period Locked' };
    case 'Attendance Period Reopened':
      return { bg: '#fff7ed', border: '#ffedd5', text: '#c2410c', dot: '#ea580c', label: 'Period Reopened' };
    case 'Leave Applied':
    case 'Leave Status Updated':
      return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', dot: '#7c3aed', label: 'Leave Event' };
    default:
      return { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', dot: '#475569', label: action };
  }
};

const formatAuditDateTime = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateFormatted} • ${timeFormatted}`;
  } catch {
    return isoStr;
  }
};

const getAuditRelativeTime = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const diffSec = Math.floor((new Date() - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
};

export default function HRAttendancePortalPage() {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly' | 'yearly'
  const [activeTab, setActiveTab] = useState('pending');
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());

  // Attendance Audit Trail States
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Daily View Date State
  const [dailyDate, setDailyDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Period Finalization State
  const now = new Date();
  const defaultPastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultPastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [periodMonth, setPeriodMonth] = useState(defaultPastMonth);
  const [periodYear, setPeriodYear] = useState(defaultPastYear);
  const [periodData, setPeriodData] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [periodSuccess, setPeriodSuccess] = useState('');
  const [monthlySearch, setMonthlySearch] = useState('');

  // Yearly View State
  const [yearlyYear, setYearlyYear] = useState(() => now.getFullYear());
  const [yearlyData, setYearlyData] = useState([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlySearch, setYearlySearch] = useState('');

  // Custom Date Range State
  const defaultThirtyDaysAgo = new Date();
  defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
  const [rangeStart, setRangeStart] = useState(() => defaultThirtyDaysAgo.toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [rangeData, setRangeData] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [rangeSearch, setRangeSearch] = useState('');
  const [exportingCSV, setExportingCSV] = useState(false);

  const fetchRangeData = useCallback(async (start = rangeStart, end = rangeEnd) => {
    setRangeLoading(true);
    setRangeError('');
    try {
      const res = await apiFetch(`/attendance/?start_date=${start}&end_date=${end}&page_size=1000`);
      const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
      setRangeData(list);
    } catch (e) {
      setRangeError(e.message || 'Failed to load custom date range attendance.');
    } finally {
      setRangeLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (viewMode === 'range') {
      fetchRangeData(rangeStart, rangeEnd);
    }
  }, [viewMode, rangeStart, rangeEnd, fetchRangeData]);

  const filteredRangeData = rangeData.filter(item => {
    if (!rangeSearch) return true;
    const q = rangeSearch.toLowerCase();
    return (item.employeeName && item.employeeName.toLowerCase().includes(q)) ||
           (item.status && item.status.toLowerCase().includes(q)) ||
           (item.date && item.date.includes(q)) ||
           (item.employeeDesignation && item.employeeDesignation.toLowerCase().includes(q));
  });

  const handleExportRangeCSV = async () => {
    let dataset = rangeData;

    // If rangeData is empty, fetch it automatically before exporting
    if (!dataset || dataset.length === 0) {
      setExportingCSV(true);
      try {
        const fetched = await apiFetch(`/attendance/?start_date=${rangeStart}&end_date=${rangeEnd}&page_size=1000`);
        const list = Array.isArray(fetched) ? fetched : (fetched?.results || fetched?.data || []);
        if (list.length === 0) {
          alert(`No attendance records found between ${rangeStart} and ${rangeEnd}.`);
          return;
        }
        setRangeData(list);
        dataset = list;
      } catch (err) {
        alert(err.message || 'Failed to fetch attendance data for export.');
        return;
      } finally {
        setExportingCSV(false);
      }
    }

    const exportList = rangeSearch.trim() ? filteredRangeData : dataset;

    if (exportList.length === 0) {
      alert('No records matching the search query to export.');
      return;
    }

    const headers = ['Employee Name', 'Designation', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status'];
    const rows = exportList.map(r => {
      const clockInStr = r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';
      const clockOutStr = r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : (!r.clockIn ? '--' : 'Shift Active');
      const durationStr = formatDurationStr(r);
      const name = (r.employeeName || '').replace(/"/g, '""');
      const designation = (r.employeeDesignation || 'Staff').replace(/"/g, '""');
      const dateStr = r.date || (r.clockIn ? r.clockIn.split('T')[0] : '');
      const status = r.status || 'Pending Approval';

      return [
        `"${name}"`,
        `"${designation}"`,
        `"${dateStr}"`,
        `"${clockInStr}"`,
        `"${clockOutStr}"`,
        `"${durationStr}"`,
        `"${status}"`
      ];
    });

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${rangeStart}_to_${rangeEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reopen Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  // Finalize Processing State
  const [finalizing, setFinalizing] = useState(false);

  // Snapshot Viewer State
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const fetchDashboard = useCallback(async (targetDate = dailyDate) => {
    try {
      setError('');
      const data = await apiFetch(`/attendance/hr-dashboard/?date=${targetDate}`);
      setDashData(data);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [dailyDate]);

  const fetchPeriodSummary = useCallback(async (year, month) => {
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const data = await apiFetch(`/attendance/periods/summary/?year=${year}&month=${month}`);
      setPeriodData(data);
    } catch (e) {
      setPeriodError(e.message || 'Failed to load period summary.');
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  const fetchSnapshots = useCallback(async (year, month) => {
    setSnapshotsLoading(true);
    try {
      const data = await apiFetch(`/attendance/periods/snapshots/?year=${year}&month=${month}`);
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load snapshots:', e);
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  const fetchYearlyData = useCallback(async (year) => {
    setYearlyLoading(true);
    try {
      const data = await apiFetch(`/attendance/periods/yearly-summary/?year=${year}`);
      setYearlyData(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load yearly data:', e);
    } finally {
      setYearlyLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await apiFetch('/audit-logs/?module=attendance');
      const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
      setAuditLogs(list);
    } catch (err) {
      console.error('Failed to fetch attendance audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    fetchDashboard(dailyDate);
    const t = setInterval(() => fetchDashboard(dailyDate), 30000);
    return () => clearInterval(t);
  }, [dailyDate, fetchDashboard]);

  useEffect(() => {
    fetchPeriodSummary(periodYear, periodMonth);
    fetchSnapshots(periodYear, periodMonth);
  }, [periodYear, periodMonth, fetchPeriodSummary, fetchSnapshots]);

  useEffect(() => {
    if (viewMode === 'yearly') {
      fetchYearlyData(yearlyYear);
    }
  }, [viewMode, yearlyYear, fetchYearlyData]);

  const handlePrevDay = () => {
    const d = new Date(dailyDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const iso = d.toISOString().split('T')[0];
    setDailyDate(iso);
  };

  const handleNextDay = () => {
    const d = new Date(dailyDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().split('T')[0];
    setDailyDate(iso);
  };

  const handleToday = () => {
    const iso = new Date().toISOString().split('T')[0];
    setDailyDate(iso);
  };

  const handleApprove = async (logId) => {
    setApprovingId(logId);
    try {
      await apiFetch(`/attendance/${logId}/approve/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved' }),
      });
      setApprovedIds(prev => new Set([...prev, logId]));
      fetchAuditLogs();
    } catch (e) {
      alert(e.message || 'Failed to approve.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleFinalizePeriod = async () => {
    if (!confirm(`Are you sure you want to finalize and lock attendance for ${MONTH_NAMES[periodMonth - 1]} ${periodYear}? Once finalized, all attendance, leave, and holiday records will be locked.`)) {
      return;
    }
    setFinalizing(true);
    setPeriodError('');
    setPeriodSuccess('');
    try {
      const res = await apiFetch('/attendance/periods/finalize/', {
        method: 'POST',
        body: JSON.stringify({ year: periodYear, month: periodMonth }),
      });
      setPeriodSuccess(`Month finalized successfully! Snapshot Revision ${res.current_revision} is locked and ready for payroll.`);
      fetchPeriodSummary(periodYear, periodMonth);
    } catch (e) {
      setPeriodError(e.message || 'Failed to finalize attendance period.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenPeriod = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      alert('A valid reason of at least 5 characters is required.');
      return;
    }
    setReopening(true);
    setPeriodError('');
    setPeriodSuccess('');
    try {
      const res = await apiFetch('/attendance/periods/reopen/', {
        method: 'POST',
        body: JSON.stringify({
          year: periodYear,
          month: periodMonth,
          reason: reopenReason.trim(),
        }),
      });
      setPeriodSuccess(`Period reopened into Draft mode. Records for ${MONTH_NAMES[periodMonth - 1]} ${periodYear} are unlocked for editing.`);
      setShowReopenModal(false);
      setReopenReason('');
      fetchPeriodSummary(periodYear, periodMonth);
    } catch (e) {
      alert(e.message || 'Failed to reopen attendance period.');
    } finally {
      setReopening(false);
    }
  };

  const handleViewSnapshots = async () => {
    setShowSnapshotsModal(true);
    setSnapshotsLoading(true);
    try {
      const data = await apiFetch(`/attendance/periods/snapshots/?year=${periodYear}&month=${periodMonth}`);
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message || 'Failed to load snapshots.');
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!filteredSnapshots || filteredSnapshots.length === 0) return;
    const headers = [
      'Employee Name', 'Designation', 'Working Days', 'Present Days',
      'Half Days', 'Leave Days', 'Absent Days', 'Late Count',
      'Late Minutes', 'Payable Units', 'Attendance Rate'
    ];
    const rows = filteredSnapshots.map(s => {
      const wDays = s.working_days || 0;
      const pDays = s.present_days || 0;
      const rate = wDays > 0 ? `${Math.round((pDays / wDays) * 100)}%` : '0%';
      return [
        `"${(s.employee_name || '').replace(/"/g, '""')}"`,
        `"${(s.designation || 'Staff').replace(/"/g, '""')}"`,
        wDays,
        pDays,
        s.half_days || 0,
        s.leave_days || 0,
        s.absent_days || 0,
        s.late_count || 0,
        s.total_late_minutes || 0,
        s.payable_attendance_units ?? pDays,
        rate
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${MONTH_NAMES[periodMonth - 1]}_${periodYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = dashData?.summary || {};
  const pending = dashData?.pending || [];
  const late    = dashData?.late    || [];
  const onLeave = dashData?.on_leave || [];
  const absent  = dashData?.absent  || [];
  const needsReview = dashData?.needs_review || [];

  const tabs = [
    { id: 'pending', label: `Pending Approvals (${summary.pendingCount ?? 0})` },
    { id: 'late',    label: `Late Comers (${summary.lateCount ?? 0})` },
    { id: 'absent',  label: `Leave & Absent (${(summary.onLeaveCount ?? 0) + (summary.absentCount ?? 0)})` },
    { id: 'needs_review', label: `Needs Review (${summary.needsReviewCount ?? 0})` },
    { id: 'audit_trail', label: `Audit Trail & History (${auditLogs.length})` },
  ];

  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditActionFilter === 'approvals') {
      if (!['Attendance Status Updated', 'Approved'].includes(log.action)) return false;
    } else if (auditActionFilter === 'overrides') {
      if (!['Attendance Override'].includes(log.action)) return false;
    } else if (auditActionFilter === 'clock') {
      if (!['Clocked In', 'Clocked Out', 'Clock-Out Attempt Rejected'].includes(log.action)) return false;
    } else if (auditActionFilter === 'period') {
      if (!['Attendance Period Finalized', 'Attendance Period Reopened'].includes(log.action)) return false;
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const matchesActor = log.employeeName?.toLowerCase().includes(q);
      const matchesDetails = log.details?.toLowerCase().includes(q);
      const matchesAction = log.action?.toLowerCase().includes(q);
      if (!matchesActor && !matchesDetails && !matchesAction) return false;
    }
    return true;
  });

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / auditPageSize) || 1;
  const currentAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);
  const auditStartIndex = (currentAuditPage - 1) * auditPageSize;
  const auditEndIndex = Math.min(auditStartIndex + auditPageSize, filteredAuditLogs.length);
  const paginatedAuditLogs = filteredAuditLogs.slice(auditStartIndex, auditEndIndex);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentPeriod = periodData?.period;
  const periodValidation = periodData?.validation;
  const isFinalized = currentPeriod?.status === 'Finalized';
  const isPastMonth = periodValidation?.is_past_month;
  const isClean = periodValidation?.is_clean;

  const filteredSnapshots = snapshots.filter(s => {
    if (!monthlySearch) return true;
    const q = monthlySearch.toLowerCase();
    return (s.employee_name && s.employee_name.toLowerCase().includes(q)) ||
           (s.designation && s.designation.toLowerCase().includes(q));
  });

  const filteredYearly = yearlyData.filter(s => {
    if (!yearlySearch) return true;
    const q = yearlySearch.toLowerCase();
    return (s.employee_name && s.employee_name.toLowerCase().includes(q)) ||
           (s.designation && s.designation.toLowerCase().includes(q));
  });

  return (
    <PageWrapper title="Attendance Management Portal" requiredPermission="attendance:management_portal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Bar */}
        <div className="panel settings-panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0, marginBottom: '4px' }}>
              Attendance Management Center
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Real-time daily monitoring, monthly attendance register & lock, and yearly workforce matrix
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (viewMode === 'daily') { setLoading(true); fetchDashboard(dailyDate); }
                else if (viewMode === 'monthly') { fetchPeriodSummary(periodYear, periodMonth); fetchSnapshots(periodYear, periodMonth); }
                else if (viewMode === 'yearly') { fetchYearlyData(yearlyYear); }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <ChangeIcon size={14} /> Refresh Data
            </button>
          </div>
        </div>

        {/* View Mode Switcher: Daily Monitor | Monthly Register | Yearly Matrix */}
        <div className="portal-view-switcher" style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          borderBottom: '2px solid var(--border, #e2e8f0)',
          paddingBottom: '12px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'daily' ? 'btn-white-text btn-blue-active' : ''}`}
            data-active-blue={viewMode === 'daily' ? 'true' : undefined}
            data-white-text={viewMode === 'daily' ? 'true' : undefined}
            onClick={() => setViewMode('daily')}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: viewMode === 'daily' ? '700' : '600',
              borderRadius: 'var(--radius-sm, 6px)',
              background: viewMode === 'daily' ? 'var(--primary, #2563eb)' : 'var(--bg-card, #ffffff)',
              color: viewMode === 'daily' ? '#ffffff' : 'var(--text-main, #0f172a)',
              border: viewMode === 'daily' ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #cbd5e1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewMode === 'daily' ? '0 2px 4px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ClockIcon size={16} /> <span className={viewMode === 'daily' ? 'active-tab-text' : ''} style={{ color: viewMode === 'daily' ? '#ffffff' : 'inherit', whiteSpace: 'nowrap' }}>Daily Monitor</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'range' ? 'btn-white-text btn-blue-active' : ''}`}
            data-active-blue={viewMode === 'range' ? 'true' : undefined}
            data-white-text={viewMode === 'range' ? 'true' : undefined}
            onClick={() => setViewMode('range')}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: viewMode === 'range' ? '700' : '600',
              borderRadius: 'var(--radius-sm, 6px)',
              background: viewMode === 'range' ? 'var(--primary, #2563eb)' : 'var(--bg-card, #ffffff)',
              color: viewMode === 'range' ? '#ffffff' : 'var(--text-main, #0f172a)',
              border: viewMode === 'range' ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #cbd5e1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewMode === 'range' ? '0 2px 4px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarIcon size={16} /> <span className={viewMode === 'range' ? 'active-tab-text' : ''} style={{ color: viewMode === 'range' ? '#ffffff' : 'inherit', whiteSpace: 'nowrap' }}>Custom Date Range</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'monthly' ? 'btn-white-text btn-blue-active' : ''}`}
            data-active-blue={viewMode === 'monthly' ? 'true' : undefined}
            data-white-text={viewMode === 'monthly' ? 'true' : undefined}
            onClick={() => setViewMode('monthly')}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: viewMode === 'monthly' ? '700' : '600',
              borderRadius: 'var(--radius-sm, 6px)',
              background: viewMode === 'monthly' ? 'var(--primary, #2563eb)' : 'var(--bg-card, #ffffff)',
              color: viewMode === 'monthly' ? '#ffffff' : 'var(--text-main, #0f172a)',
              border: viewMode === 'monthly' ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #cbd5e1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewMode === 'monthly' ? '0 2px 4px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarIcon size={16} /> <span className={viewMode === 'monthly' ? 'active-tab-text' : ''} style={{ color: viewMode === 'monthly' ? '#ffffff' : 'inherit', whiteSpace: 'nowrap' }}>Monthly Register & Lock</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'yearly' ? 'btn-white-text btn-blue-active' : ''}`}
            data-active-blue={viewMode === 'yearly' ? 'true' : undefined}
            data-white-text={viewMode === 'yearly' ? 'true' : undefined}
            onClick={() => setViewMode('yearly')}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: viewMode === 'yearly' ? '700' : '600',
              borderRadius: 'var(--radius-sm, 6px)',
              background: viewMode === 'yearly' ? 'var(--primary, #2563eb)' : 'var(--bg-card, #ffffff)',
              color: viewMode === 'yearly' ? '#ffffff' : 'var(--text-main, #0f172a)',
              border: viewMode === 'yearly' ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #cbd5e1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewMode === 'yearly' ? '0 2px 4px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <AuditIcon size={16} /> <span className={viewMode === 'yearly' ? 'active-tab-text' : ''} style={{ color: viewMode === 'yearly' ? '#ffffff' : 'inherit', whiteSpace: 'nowrap' }}>Yearly Matrix</span>
          </button>
        </div>

        {error && (
          <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)' }}>
            <WarningIcon size={18} /> <span>{error}</span>
          </div>
        )}

        {loading && !dashData && (
          <div className="panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted, #64748b)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--primary-border, #bfdbfe)', borderTopColor: 'var(--primary, #2563eb)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <span>Loading real-time attendance monitor...</span>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}

        {viewMode === 'daily' && dashData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Daily Date Navigator */}
            <div className="panel settings-panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} style={{ color: 'var(--primary, #2563eb)' }} />
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                  Selected Date:
                </span>
                <span style={{ fontWeight: '600', color: 'var(--primary, #2563eb)', fontSize: '0.86rem' }}>
                  {new Date(dailyDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrevDay}
                  style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: '600' }}
                >
                  <ChevronLeftIcon size={14} /> Prev Day
                </button>
                <input
                  type="date"
                  className="form-control"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.84rem', fontWeight: '600', borderRadius: 'var(--radius-sm, 6px)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleNextDay}
                  style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: '600' }}
                >
                  Next Day <ChevronRightIcon size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleToday}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', background: 'var(--primary-light, #eff6ff)', color: 'var(--primary, #2563eb)', border: '1px solid var(--primary-border, #bfdbfe)' }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Stat Cards Row */}
            <div className="portal-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Approvals</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>{summary.pendingCount ?? 0}</div>
              </div>
              
              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Late Comers</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>{summary.lateCount ?? 0}</div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>On Leave Today</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>{summary.onLeaveCount ?? 0}</div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #64748b' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent Today</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>{summary.absentCount ?? 0}</div>
              </div>
            </div>

            {dashData.grace_period_minutes !== undefined && (
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--primary-light, #eff6ff)', border: '1px solid var(--primary-border, #bfdbfe)',
                color: 'var(--primary, #1e40af)', fontWeight: '500', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <ClockIcon size={16} />
                <span>Grace Period configured: <strong>{dashData.grace_period_minutes} minutes</strong> after official shift start time.</span>
              </div>
            )}

            {/* Main Content Card with Navigation Tabs */}
            <div className="panel settings-panel-card" style={{ padding: '24px' }}>
              
              {/* Tab Navigation */}
              <div className="module-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '12px' }}>
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn btn-sm ${isActive ? 'btn-white-text btn-blue-active' : ''}`}
                      data-active-blue={isActive ? 'true' : undefined}
                      data-white-text={isActive ? 'true' : undefined}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '8px 16px',
                        fontSize: '0.82rem',
                        fontWeight: isActive ? '700' : '600',
                        background: isActive ? 'var(--primary, #2563eb)' : 'var(--bg-app, #f8fafc)',
                        color: isActive ? '#ffffff' : 'var(--text-main, #0f172a)',
                        border: isActive ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #e2e8f0)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className={isActive ? 'active-tab-text' : ''} style={{ color: isActive ? '#ffffff' : 'inherit' }}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status Legend Indicator Bar */}
              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
                padding: '10px 16px', borderRadius: 'var(--radius-sm, 6px)', background: 'var(--bg-app, #f8fafc)',
                border: '1px solid var(--border, #e2e8f0)', marginBottom: '20px', fontSize: '0.78rem',
              }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>Status Legend:</span>
                {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                  <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} /> {st}
                  </span>
                ))}
              </div>

              {/* Tab 1: Pending Approvals */}
              {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', margin: 0 }}>Clock-Ins Awaiting HR Approval</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>Review and approve employee clock-in records requiring verification.</p>
                  </div>
                  {pending.length === 0 ? (
                    <EmptyState IconComponent={CheckIcon} msg="No pending approvals at this moment." />
                  ) : (
                    pending.map(log => (
                      <LogRow key={log.id} log={log} onApprove={handleApprove} approving={approvingId === log.id} approved={approvedIds.has(log.id)} />
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Late Comers */}
              {activeTab === 'late' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', margin: 0 }}>Late Arrival Logs Today</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>Employees who recorded clock-in after the grace period ended.</p>
                  </div>
                  {late.length === 0 ? (
                    <EmptyState IconComponent={ClockIcon} msg="No late arrivals recorded today!" />
                  ) : (
                    late.map(log => (
                      <LogRow key={log.id} log={log} onApprove={handleApprove} approving={approvingId === log.id} approved={approvedIds.has(log.id)} />
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: On Leave & Absent */}
              {activeTab === 'absent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {onLeave.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LeavesIcon size={16} /> <span>Approved Leave Today ({onLeave.length})</span>
                      </div>
                      {onLeave.map(item => <AbsentRow key={`lv-${item.id}`} item={item} isLeave={true} />)}
                    </div>
                  )}

                  {absent.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <WarningIcon size={16} /> <span>No Clock-In Recorded ({absent.length})</span>
                      </div>
                      {absent.map(emp => <AbsentRow key={`ab-${emp.id}`} item={emp} isLeave={false} />)}
                    </div>
                  )}

                  {onLeave.length === 0 && absent.length === 0 && (
                    <EmptyState IconComponent={CheckIcon} msg="All employees are present and accounted for!" />
                  )}
                </div>
              )}

              {/* Tab 4: Needs Review */}
              {activeTab === 'needs_review' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#991b1b', margin: 0 }}>Attendance Records Requiring Attention</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Flagged for missing clock-out, pending approval, or attendance/leave conflict.</p>
                  </div>
                  {needsReview.length === 0 ? (
                    <EmptyState IconComponent={CheckIcon} msg="All attendance records are payroll-ready and clean!" />
                  ) : (
                    needsReview.map(item => (
                      <div key={`nr-${item.id}`} style={{
                        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                        padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)',
                        background: '#fffbeb', border: '1px solid #fde68a',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        <AvatarPill name={item.employeeName} color="#b45309" />
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)', marginBottom: 2 }}>
                            {item.employeeName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{item.employeeDesignation || 'Staff'}</span>
                            <span>&bull;</span>
                            <span>
                              {item.conflictReason ? `Conflict: ${item.conflictReason}` : (item.requiresAdminResolution ? 'Missing Clock-Out (Incomplete)' : 'Pending Approval')}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 600 }}>
                            Needs Review
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 5: Audit Trail & History */}
              {activeTab === 'audit_trail' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Header & Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AuditIcon size={18} style={{ color: 'var(--primary, #2563eb)' }} />
                        <span>Attendance & Approval Audit Trail</span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: '3px 0 0' }}>
                        Immutable corporate audit record of manager approvals, clock punches, manual overrides, and period locks.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={fetchAuditLogs}
                        disabled={auditLoading}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Refresh Audit Trail"
                      >
                        <ChangeIcon size={14} />
                        <span>{auditLoading ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                      <Link
                        href="/audit-logs"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>System Audit Logs</span>
                        <ArrowRightIcon size={12} />
                      </Link>
                    </div>
                  </div>

                  {/* Search & Filter Controls */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: 'var(--bg-subtle, #f8fafc)', padding: '12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--border, #e2e8f0)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Filter by actor, employee, or detail..."
                        value={auditSearch}
                        onChange={(e) => {
                          setAuditSearch(e.target.value);
                          setAuditPage(1);
                        }}
                        style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px', width: '100%', borderRadius: '6px' }}
                      />
                      {auditSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuditSearch('');
                            setAuditPage(1);
                          }}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                      {[
                        { id: 'all', label: 'All Activity' },
                        { id: 'approvals', label: 'Approvals' },
                        { id: 'overrides', label: 'Overrides' },
                        { id: 'clock', label: 'Clock Punches' },
                        { id: 'period', label: 'Period Actions' },
                      ].map(filter => {
                        const isFilterActive = auditActionFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            className={`audit-filter-chip ${isFilterActive ? 'active-filter-chip btn-white-text btn-blue-active' : ''}`}
                            data-active-blue={isFilterActive ? 'true' : undefined}
                            data-white-text={isFilterActive ? 'true' : undefined}
                            onClick={() => {
                              setAuditActionFilter(filter.id);
                              setAuditPage(1);
                            }}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.76rem',
                              fontWeight: isFilterActive ? 700 : 600,
                              borderRadius: '16px',
                              border: isFilterActive ? '1px solid #2563eb' : '1px solid var(--border, #cbd5e1)',
                              background: isFilterActive ? '#2563eb' : '#ffffff',
                              backgroundColor: isFilterActive ? '#2563eb' : '#ffffff',
                              color: isFilterActive ? '#ffffff' : 'var(--text-main, #334155)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span
                              className={isFilterActive ? 'active-tab-text' : ''}
                              style={{
                                color: isFilterActive ? '#ffffff' : 'inherit',
                                fontWeight: 'inherit'
                              }}
                            >
                              {filter.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit Logs Timeline List */}
                  {auditLoading && auditLogs.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p style={{ margin: 0, fontSize: '0.88rem' }}>Loading attendance activity trail...</p>
                    </div>
                  ) : filteredAuditLogs.length === 0 ? (
                    <EmptyState
                      IconComponent={AuditIcon}
                      msg={auditSearch || auditActionFilter !== 'all' ? "No audit activity matching the selected filters." : "No attendance activity recorded yet."}
                    />
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {paginatedAuditLogs.map(log => {
                          const actionStyle = getAuditActionStyle(log.action);
                          return (
                            <div
                              key={`audit-${log.id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-md, 10px)',
                                background: '#ffffff',
                                border: '1px solid var(--border, #e2e8f0)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'border-color 0.15s ease'
                              }}
                            >
                              <AvatarPill name={log.employeeName} color={actionStyle.dot} size={36} />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #0f172a)' }}>
                                      {log.employeeName || 'System'}
                                    </span>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: actionStyle.bg,
                                      border: `1px solid ${actionStyle.border}`,
                                      color: actionStyle.text,
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                    }}>
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: actionStyle.dot }} />
                                      <span>{actionStyle.label}</span>
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>
                                    <span>{formatAuditDateTime(log.createdAt)}</span>
                                    <span>&bull;</span>
                                    <span style={{ fontWeight: 500 }}>{getAuditRelativeTime(log.createdAt)}</span>
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.82rem', color: 'var(--text-main, #334155)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                                  {log.details || `Performed ${log.action}`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Best-Practice Audit Trail Pagination Controls */}
                      {filteredAuditLogs.length > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginTop: '20px',
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: 'var(--radius-md, 8px)',
                          border: '1px solid var(--border, #e2e8f0)',
                          fontSize: '0.84rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted, #64748b)' }}>
                            <span>
                              Showing <strong>{filteredAuditLogs.length === 0 ? 0 : auditStartIndex + 1}</strong> to <strong>{auditEndIndex}</strong> of <strong>{filteredAuditLogs.length}</strong> entries
                            </span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <label htmlFor="auditPageSizeSelect" style={{ fontSize: '0.8rem' }}>Show:</label>
                              <select
                                id="auditPageSizeSelect"
                                value={auditPageSize}
                                onChange={(e) => {
                                  setAuditPageSize(Number(e.target.value));
                                  setAuditPage(1);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                              disabled={currentAuditPage <= 1}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: currentAuditPage <= 1 ? '#f1f5f9' : '#ffffff',
                                color: currentAuditPage <= 1 ? '#94a3b8' : '#334155',
                                cursor: currentAuditPage <= 1 ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '0.82rem'
                              }}
                            >
                              &larr; Previous
                            </button>

                            {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1)
                              .filter(p => p === 1 || p === totalAuditPages || Math.abs(p - currentAuditPage) <= 2)
                              .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) {
                                  acc.push('...');
                                }
                                acc.push(p);
                                return acc;
                              }, [])
                              .map((item, i) => item === '...' ? (
                                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
                              ) : (
                                <button
                                  key={`page-${item}`}
                                  type="button"
                                  onClick={() => setAuditPage(item)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: item === currentAuditPage ? '1.5px solid var(--primary, #2563eb)' : '1px solid #cbd5e1',
                                    background: item === currentAuditPage ? 'var(--primary, #2563eb)' : '#ffffff',
                                    color: item === currentAuditPage ? '#ffffff' : '#334155',
                                    fontWeight: item === currentAuditPage ? '700' : '500',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem'
                                  }}
                                >
                                  {item}
                                </button>
                              ))}

                            <button
                              type="button"
                              onClick={() => setAuditPage(prev => Math.min(totalAuditPages, prev + 1))}
                              disabled={currentAuditPage >= totalAuditPages}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: currentAuditPage >= totalAuditPages ? '#f1f5f9' : '#ffffff',
                                color: currentAuditPage >= totalAuditPages ? '#94a3b8' : '#334155',
                                cursor: currentAuditPage >= totalAuditPages ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '0.82rem'
                              }}
                            >
                              Next &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Quick Recent Activity Strip at bottom of other tabs */}
              {activeTab !== 'audit_trail' && auditLogs.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AuditIcon size={16} style={{ color: 'var(--primary, #2563eb)' }} />
                      <span style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
                        Recent Activity & Audit Trail
                      </span>
                      <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: '10px', fontWeight: '600' }}>
                        Live Log
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('audit_trail')}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View Full Trail</span>
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {auditLogs.slice(0, 3).map(log => {
                      const actionStyle = getAuditActionStyle(log.action);
                      return (
                        <div
                          key={`mini-audit-${log.id}`}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md, 8px)',
                            background: 'var(--bg-subtle, #f8fafc)',
                            border: '1px solid var(--border, #e2e8f0)',
                            fontSize: '0.78rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{log.employeeName || 'System'}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>{getAuditRelativeTime(log.createdAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '1px 6px',
                              borderRadius: '8px',
                              background: actionStyle.bg,
                              border: `1px solid ${actionStyle.border}`,
                              color: actionStyle.text,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: actionStyle.dot }} />
                              <span>{actionStyle.label}</span>
                            </span>
                            <span style={{ color: 'var(--text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.details || log.action}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CUSTOM DATE RANGE ATTENDANCE QUERY                                        */}
        {/* ========================================================================= */}
        {viewMode === 'range' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Filter & Date Selection Bar */}
            <div className="panel settings-panel-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0 }}>
                  Custom Attendance Date Range Query
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.84rem' }}>
                  Select specific start and end dates to manually inspect and export detailed employee attendance records.
                </p>
              </div>

              {/* Range Date Inputs & Actions Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                background: 'var(--bg-app, #f8fafc)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--border, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '170px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap' }}>From Date:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      style={{ padding: '7px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, #cbd5e1)', width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '170px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap' }}>To Date:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      style={{ padding: '7px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, #cbd5e1)', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => fetchRangeData(rangeStart, rangeEnd)}
                    disabled={rangeLoading}
                    style={{ padding: '9px 20px', fontSize: '0.84rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    {rangeLoading ? 'Loading Records...' : 'Pull Attendance Data'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportRangeCSV}
                    disabled={exportingCSV}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '600',
                      padding: '9px 18px',
                      whiteSpace: 'nowrap',
                      background: '#ffffff',
                      border: '1px solid var(--border, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  >
                    <DownloadIcon size={14} /> {exportingCSV ? 'Generating CSV...' : 'Export Range CSV'}
                  </button>
                </div>
              </div>

              {/* Standard Dedicated Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                background: '#ffffff',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--border, #e2e8f0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <SearchIcon size={16} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted, #64748b)'
                  }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by employee name, role, date, or status..."
                    value={rangeSearch}
                    onChange={(e) => setRangeSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      paddingLeft: '38px',
                      paddingRight: rangeSearch ? '36px' : '14px',
                      fontSize: '0.86rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #cbd5e1)',
                      background: 'var(--bg-app, #f8fafc)',
                      boxShadow: 'none',
                      outline: 'none'
                    }}
                  />
                  {rangeSearch && (
                    <button
                      type="button"
                      onClick={() => setRangeSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Clear search"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {rangeSearch ? (
                    <span>Filtered: <strong>{filteredRangeData.length}</strong> of <strong>{rangeData.length}</strong></span>
                  ) : (
                    <span>Total: <strong>{rangeData.length}</strong> records</span>
                  )}
                </div>
              </div>
            </div>

            {/* Range KPI Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div className="panel settings-panel-card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Records Found</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                  {rangeData.length}
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Unique Staff</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                  {new Set(rangeData.map(r => r.employee || r.employeeId)).size}
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Approved Logs</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#6b21a8', marginTop: '2px' }}>
                  {rangeData.filter(r => r.status === 'Approved').length}
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '14px 18px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Pending Approvals</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#b45309', marginTop: '2px' }}>
                  {rangeData.filter(r => r.status === 'Pending Approval').length}
                </div>
              </div>
            </div>

            {/* Records Data Table */}
            <div className="panel settings-panel-card" style={{ padding: '20px' }}>
              {rangeLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid var(--primary-border, #bfdbfe)', borderTopColor: 'var(--primary, #2563eb)', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
                  Loading records between {rangeStart} and {rangeEnd}...
                </div>
              ) : rangeError ? (
                <div className="alert-box alert-box-danger" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md, 8px)' }}>
                  {rangeError}
                </div>
              ) : rangeData.length === 0 ? (
                <EmptyState IconComponent={CalendarIcon} msg={`No attendance logs found between ${rangeStart} and ${rangeEnd}.`} />
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Clock-In</th>
                        <th>Clock-Out</th>
                        <th>Total Hours</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRangeData.map(log => {
                          const isApproved = approvedIds.has(log.id) || log.status === 'Approved';
                          return (
                            <tr key={log.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <AvatarPill name={log.employeeName} size={30} />
                                  <strong>{log.employeeName || 'Staff Member'}</strong>
                                </div>
                              </td>
                              <td>{log.date}</td>
                              <td>{log.clockIn ? fmt12h(log.clockIn) : '—'}</td>
                              <td>{log.clockOut ? fmt12h(log.clockOut) : '—'}</td>
                              <td>{log.totalDuration ? `${log.totalDuration} hrs` : (log.clockIn && !log.clockOut ? 'In Progress' : '0 hrs')}</td>
                              <td><StatusPill status={isApproved ? 'Approved' : log.status} /></td>
                              <td style={{ textAlign: 'right' }}>
                                {!isApproved && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleApprove(log.id)}
                                    disabled={approvingId === log.id}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      backgroundColor: '#16a34a',
                                      borderColor: '#16a34a',
                                      color: '#ffffff',
                                    }}
                                  >
                                    {approvingId === log.id ? 'Approving...' : 'Approve'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MONTHLY ATTENDANCE FINALIZATION & REGISTER                                */}
        {/* ========================================================================= */}
        {viewMode === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel settings-panel-card" style={{ padding: '24px', borderTop: '4px solid var(--primary, #2563eb)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0 }}>
                      Monthly Attendance Finalization & Lock
                    </h3>
                    {isFinalized ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: '20px',
                        background: '#dcfce7', border: '1px solid #86efac',
                        fontSize: '0.78rem', fontWeight: '700', color: '#166534'
                      }}>
                        <ShieldIcon size={13} /> Finalized & Locked &bull; Rev {currentPeriod?.current_revision}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: '20px',
                        background: currentPeriod?.current_revision > 0 ? '#fef3c7' : '#f1f5f9',
                        border: `1px solid ${currentPeriod?.current_revision > 0 ? '#fde68a' : '#cbd5e1'}`,
                        fontSize: '0.78rem', fontWeight: '700',
                        color: currentPeriod?.current_revision > 0 ? '#b45309' : '#475569'
                      }}>
                        <ClockIcon size={13} /> Draft Mode {currentPeriod?.current_revision > 0 ? `(Reopened - Last Rev ${currentPeriod.current_revision})` : ''}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.84rem' }}>
                    Lock past completed month attendance before submitting to Payroll. Finalization creates an immutable audit snapshot.
                  </p>
                </div>

                {/* Month & Year Selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="form-control"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(Number(e.target.value))}
                    style={{ padding: '7px 12px', fontSize: '0.85rem', fontWeight: '600', borderRadius: 'var(--radius-sm, 6px)' }}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="form-control"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(Number(e.target.value))}
                    style={{ padding: '7px 12px', fontSize: '0.85rem', fontWeight: '600', borderRadius: 'var(--radius-sm, 6px)' }}
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {periodError && (
                <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: 'var(--radius-md, 10px)', marginBottom: '16px' }}>
                  <WarningIcon size={18} /> <span>{periodError}</span>
                </div>
              )}

              {periodSuccess && (
                <div className="alert-box alert-box-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: 'var(--radius-md, 10px)', marginBottom: '16px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                  <CheckIcon size={18} /> <span>{periodSuccess}</span>
                </div>
              )}

              {periodLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '0.88rem' }}>
                  <span>Validating month readiness...</span>
                </div>
              ) : (
                <>
                  {/* Period Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md, 10px)', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Active Employees</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                        {periodValidation?.total_employees ?? 0}
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md, 10px)', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Payroll Ready</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                        {periodValidation?.payroll_ready_count ?? 0}
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md, 10px)', background: (periodValidation?.needs_review_count ?? 0) > 0 ? '#fef2f2' : 'var(--bg-app, #f8fafc)', border: `1px solid ${(periodValidation?.needs_review_count ?? 0) > 0 ? '#fecaca' : 'var(--border, #e2e8f0)'}` }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: (periodValidation?.needs_review_count ?? 0) > 0 ? '#991b1b' : 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                        Unresolved Blockers
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: (periodValidation?.needs_review_count ?? 0) > 0 ? '#991b1b' : 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                        {periodValidation?.needs_review_count ?? 0}
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md, 10px)', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Snapshot Revision</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                        {currentPeriod?.current_revision ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Audit / Finalization Info Banner & Success CTA */}
                  {isFinalized && (
                    <div
                      className="attendance-finalized-success-card"
                      style={{
                        padding: '20px 24px',
                        borderRadius: 'var(--radius-md, 10px)',
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: '1px solid #86efac',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckIcon size={18} style={{ color: '#16a34a' }} />
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#166534' }}>
                            Attendance Finalized Successfully
                          </h4>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#15803d' }}>
                          <strong>{MONTH_NAMES[periodMonth - 1]} {periodYear}</strong> attendance is locked and ready for payroll.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.8rem', color: '#166534', flexWrap: 'wrap' }}>
                          <span>Employees: <strong>{periodValidation?.total_employees ?? 0}</strong></span>
                          <span>&bull;</span>
                          <span>Payroll Ready: <strong>{periodValidation?.payroll_ready_count ?? 0}</strong></span>
                          <span>&bull;</span>
                          <span>Needs Review: <strong>{periodValidation?.needs_review_count ?? 0}</strong></span>
                          <span>&bull;</span>
                          <span>Revision: <strong>{currentPeriod?.current_revision ?? 1}</strong></span>
                        </div>
                      </div>

                      <Link
                        href={`/payroll?year=${periodYear}&month=${periodMonth}`}
                        className="btn btn-primary"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          backgroundColor: '#16a34a',
                          borderColor: '#16a34a',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                          textDecoration: 'none',
                          borderRadius: 'var(--radius-sm, 6px)'
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Proceed to Monthly Payroll <ArrowRightIcon size={14} /></span>
                      </Link>
                    </div>
                  )}

                  {isFinalized && (
                    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.84rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <ShieldIcon size={16} /> <span><strong>Locked:</strong> Attendance source records for {MONTH_NAMES[periodMonth - 1]} {periodYear} cannot be modified.</span>
                        {currentPeriod?.finalized_at && (
                          <span>&bull; Finalized on {new Date(currentPeriod.finalized_at).toLocaleString()} by <strong>{currentPeriod.finalized_by_name || 'Admin'}</strong></span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reopen Audit Banner (if in Draft after reopen) */}
                  {!isFinalized && currentPeriod?.current_revision > 0 && currentPeriod?.reopen_reason && (
                    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)', background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '20px', fontSize: '0.84rem', color: '#92400e' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <WarningIcon size={16} /> <strong>Reopened Period:</strong> Records are unlocked for corrections.
                      </div>
                      <div style={{ marginTop: '4px' }}>Reason for reopen: <em>"{currentPeriod.reopen_reason}"</em></div>
                      {currentPeriod?.reopened_at && (
                        <div style={{ marginTop: '2px', fontSize: '0.78rem', color: '#b45309' }}>
                          Reopened on {new Date(currentPeriod.reopened_at).toLocaleString()} by {currentPeriod.reopened_by_name || 'Admin'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Blocking Issues Itemized List */}
                  {!isFinalized && periodValidation?.issues?.length > 0 && (
                    <div style={{ marginBottom: '20px', padding: '16px 18px', borderRadius: 'var(--radius-md, 10px)', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#991b1b', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <WarningIcon size={18} /> Finalization Blocked — {periodValidation.issues.length} Issues Must Be Resolved First:
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {periodValidation.issues.map((iss, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                            <span>&bull;</span>
                            <strong style={{ color: '#991b1b' }}>{iss.employee_name}:</strong>
                            <span>{iss.reason}</span>
                            <span style={{ color: '#b91c1c', opacity: 0.8 }}>({iss.date})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', paddingTop: '10px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                    <div>
                      {!isPastMonth && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                          Ongoing/future month ({MONTH_NAMES[periodMonth - 1]} {periodYear}) cannot be finalized until it has concluded.
                        </span>
                      )}
                      {isPastMonth && !isClean && !isFinalized && (
                        <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: '600' }}>
                          Resolve all pending approvals, incomplete sessions, and conflicts before finalization.
                        </span>
                      )}
                      {isPastMonth && isClean && !isFinalized && (
                        <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '600' }}>
                          Period is clean and 100% payroll-ready!
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* View Snapshots button */}
                      {(isFinalized || currentPeriod?.current_revision > 0) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleViewSnapshots}
                          style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <EyeIcon size={15} /> View Frozen Snapshots
                        </button>
                      )}

                      {/* Reopen Button */}
                      {isFinalized && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setShowReopenModal(true)}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: 'var(--radius-sm, 6px)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ShieldIcon size={14} /> Reopen Period
                        </button>
                      )}

                      {/* Finalize Button */}
                      {!isFinalized && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={handleFinalizePeriod}
                          disabled={finalizing || !isPastMonth || !isClean}
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.84rem',
                            fontWeight: '700',
                            background: (!isPastMonth || !isClean) ? 'var(--bg-app, #f8fafc)' : 'var(--primary, #2563eb)',
                            color: (!isPastMonth || !isClean) ? 'var(--text-muted, #64748b)' : '#ffffff',
                            border: (!isPastMonth || !isClean) ? '1px solid var(--border, #e2e8f0)' : 'none',
                            borderRadius: 'var(--radius-sm, 6px)',
                            cursor: (!isPastMonth || !isClean || finalizing) ? 'not-allowed' : 'pointer',
                            boxShadow: isPastMonth && isClean ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ShieldIcon size={14} /> {finalizing ? 'Finalizing & Locking...' : 'Finalize Month & Lock Attendance'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Full Monthly Employee Attendance Register Table */}
            <div className="panel settings-panel-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <EmployeesIcon size={18} /> Monthly Employee Attendance Register &bull; {MONTH_NAMES[periodMonth - 1]} {periodYear}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.82rem' }}>
                    Itemized working days, present, leaves, absents, and payable units for each employee
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <SearchIcon size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search employee..."
                      value={monthlySearch}
                      onChange={(e) => setMonthlySearch(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', background: 'var(--bg-app, #f8fafc)', padding: '6px 12px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, #e2e8f0)' }}>
                    Total: {filteredSnapshots.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportCSV}
                    disabled={filteredSnapshots.length === 0}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-sm, 6px)',
                      color: 'var(--text-main, #0f172a)',
                      cursor: filteredSnapshots.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                    title="Download monthly attendance records as CSV"
                  >
                    <DownloadIcon size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {snapshotsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                  Loading monthly employee records...
                </div>
              ) : filteredSnapshots.length === 0 ? (
                <EmptyState IconComponent={EmployeesIcon} msg="No employee attendance records found for this month." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Employee</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Working</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Present</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Half Day</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Leave</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Absent</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Late</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>Payable Units</th>
                        <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: '700' }}>Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSnapshots.map((emp) => {
                        const wDays = emp.working_days || 0;
                        const pDays = emp.present_days || 0;
                        const rate = wDays > 0 ? Math.round((pDays / wDays) * 100) : 0;
                        const rateBg = rate >= 90 ? '#dcfce7' : rate >= 75 ? '#fef3c7' : '#fee2e2';
                        const rateColor = rate >= 90 ? '#166534' : rate >= 75 ? '#b45309' : '#991b1b';
                        const rateBorder = rate >= 90 ? '#86efac' : rate >= 75 ? '#fde68a' : '#fca5a5';

                        return (
                          <tr key={emp.id || emp.employee_id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>{emp.employee_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{emp.designation || 'Staff'}</div>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600' }}>{wDays}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>{pDays}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>{emp.half_days || 0}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: (emp.leave_days || 0) > 0 ? '#6b21a8' : 'inherit' }}>{emp.leave_days || 0}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: (emp.absent_days || 0) > 0 ? '#dc2626' : 'inherit' }}>{emp.absent_days || 0}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: (emp.late_count || 0) > 0 ? '#b45309' : 'inherit' }}>
                              {(emp.late_count || 0) > 0 ? `${emp.late_count} (${emp.total_late_minutes || 0}m)` : '0'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '800', color: '#166534' }}>
                              {emp.payable_attendance_units ?? pDays}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                background: rateBg,
                                color: rateColor,
                                border: `1px solid ${rateBorder}`
                              }}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* YEARLY ATTENDANCE MATRIX                                                  */}
        {/* ========================================================================= */}
        {viewMode === 'yearly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Yearly Header Bar */}
            <div className="panel settings-panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0 }}>
                  Annual Attendance Matrix &bull; {yearlyYear}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.84rem' }}>
                  12-month consolidated overview of attendance performance across all active employees
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <SearchIcon size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search employee..."
                    value={yearlySearch}
                    onChange={(e) => setYearlySearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
                  />
                </div>
                <select
                  className="form-control"
                  value={yearlyYear}
                  onChange={(e) => setYearlyYear(Number(e.target.value))}
                  style={{ padding: '7px 14px', fontSize: '0.85rem', fontWeight: '700', borderRadius: 'var(--radius-sm, 6px)' }}
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Annual KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="panel settings-panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Active Workforce</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                  {yearlyData.length}
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Avg Attendance Rate</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                  {yearlyData.length > 0
                    ? Math.round(yearlyData.reduce((acc, curr) => acc + (curr.annual_attendance_rate || 0), 0) / yearlyData.length)
                    : 0}%
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Days Worked</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6b21a8', marginTop: '4px' }}>
                  {yearlyData.reduce((acc, curr) => acc + (curr.total_present_days || 0), 0)}
                </div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Leaves Taken</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
                  {yearlyData.reduce((acc, curr) => acc + (curr.total_leave_days || 0), 0)}
                </div>
              </div>
            </div>

            {/* 12-Month Matrix Table */}
            <div className="panel settings-panel-card" style={{ padding: '24px' }}>
              {yearlyLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                  Loading yearly attendance matrix...
                </div>
              ) : filteredYearly.length === 0 ? (
                <EmptyState IconComponent={AuditIcon} msg="No yearly attendance data recorded for this year." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', minWidth: '160px' }}>Employee</th>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                          <th key={m} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: '700', minWidth: '45px' }}>
                            {m}
                          </th>
                        ))}
                        <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '700' }}>Present</th>
                        <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '700' }}>Leaves</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Annual Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredYearly.map((emp) => {
                        const annualRate = emp.annual_attendance_rate || 0;
                        const scoreBg = annualRate >= 90 ? '#dcfce7' : annualRate >= 75 ? '#fef3c7' : '#fee2e2';
                        const scoreColor = annualRate >= 90 ? '#166534' : annualRate >= 75 ? '#b45309' : '#991b1b';
                        const scoreBorder = annualRate >= 90 ? '#86efac' : annualRate >= 75 ? '#fde68a' : '#fca5a5';

                        return (
                          <tr key={emp.employee_id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>{emp.employee_name}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>{emp.designation || 'Staff'}</div>
                            </td>

                            {emp.months && emp.months.map((m) => {
                              const r = m.attendance_rate;
                              return (
                                <td key={m.month} style={{ padding: '10px 4px', textAlign: 'center' }}>
                                  {r !== null && r !== undefined ? (
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      background: r >= 90 ? '#dcfce7' : r >= 75 ? '#fef3c7' : '#fee2e2',
                                      color: r >= 90 ? '#166534' : r >= 75 ? '#b45309' : '#991b1b',
                                    }}>
                                      {r}%
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem' }}>-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>
                              {emp.total_present_days}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'center', color: emp.total_leave_days > 0 ? '#6b21a8' : 'inherit' }}>
                              {emp.total_leave_days}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                background: scoreBg,
                                color: scoreColor,
                                border: `1px solid ${scoreBorder}`
                              }}>
                                {annualRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

            {/* ========================================================================= */}
            {/* REOPEN PERIOD MODAL                                                      */}
            {/* ========================================================================= */}
            {showReopenModal && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: '20px'
              }}>
                <div style={{
                  background: 'var(--bg-card, #ffffff)', borderRadius: 'var(--radius-lg, 12px)',
                  maxWidth: '520px', width: '100%', padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid var(--border, #e2e8f0)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldIcon size={18} /> Reopen Attendance Period
                    </h3>
                    <button
                      type="button"
                      onClick={() => { setShowReopenModal(false); setReopenReason(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', padding: '4px' }}
                    >
                      <CloseIcon size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleReopenPeriod}>
                    <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm, 6px)', color: '#92400e', fontSize: '0.82rem', marginBottom: '14px', lineHeight: 1.4 }}>
                      <strong>Warning:</strong> Reopening attendance may make an existing payroll calculation outdated. If Payroll for this month is Finalized, please reopen Payroll first.
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', marginBottom: '16px', lineHeight: 1.5 }}>
                      You are about to unlock attendance records for <strong>{MONTH_NAMES[periodMonth - 1]} {periodYear}</strong>.
                      This will allow attendance corrections and leave adjustments. A non-empty reason is mandatory for the audit log.
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
                        Reason for Reopening *
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        required
                        minLength={5}
                        placeholder="e.g. Correcting missing overtime session for design team..."
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm, 6px)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setShowReopenModal(false); setReopenReason(''); }}
                        disabled={reopening}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm"
                        disabled={reopening || reopenReason.trim().length < 5}
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: '700',
                          padding: '8px 18px',
                          border: 'none',
                          borderRadius: 'var(--radius-sm, 6px)',
                          cursor: reopening ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {reopening ? 'Reopening...' : 'Confirm Reopen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* FROZEN SNAPSHOTS MODAL                                                   */}
            {/* ========================================================================= */}
            {showSnapshotsModal && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: '20px'
              }}>
                <div style={{
                  background: 'var(--bg-card, #ffffff)', borderRadius: 'var(--radius-lg, 12px)',
                  maxWidth: '900px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                  padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid var(--border, #e2e8f0)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <EyeIcon size={18} /> Frozen Attendance Snapshots &bull; {MONTH_NAMES[periodMonth - 1]} {periodYear}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                        Authoritative snapshot data locked for payroll computation
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSnapshotsModal(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', padding: '4px' }}
                    >
                      <CloseIcon size={18} />
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                    {snapshotsLoading ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                        Loading snapshot metrics...
                      </div>
                    ) : snapshots.length === 0 ? (
                      <EmptyState IconComponent={AuditIcon} msg="No snapshots generated for this period yet." />
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-app, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Employee</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Rev</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Working</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Present</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Half Day</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Leave</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Payable Units</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Worked (Min)</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Late (Min)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshots.map((snap) => (
                            <tr key={snap.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>{snap.employee_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{snap.designation || 'Staff'}</div>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span className="badge" style={{ background: snap.is_current ? '#dcfce7' : '#f1f5f9', color: snap.is_current ? '#166534' : '#64748b' }}>
                                  v{snap.revision}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{snap.working_days}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{snap.present_days}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{snap.half_days}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{snap.leave_days}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#166534' }}>
                                {snap.payable_attendance_units}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{snap.total_worked_minutes}m</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: snap.total_late_minutes > 0 ? '#b45309' : 'inherit' }}>
                                {snap.late_count > 0 ? `${snap.late_count} (${snap.total_late_minutes}m)` : '0'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowSnapshotsModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

             <style jsx>{`
          .active-filter-chip,
          .active-filter-chip * {
            color: #ffffff !important;
            background-color: #2563eb !important;
            background: #2563eb !important;
          }
          .portal-view-switcher {
            display: flex !important;
            gap: 10px !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 8px !important;
            scrollbar-width: none !important;
          }
          .portal-view-switcher::-webkit-scrollbar {
            display: none !important;
          }
          .portal-view-switcher button,
          .portal-view-switcher button * {
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          @media (max-width: 640px) {
            .portal-stat-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
            .portal-legend-bar {
              gap: 8px 12px !important;
              padding: 8px 12px !important;
              font-size: 0.74rem !important;
              margin-bottom: 14px !important;
            }
            .portal-view-switcher {
              overflow-x: auto !important;
              flex-wrap: nowrap !important;
              -webkit-overflow-scrolling: touch;
              padding-bottom: 8px !important;
              scrollbar-width: none;
            }
            .portal-view-switcher::-webkit-scrollbar {
              display: none;
            }
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}