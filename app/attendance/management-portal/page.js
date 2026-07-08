'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api';

const clay = {
  shadow: '8px 8px 20px rgba(37,99,235,0.06), -4px -4px 12px rgba(255,255,255,0.9)',
  shadowInner: 'inset 3px 3px 8px rgba(37,99,235,0.04), inset -3px -3px 8px rgba(255,255,255,0.85)',
  shadowHover: '10px 10px 24px rgba(37,99,235,0.09), -5px -5px 14px rgba(255,255,255,0.95)',
  shadowBtn: '4px 4px 10px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.9)',
  radius: '20px', radiusSm: '14px', radiusXs: '10px',
};

const STATUS_COLORS = {
  'Pending Approval': { bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border:'#0ea5e9', text:'#0369a1', dot:'#0284c7' },
  'Approved':         { bg:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'#2563eb', text:'#1e40af', dot:'#1d4ed8' },
  'Late':             { bg:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'#60a5fa', text:'#1d4ed8', dot:'#3b82f6' },
  'Half Day':         { bg:'linear-gradient(135deg,#e0f2fe,#93c5fd)', border:'#1d4ed8', text:'#1e3a8a', dot:'#1e40af' },
  'Absent':           { bg:'linear-gradient(135deg,#f1f5f9,#e2e8f0)', border:'#94a3b8', text:'#334155', dot:'#475569' },
};

const fmt12h = (s) => {
  if (!s) return '--';
  try { return new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return s; }
};

const getInitials = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : 'E';

