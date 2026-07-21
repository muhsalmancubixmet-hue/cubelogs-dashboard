'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api';

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
      padding: '14px 18px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'all 0.15s ease',
    }}>
      <AvatarPill name={log.employeeName} color={isApproved ? '#1d4ed8' : '#2563eb'} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: 2 }}>
          {log.employeeName}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{log.employeeDesignation || 'Staff'}</span>
          <span>&bull;</span>
          <span>Clock-in: <strong style={{ color: 'var(--text-main)' }}>{fmt12h(log.clockIn)}</strong></span>
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
            className="btn btn-sm"
            onClick={() => onApprove(log.id)} 
            disabled={approving} 
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: approving ? 'var(--bg-app)' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: approving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {approving ? 'Approving...' : 'Approve'}
          </button>
        )}
      </div>
    </div>
  );
};

const AbsentRow = ({ item, isLeave }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    padding: '14px 18px', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-xs)',
  }}>
    <AvatarPill name={item.employeeName} color={isLeave ? '#8b5cf6' : '#64748b'} />
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: 2 }}>
        {item.employeeName}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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

const EmptyState = ({ icon, msg }) => (
  <div style={{
    padding: '48px 20px', textAlign: 'center',
    background: 'var(--bg-app)', borderRadius: 'var(--radius-md)',
    border: '1px border-dashed var(--border)',
  }}>
    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
    <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.88rem', margin: 0 }}>{msg}</p>
  </div>
);

export default function HRAttendancePortalPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());

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

  useEffect(() => {
    fetchDashboard();
    const t = setInterval(fetchDashboard, 30000);
    return () => clearInterval(t);
  }, [fetchDashboard]);

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

  const summary = dashData?.summary || {};
  const pending = dashData?.pending || [];
  const late    = dashData?.late    || [];
  const onLeave = dashData?.on_leave || [];
  const absent  = dashData?.absent  || [];

  const tabs = [
    { id: 'pending', label: `Pending Approvals (${summary.pendingCount ?? 0})` },
    { id: 'late',    label: `Late Comers (${summary.lateCount ?? 0})` },
    { id: 'absent',  label: `Leave & Absent (${(summary.onLeaveCount ?? 0) + (summary.absentCount ?? 0)})` },
  ];

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
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }}
          >
            <span>🔄</span> Refresh Data
          </button>
        </div>

        {error && (
          <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {loading && !dashData && (
          <div className="panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <span>Loading real-time attendance monitor...</span>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}

        {dashData && (
          <>
            {/* Stat Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Approvals</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>{summary.pendingCount ?? 0}</div>
              </div>
              
              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Late Comers</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>{summary.lateCount ?? 0}</div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>On Leave Today</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>{summary.onLeaveCount ?? 0}</div>
              </div>

              <div className="panel settings-panel-card" style={{ padding: '18px 20px', borderLeft: '4px solid #64748b' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent Today</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>{summary.absentCount ?? 0}</div>
              </div>
            </div>

            {dashData.grace_period_minutes !== undefined && (
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                color: 'var(--primary)', fontWeight: '500', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span>⏱️ Grace Period configured: <strong>{dashData.grace_period_minutes} minutes</strong> after official shift start time.</span>
              </div>
            )}

            {/* Main Content Card with Navigation Tabs */}
            <div className="panel settings-panel-card" style={{ padding: '24px' }}>
              
              {/* Tab Navigation */}
              <div className="module-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
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
                      background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-app)',
                      color: activeTab === tab.id ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
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
                padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)',
                border: '1px solid var(--border)', marginBottom: '20px', fontSize: '0.78rem',
              }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Status Legend:</span>
                {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                  <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} /> {st}
                  </span>
                ))}
              </div>

              {/* Tab 1: Pending Approvals */}
              {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Clock-Ins Awaiting HR Approval</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Review and approve employee clock-in records requiring verification.</p>
                  </div>
                  {pending.length === 0 ? (
                    <EmptyState icon="✨" msg="No pending approvals at this moment." />
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
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Late Arrival Logs Today</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Employees who recorded clock-in after the grace period ended.</p>
                  </div>
                  {late.length === 0 ? (
                    <EmptyState icon="🎉" msg="No late arrivals recorded today!" />
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
                        <span>🏖️ Approved Leave Today ({onLeave.length})</span>
                      </div>
                      {onLeave.map(item => <AbsentRow key={`lv-${item.id}`} item={item} isLeave={true} />)}
                    </div>
                  )}

                  {absent.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🚫 No Clock-In Recorded ({absent.length})</span>
                      </div>
                      {absent.map(emp => <AbsentRow key={`ab-${emp.id}`} item={emp} isLeave={false} />)}
                    </div>
                  )}

                  {onLeave.length === 0 && absent.length === 0 && (
                    <EmptyState icon="🙌" msg="All employees are present and accounted for!" />
                  )}
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </PageWrapper>
  );
}
