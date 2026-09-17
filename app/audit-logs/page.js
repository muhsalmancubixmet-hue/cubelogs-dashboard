'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { SearchIcon, CloseIcon, AuditIcon } from '@/components/Icons';

function AuditLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useApp();

  // States
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(30);

  const unpackList = (res) => (
    Array.isArray(res)
      ? res
      : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res?.data)
          ? res.data
          : []
  );

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await apiFetch('/employees/');
        const list = unpackList(data);
        setEmployees(list.map(emp => ({ ...emp, id: String(emp.id) })));
      } catch (err) {
        console.error('Failed to load employees for audit logs:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch logs whenever filters change
  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let queryParams = [];
      if (selectedEmployee) queryParams.push(`employee_id=${selectedEmployee}`);
      if (selectedAction) queryParams.push(`action=${encodeURIComponent(selectedAction)}`);
      if (selectedDate) queryParams.push(`date=${selectedDate}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const data = await apiFetch(`/audit-logs/${queryString}`);
      setLogs(unpackList(data));
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchLogs();
    }
  }, [currentUser?.id, selectedEmployee, selectedAction, selectedDate]);

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper to get relative time
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Dynamic Action Badge styling mapping
  const getActionBadgeClass = (action = '') => {
    const act = (action || '').toUpperCase();
    if (act.includes('LOGIN') || act.includes('LOGGED IN')) return 'badge-login';
    if (act.includes('CLOCK') || act.includes('ATTENDANCE')) return 'badge-clockin';
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('FAIL')) return 'badge-danger';
    if (act.includes('CREATE') || act.includes('NEW')) return 'badge-create';
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) return 'badge-update';
    if (act.includes('LEAVE')) return 'badge-leave';
    if (act.includes('PAYROLL') || act.includes('PAYSLIP') || act.includes('SALARY')) return 'badge-payroll';
    if (act.includes('TASK') || act.includes('PROJECT') || act.includes('STORY') || act.includes('SPRINT')) return 'badge-task';
    return 'badge-default';
  };

  const clearFilters = () => {
    setSelectedEmployee('');
    setSelectedAction('');
    setSelectedDate('');
    setSearchQuery('');
  };

  const handleCopyDetails = (text) => {
    if (!text) return;
    const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Description', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${l.employeeName || 'System'}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs locally by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const actionMatch = log.action && log.action.toLowerCase().includes(term);
    const detailsMatch = log.details && log.details.toLowerCase().includes(term);
    const employeeMatch = log.employeeName && log.employeeName.toLowerCase().includes(term);
    const ipMatch = log.ipAddress && log.ipAddress.toLowerCase().includes(term);
    return actionMatch || detailsMatch || employeeMatch || ipMatch;
  });

  const displayLogs = filteredLogs.slice(0, visibleCount);

  // KPI Metrics Calculation for Detailed Overview
  const totalEventsCount = filteredLogs.length;
  const authEventsCount = filteredLogs.filter(l => {
    const act = (l.action || '').toLowerCase();
    return act.includes('log') || act.includes('clock') || act.includes('auth');
  }).length;
  const systemModificationsCount = filteredLogs.filter(l => {
    const act = (l.action || '').toLowerCase();
    return act.includes('create') || act.includes('update') || act.includes('delete') || act.includes('role');
  }).length;
  const uniqueOperatorsCount = new Set(filteredLogs.map(l => l.employeeName || l.employee).filter(Boolean)).size;

  if (!currentUser) return null;

  return (
    <PageWrapper title="System Audit Logs">
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        {/* Responsive Compact Header Banner */}
        <div className="audit-header-banner">
          <div className="audit-header-left">
            <div className="audit-header-icon-box">
              <AuditIcon size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="audit-header-badge">
                  Compliance & Security Trail
                </span>
              </div>
              <h2 className="audit-header-title">
                System Audit Logs
              </h2>
              <p className="audit-header-desc">
                {currentUser.isSuperAdmin
                  ? 'Detailed audit trail, security events, state transitions, and user activity history.'
                  : 'Review your historical account activity trail and login records.'}
              </p>
            </div>
          </div>

          <div className="audit-header-actions">
            <button
              onClick={fetchLogs}
              className="audit-btn audit-btn-primary"
              title="Reload audit records from backend"
            >
              <span>Refresh</span>
            </button>

            {filteredLogs.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="audit-btn audit-btn-secondary"
                title="Export logs to CSV spreadsheet"
              >
                <span>Export CSV</span>
              </button>
            )}

            {(selectedEmployee || selectedAction || selectedDate || searchQuery) && (
              <button
                onClick={clearFilters}
                className="audit-btn audit-btn-secondary"
                title="Reset active filters"
              >
                <span>Clear Filters</span>
                <CloseIcon size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Detailed KPI Summary Cards - Compact 2-column on mobile */}
        <div className="audit-kpi-grid">
          <div className="audit-kpi-card">
            <span className="audit-kpi-label">Total Events</span>
            <div className="audit-kpi-value">{totalEventsCount}</div>
            <span className="audit-kpi-sub" style={{ color: '#2563eb' }}>Matching Records</span>
          </div>

          <div className="audit-kpi-card">
            <span className="audit-kpi-label">Auth & Sessions</span>
            <div className="audit-kpi-value" style={{ color: '#059669' }}>{authEventsCount}</div>
            <span className="audit-kpi-sub" style={{ color: '#059669' }}>Logins & Attendance</span>
          </div>

          <div className="audit-kpi-card">
            <span className="audit-kpi-label">System Changes</span>
            <div className="audit-kpi-value" style={{ color: '#7c3aed' }}>{systemModificationsCount}</div>
            <span className="audit-kpi-sub" style={{ color: '#7c3aed' }}>Create / Update / Delete</span>
          </div>

          <div className="audit-kpi-card">
            <span className="audit-kpi-label">Active Operators</span>
            <div className="audit-kpi-value" style={{ color: '#d97706' }}>{uniqueOperatorsCount}</div>
            <span className="audit-kpi-sub" style={{ color: '#d97706' }}>Distinct Actors</span>
          </div>
        </div>

        {/* Compact Filter Controls Bar */}
        <div className="audit-filter-panel">
          {/* Text Search */}
          <div className="audit-filter-item search-item">
            <label className="audit-filter-label">Search Trail</label>
            <div className="audit-search-wrapper">
              <span className="audit-search-icon"><SearchIcon size={13} /></span>
              <input
                type="text"
                className="audit-filter-input audit-search-field"
                placeholder="Search action, details, user, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                >
                  <CloseIcon size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Super Admin: Filter by Employee */}
          {currentUser.isSuperAdmin && (
            <div className="audit-filter-item">
              <label className="audit-filter-label">User / Employee</label>
              <select
                className="audit-filter-input audit-select-field"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">All Users</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name || emp.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter by Action Category */}
          <div className="audit-filter-item">
            <label className="audit-filter-label">Action Category</label>
            <select
              className="audit-filter-input audit-select-field"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="Logged In">Logged In</option>
              <option value="Clocked In">Clocked In</option>
              <option value="Clocked Out">Clocked Out</option>
              <option value="Task Created">Task Created</option>
              <option value="Task Updated">Task Updated</option>
              <option value="Task Deleted">Task Deleted</option>
              <option value="Leave Applied">Leave Applied</option>
              <option value="Leave Status Updated">Leave Status Updated</option>
              <option value="Employee Created">Employee Created</option>
              <option value="Employee Updated">Employee Updated</option>
              <option value="Employee Deleted">Employee Deleted</option>
              <option value="Registration Revoked">Registration Revoked</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="audit-filter-item">
            <label className="audit-filter-label">Date Filter</label>
            <input
              type="date"
              className="audit-filter-input audit-date-field"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="audit-loading-wrapper">
            <div className="audit-spinner"></div>
            <span>Fetching system audit records...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty-card">
            <p className="no-data-text">No activity records found matching the active filters.</p>
            {(selectedEmployee || selectedAction || selectedDate || searchQuery) && (
              <button
                type="button"
                onClick={clearFilters}
                className="audit-btn audit-btn-primary"
                style={{ margin: '8px auto 0', display: 'inline-flex' }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="audit-table-card">
            <div className="audit-table-scroll-container">
              <table className="audit-dense-table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>Timestamp</th>
                    {currentUser.isSuperAdmin && <th style={{ width: '130px' }}>User</th>}
                    <th style={{ width: '120px' }}>Action</th>
                    <th>Description</th>
                    <th style={{ width: '110px' }}>IP Address</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="audit-table-row"
                    >
                      <td>
                        <div className="time-cell-box">
                          <span className="time-text-abs">{formatDate(log.createdAt)}</span>
                          <span className="time-text-rel">{getRelativeTime(log.createdAt)}</span>
                        </div>
                      </td>
                      {currentUser.isSuperAdmin && (
                        <td>
                          <span className="user-name-text" title={log.employeeName}>
                            {log.employeeName || 'System'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className={`badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="details-summary-text" title={log.details}>
                          {log.details || '—'}
                        </span>
                      </td>
                      <td>
                        <code className="ip-badge">{log.ipAddress || '—'}</code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="inspect-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          title="View detailed breakdown"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length > visibleCount && (
              <div className="audit-load-more-row">
                <button
                  type="button"
                  className="audit-load-more-btn"
                  onClick={() => setVisibleCount(prev => prev + 30)}
                >
                  Load More ({filteredLogs.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Log Detail Popup Modal */}
      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
        >
          <div className="audit-modal-card">
            {/* Modal Header */}
            <div className="audit-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div className="audit-modal-header-icon">
                  <AuditIcon size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Audit Event Detail
                  </h3>
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    Log Reference: #{selectedLog.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="audit-modal-close-btn"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="audit-modal-body">
              <div className="detail-meta-grid">
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Action</span>
                  <div>
                    <span className={`badge ${getActionBadgeClass(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Operator / User</span>
                  <div className="detail-meta-val">{selectedLog.employeeName || 'System'}</div>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Timestamp</span>
                  <div className="detail-meta-val">
                    {formatDate(selectedLog.createdAt)} <span style={{ color: '#64748b', fontSize: 10 }}>({getRelativeTime(selectedLog.createdAt)})</span>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">IP Address</span>
                  <div>
                    <code className="ip-badge">{selectedLog.ipAddress || '—'}</code>
                  </div>
                </div>

                {selectedLog.organization && (
                  <div className="detail-meta-item">
                    <span className="detail-meta-label">Organization ID</span>
                    <div className="detail-meta-val">{selectedLog.organization}</div>
                  </div>
                )}
              </div>

              {/* Event Description & Payload */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="detail-meta-label">Event Description & Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(selectedLog.details || '')}
                    className="copy-btn"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="detail-payload-box">
                  {selectedLog.details || 'No additional event details recorded.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="audit-modal-footer">
              <button
                type="button"
                className="audit-btn audit-btn-secondary"
                onClick={() => handleCopyDetails(`Log ID: ${selectedLog.id}\nAction: ${selectedLog.action}\nUser: ${selectedLog.employeeName || 'System'}\nTimestamp: ${selectedLog.createdAt}\nIP: ${selectedLog.ipAddress || ''}\nDetails: ${selectedLog.details || ''}`)}
              >
                {copied ? '✓ Copied Full Log' : 'Copy All'}
              </button>
              <button
                type="button"
                className="audit-btn audit-btn-primary"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ─── Header Banner ─── */
        .audit-header-banner {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 18px;
          box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .audit-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .audit-header-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
        }

        .audit-header-badge {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .audit-header-title {
          margin: 2px 0 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }

        .audit-header-desc {
          margin: 0;
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.35;
        }

        .audit-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* ─── Common Buttons ─── */
        .audit-btn {
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
          padding: 5px 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .audit-btn-primary {
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #2563eb;
        }
        .audit-btn-primary:hover {
          background: #1d4ed8;
        }

        .audit-btn-secondary {
          background: #f8fafc;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .audit-btn-secondary:hover {
          background: #f1f5f9;
        }

        /* ─── KPI Summary Cards (Compact 2-col on mobile) ─── */
        .audit-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        @media (min-width: 640px) {
          .audit-kpi-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }
        }

        .audit-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 9px 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .audit-kpi-label {
          font-size: 9.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .audit-kpi-value {
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
          line-height: 1.15;
        }

        .audit-kpi-sub {
          font-size: 9.5px;
          font-weight: 600;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ─── Filter Panel ─── */
        .audit-filter-panel {
          display: flex;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          flex-wrap: wrap;
        }

        .audit-filter-item {
          flex: 1;
          min-width: 130px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audit-filter-item.search-item {
          flex: 1.8;
          min-width: 180px;
        }

        .audit-filter-label {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }

        .audit-search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .audit-search-icon {
          position: absolute;
          left: 9px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .audit-filter-input {
          height: 31px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 11px;
          padding: 0 8px;
          color: #0f172a;
          outline: none;
          width: 100%;
          transition: border-color 0.15s ease;
        }

        .audit-filter-input:focus {
          border-color: #2563eb;
        }

        .audit-search-field {
          padding-left: 28px;
          padding-right: 24px;
        }

        .audit-select-field {
          appearance: auto;
        }

        /* ─── Table Card & Dense Rows ─── */
        .audit-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        .audit-table-scroll-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .audit-dense-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
          min-width: 580px;
        }

        .audit-dense-table th {
          background-color: #f8fafc;
          padding: 7px 10px;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .audit-dense-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .audit-table-row {
          cursor: pointer;
          transition: background-color 0.1s ease;
        }

        .audit-table-row:hover {
          background-color: #f8fafc;
        }

        .time-cell-box {
          display: flex;
          flex-direction: column;
        }

        .time-text-abs {
          font-size: 10.5px;
          color: #1e293b;
          font-weight: 500;
          white-space: nowrap;
        }

        .time-text-rel {
          font-size: 9px;
          color: #94a3b8;
          line-height: 1;
          margin-top: 1px;
        }

        .user-name-text {
          font-weight: 600;
          color: #1e293b;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
          display: block;
        }

        .details-summary-text {
          color: #475569;
          line-height: 1.35;
          font-size: 11px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ip-badge {
          background-color: #f1f5f9;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          color: #475569;
          border: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .inspect-btn {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 9.5px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .inspect-btn:hover {
          background: #2563eb;
          color: #ffffff;
        }

        .audit-load-more-row {
          display: flex;
          justify-content: center;
          padding: 10px;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .audit-load-more-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          padding: 5px 14px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .audit-load-more-btn:hover {
          background: #f1f5f9;
        }

        .audit-loading-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 40px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 600;
        }

        .audit-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #bfdbfe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .audit-empty-card {
          padding: 40px 20px;
          text-align: center;
          background: #ffffff;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
          font-size: 12px;
          color: #64748b;
        }

        /* ─── Detail Modal Backdrop & Card ─── */
        .audit-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(3px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .audit-modal-card {
          background: #ffffff;
          border-radius: 12px;
          width: 100%;
          maxWidth: 480px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .audit-modal-header {
          padding: 11px 14px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }

        .audit-modal-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .audit-modal-close-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #64748b;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
        }

        .audit-modal-body {
          padding: 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .detail-meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-meta-label {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.03em;
        }

        .detail-meta-val {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
          word-break: break-word;
        }

        .copy-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #2563eb;
          font-size: 9.5px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          cursor: pointer;
        }

        .detail-payload-box {
          background: #0f172a;
          color: #f8fafc;
          border-radius: 8px;
          padding: 10px 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10.5px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 220px;
          overflow-y: auto;
        }

        .audit-modal-footer {
          padding: 9px 14px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        /* ─── Badges ─── */
        :global(.badge) {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 9.5px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
        }

        :global(.badge-login) {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        :global(.badge-clockin) {
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        :global(.badge-danger) {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        :global(.badge-create) {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        :global(.badge-update) {
          background-color: #f0fdfa;
          color: #0f766e;
          border: 1px solid #99f6e4;
        }

        :global(.badge-leave) {
          background-color: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        :global(.badge-payroll) {
          background-color: #faf5ff;
          color: #6b21a8;
          border: 1px solid #f3e8ff;
        }

        :global(.badge-task) {
          background-color: #ecfeff;
          color: #155e75;
          border: 1px solid #a5f3fc;
        }

        :global(.badge-default) {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        /* ─── Mobile Responsiveness ─── */
        @media (max-width: 640px) {
          .audit-header-banner {
            padding: 10px 12px;
            gap: 8px;
          }
          .audit-header-title {
            font-size: 14.5px;
          }
          .audit-header-desc {
            display: none !important;
          }
          .audit-header-actions {
            width: 100%;
            display: flex;
            gap: 6px;
          }
          .audit-header-actions .audit-btn {
            flex: 1;
            justify-content: center;
            padding: 5px 6px;
            font-size: 10.5px;
          }
          .audit-kpi-grid {
            gap: 6px;
          }
          .audit-kpi-card {
            padding: 7px 9px;
          }
          .audit-kpi-value {
            font-size: 17px;
          }
          .audit-filter-panel {
            padding: 8px 10px;
            gap: 6px;
          }
          .audit-filter-input {
            height: 29px;
            font-size: 10.5px;
          }
        }

        @media (max-width: 360px) {
          .audit-header-title {
            font-size: 13.5px;
          }
          .audit-kpi-label {
            font-size: 8.5px;
          }
          .audit-kpi-value {
            font-size: 15px;
          }
          .audit-dense-table th,
          .audit-dense-table td {
            padding: 5px 7px;
          }
        }
      `}</style>
    </PageWrapper>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1rem', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Loading audit trail...</span>
      </div>
    }>
      <AuditLogsContent />
    </Suspense>
  );
}
