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
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: '20px', background: cfg.bg,
      border: `1px solid ${cfg.border}`, fontSize: '0.78rem', fontWeight: 600, color: cfg.text,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const LogRow = ({ log, onApprove, approving, approved }) => {
  const isApproved = approved || log.status === 'Approved';
  return (
    <div className="log-item-row" style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)',
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border, #e2e8f0)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'all 0.15s ease',
    }}>
      <AvatarPill name={log.employeeName} color={isApproved ? '#1d4ed8' : '#2563eb'} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)', marginBottom: 2 }}>
          {log.employeeName}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{log.employeeDesignation || 'Staff'}</span>
          <span>&bull;</span>
          <span>Clock-in: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{fmt12h(log.clockIn)}</strong></span>
          {log.minutesLate !== undefined && (
            <span style={{ color: '#d97706', fontWeight: 600 }}>+{log.minutesLate} min late</span>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <StatusPill status={isApproved ? 'Approved' : log.status} />
        {!isApproved && onApprove && (
          <button 
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => onApprove(log.id)} 
            disabled={approving} 
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: '600',
              backgroundColor: '#16a34a',
              borderColor: '#16a34a',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {approving ? (
              'Approving...'
            ) : (
              <>
                <CheckIcon size={14} /> Approve
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const AbsentRow = ({ item, isLeave }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    padding: '14px 18px', borderRadius: 'var(--radius-md, 10px)',
    background: 'var(--bg-card, #ffffff)',
    border: '1px solid var(--border, #e2e8f0)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }}>
    <AvatarPill name={item.employeeName} color={isLeave ? '#8b5cf6' : '#64748b'} />
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)', marginBottom: 2 }}>
        {item.employeeName}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
        {item.designation || item.employeeDesignation || 'Staff'}
        {isLeave && item.leaveTypeName && (
          <span style={{ marginLeft: 8, fontWeight: 600, color: '#6b21a8' }}>&bull; {item.leaveTypeName}</span>
        )}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <StatusPill status={isLeave ? 'On Leave' : 'Absent'} />
    </div>
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

export default function HRAttendancePortalPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());

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

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetch('/attendance/hr-dashboard/');
      setDashData(data);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchDashboard();
    const t = setInterval(fetchDashboard, 30000);
    return () => clearInterval(t);
  }, [fetchDashboard]);

  useEffect(() => {
    fetchPeriodSummary(periodYear, periodMonth);
  }, [periodYear, periodMonth, fetchPeriodSummary]);

  const handleApprove = async (logId) => {
    setApprovingId(logId);
    try {
      await apiFetch(`/attendance/${logId}/approve/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved' }),
      });
      setApprovedIds(prev => new Set([...prev, logId]));
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
  ];

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentPeriod = periodData?.period;
  const periodValidation = periodData?.validation;
  const isFinalized = currentPeriod?.status === 'Finalized';
  const isPastMonth = periodValidation?.is_past_month;
  const isClean = periodValidation?.is_clean;

  return (
    <PageWrapper title="Attendance Management Portal" requiredPermission="attendance:management_portal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Bar */}
        <div className="panel settings-panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0, marginBottom: '4px' }}>
              Attendance Monitor Center
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Review, approve and track workforce attendance in real-time
              {dashData?.date && (
                <span style={{ fontWeight: '600', color: 'var(--primary)', marginLeft: '8px' }}>
                  &bull; {new Date(dashData.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setLoading(true); fetchDashboard(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }}
          >
            <ChangeIcon size={14} /> Refresh Data
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

        {dashData && (
          <>
            {/* Stat Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
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
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      background: activeTab === tab.id ? 'var(--primary, #2563eb)' : 'var(--bg-app, #f8fafc)',
                      color: activeTab === tab.id ? '#ffffff' : 'var(--text-main, #0f172a)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: 'var(--radius-sm, 6px)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
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

            </div>

            {/* ========================================================================= */}
            {/* MONTHLY ATTENDANCE FINALIZATION & LOCK PANEL                             */}
            {/* ========================================================================= */}
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
                        <span>Proceed to Monthly Payroll →</span>
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

          </>
        )}

      </div>
    </PageWrapper>
  );
}