const ClayAvatar = ({ name, color = '#3b82f6', size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: `radial-gradient(circle at 35% 35%,#fff 0%,${color}44 60%,${color}88 100%)`,
    boxShadow: `3px 3px 8px ${color}44,-2px -2px 6px rgba(255,255,255,0.9)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.35, color, flexShrink: 0, border: `2px solid ${color}33`,
  }}>
    {getInitials(name)}
  </div>
);

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Pending Approval'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 9999, background: c.bg,
      border: `1.5px solid ${c.border}`, fontSize: 11, fontWeight: 700, color: c.text,
      boxShadow: `2px 2px 6px ${c.border}22`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const StatCard = ({ emoji, label, value, color }) => (
  <div style={{
    background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
    borderRadius: clay.radius, padding: '16px 18px',
    boxShadow: clay.shadow, border: '1.5px solid #e2e8f0',
    borderLeft: `5px solid ${color}`,
    display: 'flex', flexDirection: 'column', gap: 8, minWidth: '140px', flex: '1 1 140px',
    transition: 'box-shadow 0.2s,transform 0.2s', cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = clay.shadowHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = clay.shadow; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 20 }}>{emoji}</span>
    </div>
    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginTop: 4 }}>{value}</div>
  </div>
);

const ColorLegend = () => (
  <div style={{
    display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
    padding: '12px 18px', borderRadius: 12, background: '#ffffff',
    border: '1.5px solid #bae6fd', marginBottom: 24, fontSize: 12,
    boxShadow: 'inset 2px 2px 5px rgba(37,99,235,0.03)',
  }}>
    <span style={{ fontWeight: 700, color: '#1e3a8a', marginRight: 4 }}>Status Indicators:</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} /> Pending Approval (Sky Blue)
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8' }} /> Approved (Royal Blue)
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Late Arrival (Steel Blue)
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e40af' }} /> Half Day (Navy Blue)
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} /> Absent (Slate)
    </span>
  </div>
);

const TabBtn = ({ active, onClick, children, color }) => (
  <button onClick={onClick} style={{
    padding: '10px 22px', borderRadius: clay.radiusXs, fontWeight: 700, fontSize: 13,
    border: active ? `2px solid ${color}` : '2px solid transparent',
    background: active ? `linear-gradient(145deg,${color}22,${color}11)` : 'rgba(255,255,255,0.6)',
    color: active ? color : '#9ca3af',
    boxShadow: active ? clay.shadow : clay.shadowInner,
    cursor: 'pointer', transition: 'all 0.2s', outline: 'none', whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

const LogRow = ({ log, onApprove, approving, approved }) => {
  const ok = approved || log.status === 'Approved';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '14px 18px', borderRadius: clay.radiusSm,
      background: ok ? 'linear-gradient(135deg,#eff6ff,#dbeafe)' : 'rgba(255,255,255,0.75)',
      boxShadow: clay.shadowInner,
      border: ok ? '1.5px solid #60a5fa' : '1.5px solid rgba(255,255,255,0.8)',
      transition: 'background 0.4s,border-color 0.4s',
    }}>
      <ClayAvatar name={log.employeeName} color={ok ? '#1d4ed8' : '#3b82f6'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b', marginBottom: 2 }}>{log.employeeName}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {log.employeeDesignation || '--'} &middot; Clock-in: <strong>{fmt12h(log.clockIn)}</strong>
          {log.minutesLate !== undefined && (
            <span style={{ color: '#3b82f6', fontWeight: 700, marginLeft: 8 }}>+{log.minutesLate} min late</span>
          )}
          {log.shiftStart && (
            <span style={{ color: '#9ca3af', marginLeft: 8 }}>shift {log.shiftStart}</span>
          )}
        </div>
      </div>
      <StatusPill status={ok ? 'Approved' : log.status} />
      {!ok && onApprove && (
        <button onClick={() => onApprove(log.id)} disabled={approving} style={{
          padding: '7px 16px', borderRadius: 10,
          background: approving ? '#e5e7eb' : 'linear-gradient(135deg,#22c55e,#16a34a)',
          color: '#fff', fontWeight: 700, fontSize: 12, border: 'none',
          boxShadow: clay.shadowBtn, cursor: approving ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', flexShrink: 0,
        }}
          onMouseEnter={e => { if (!approving) e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {approving ? '...' : 'Approve'}
        </button>
      )}
    </div>
  );
};

const AbsentRow = ({ item, isLeave }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    padding: '14px 18px', borderRadius: clay.radiusSm,
    background: isLeave ? 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' : 'linear-gradient(135deg,#f8fafc,#eff6ff)',
    boxShadow: clay.shadowInner,
    border: isLeave ? '1.5px solid #bae6fd' : '1.5px solid #cbd5e1',
  }}>
    <ClayAvatar name={item.employeeName} color={isLeave ? '#3b82f6' : '#64748b'} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b', marginBottom: 2 }}>{item.employeeName}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {item.designation || item.employeeDesignation || '--'}
        {isLeave && item.leaveTypeName && (
          <span style={{ marginLeft: 8, fontWeight: 600, color: '#2563eb' }}>&middot; {item.leaveTypeName}</span>
        )}
      </div>
    </div>
    <StatusPill status={isLeave ? 'Approved' : 'Absent'} />
    <span style={{
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: isLeave ? 'rgba(59,130,246,0.12)' : 'rgba(100,116,139,0.12)',
      color: isLeave ? '#1d4ed8' : '#475569',
      border: isLeave ? '1px solid #93c5fd' : '1px solid #cbd5e1',
    }}>
      {isLeave ? 'On Leave' : 'No Clock-In'}
    </span>
  </div>
);

const EmptyState = ({ emoji, msg }) => (
  <div style={{
    padding: '40px 20px', textAlign: 'center',
    background: 'rgba(255,255,255,0.6)', borderRadius: clay.radiusSm, boxShadow: clay.shadowInner,
  }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>{emoji}</div>
    <p style={{ color: '#9ca3af', fontWeight: 600, margin: 0 }}>{msg}</p>
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
    { id: 'pending', label: `Pending (${summary.pendingCount ?? '--'})`,    color: '#0284c7' },
    { id: 'late',    label: `Late Comers (${summary.lateCount ?? '--'})`,   color: '#3b82f6' },
    { id: 'absent',  label: `Leave & Absent (${(summary.onLeaveCount ?? 0) + (summary.absentCount ?? 0)})`, color: '#1e40af' },
  ];

  return (
    <PageWrapper title="Attendance Management Portal" requiredPermission="attendance:management_portal">
      <div style={{ minHeight: '100%', paddingBottom: 40, fontFamily: "'Inter',sans-serif" }}>
        <style>{`
          .attendance-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 28px;
          }
          .attendance-header-card {
            background: linear-gradient(145deg,#f0f7ff,#e0f2fe);
            border-radius: 20px;
            padding: 28px 32px;
            margin-bottom: 24px;
            box-shadow: 8px 8px 20px rgba(37,99,235,0.06), -4px -4px 12px rgba(255,255,255,0.9);
            border: 1.5px solid #bae6fd;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
          }
          .attendance-main-panel {
            background: linear-gradient(145deg,#f0f7ff,#e0f2fe);
            border-radius: 20px;
            padding: 24px 28px;
            box-shadow: 8px 8px 20px rgba(37,99,235,0.06), -4px -4px 12px rgba(255,255,255,0.9);
            border: 1.5px solid #bae6fd;
          }
          .attendance-tabs-container {
            display: flex;
            gap: 10px;
            margin-bottom: 24px;
            overflow-x: auto;
            white-space: nowrap;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 4px;
          }
          .attendance-tabs-container::-webkit-scrollbar {
            display: none;
          }
          @media (max-width: 1024px) {
            .attendance-stats-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
          }
          @media (max-width: 600px) {
            .attendance-stats-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 16px;
            }
            .attendance-header-card {
              padding: 16px 18px !important;
              border-radius: 14px !important;
              margin-bottom: 16px !important;
            }
            .attendance-main-panel {
              padding: 16px 14px !important;
              border-radius: 14px !important;
            }
          }
        `}</style>

        {/* Header */}
        <div className="attendance-header-card">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', margin: 0, marginBottom: 4 }}>
              Attendance Monitor Center
            </h1>
            <p style={{ margin: 0, color: '#2563eb', fontWeight: 500, fontSize: 14 }}>
              Review, approve and track workforce attendance in real-time
              {dashData?.date && (
                <span style={{ marginLeft: 8, color: '#9ca3af' }}>
                  &mdash; {new Date(dashData.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchDashboard(); }}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color: '#fff', fontWeight: 700, fontSize: 13, border: 'none',
              boxShadow: clay.shadowBtn, cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div style={{
            padding: '14px 20px', borderRadius: 14, marginBottom: 20,
            background: 'linear-gradient(135deg,#fee2e2,#fecaca)',
            border: '1.5px solid #fca5a5', color: '#7f1d1d', fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '48px 20px', background: 'rgba(255,255,255,0.6)',
            borderRadius: clay.radius, boxShadow: clay.shadowInner,
          }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #dbeafe',
              borderTopColor: '#2563eb', borderRadius: '50%',
              animation: 'hrSpin 0.9s linear infinite',
            }} />
            <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 15 }}>Loading attendance data...</span>
            <style>{'@keyframes hrSpin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}

        {!loading && dashData && (
          <>
            {/* Stat Cards */}
            <div className="attendance-stats-grid">
              <StatCard emoji="⏳" label="Pending Approvals" value={summary.pendingCount ?? 0} color="#0ea5e9" />
              <StatCard emoji="⚠️" label="Late Comers"       value={summary.lateCount ?? 0}    color="#3b82f6" />
              <StatCard emoji="🏖️" label="On Leave Today"   value={summary.onLeaveCount ?? 0} color="#2563eb" />
              <StatCard emoji="🚫" label="Absent Today"      value={summary.absentCount ?? 0}  color="#475569" />
            </div>

            {dashData.grace_period_minutes !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', borderRadius: 14, marginBottom: 24,
                background: 'linear-gradient(135deg,#fefce8,#fef9c3)',
                border: '1.5px solid #fde68a', color: '#854d0e',
                fontWeight: 600, fontSize: 13, boxShadow: clay.shadowInner,
              }}>
                Grace Period:
                <strong style={{ color: '#92400e', marginLeft: 4 }}>{dashData.grace_period_minutes} min</strong>
                <span style={{ color: '#a16207', fontWeight: 400, marginLeft: 4 }}>after shift start</span>
              </div>
            )}

            {/* Main Panel */}
            <div className="attendance-main-panel">
              <div className="attendance-tabs-container">
                {tabs.map(tab => (
                  <TabBtn key={tab.id} active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)} color={tab.color}>
                    {tab.label}
                  </TabBtn>
                ))}
              </div>

              <ColorLegend />

              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', margin: 0 }}>Clock-Ins Awaiting HR Approval</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>Click Approve to confirm an employee attendance record.</p>
                  </div>
                  {pending.length === 0
                    ? <EmptyState emoji="✅" msg="All clear -- no pending approvals right now." />
                    : pending.map(log => (
                      <LogRow key={log.id} log={log} onApprove={handleApprove}
                        approving={approvingId === log.id} approved={approvedIds.has(log.id)} />
                    ))
                  }
                </div>
              )}

              {/* Late Tab */}
              {activeTab === 'late' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#c2410c', margin: 0 }}>Late Comers Today</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>Employees who clocked in after the grace period ends.</p>
                  </div>
                  {late.length === 0
                    ? <EmptyState emoji="🎉" msg="No late arrivals today!" />
                    : late.map(log => (
                      <LogRow key={log.id} log={log} onApprove={handleApprove}
                        approving={approvingId === log.id} approved={approvedIds.has(log.id)} />
                    ))
                  }
                </div>
              )}

              {/* Absent / Leave Tab */}
              {activeTab === 'absent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', margin: 0 }}>On Leave & Absent Employees</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>Approved leave records, then employees with no clock-in and no leave today.</p>
                  </div>

                  {onLeave.length > 0 && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(59,130,246,0.08)', marginBottom: 4,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>
                          Approved Leave Today ({onLeave.length})
                        </span>
                      </div>
                      {onLeave.map(item => <AbsentRow key={`lv-${item.id}`} item={item} isLeave={true} />)}
                    </>
                  )}

                  {absent.length > 0 && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)',
                        marginTop: onLeave.length > 0 ? 8 : 0, marginBottom: 4,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>
                          No Clock-In Recorded ({absent.length})
                        </span>
                      </div>
                      {absent.map(emp => <AbsentRow key={`ab-${emp.id}`} item={emp} isLeave={false} />)}
                    </>
                  )}

                  {onLeave.length === 0 && absent.length === 0 && (
                    <EmptyState emoji="🙌" msg="All employees are present and accounted for!" />
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
