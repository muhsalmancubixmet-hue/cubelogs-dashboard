'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api';
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
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await apiFetch('/employees/');
        setEmployees(data.map(emp => ({ ...emp, id: String(emp.id) })));
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
      setLogs(data || []);
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
    return `${diffDays} days ago`;
  };

  // Action Badge styling helper
  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'Logged In':
        return 'badge-login';
      case 'Clocked In':
        return 'badge-clockin';
      case 'Clocked Out':
        return 'badge-clockout';
      case 'Task Created':
        return 'badge-task-create';
      case 'Task Updated':
        return 'badge-task-update';
      case 'Task Deleted':
        return 'badge-task-delete';
      case 'Leave Applied':
        return 'badge-leave-apply';
      case 'Leave Status Updated':
        return 'badge-leave-update';
      case 'Employee Created':
        return 'badge-emp-create';
      case 'Employee Updated':
        return 'badge-emp-update';
      case 'Employee Deleted':
        return 'badge-emp-delete';
      case 'Registration Revoked':
        return 'badge-revoke';
      default:
        return 'badge-default';
    }
  };

  // Handle clearing all filters
  const clearFilters = () => {
    setSelectedEmployee('');
    setSelectedAction('');
    setSelectedDate('');
    setSearchQuery('');
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

  if (!currentUser) return null;

  return (
    <PageWrapper title="System Audit Logs">
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="panel" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AuditIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Activity Trail & Security Logs</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
              {currentUser.isSuperAdmin 
                ? 'Monitor platform activity metrics, admin changes, and security operations.'
                : 'Review your activity trail and account action records.'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={fetchLogs}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Refresh Logs</span>
            </button>
            {(selectedEmployee || selectedAction || selectedDate || searchQuery) && (
              <button 
                onClick={clearFilters}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Clear Filters</span>
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filter controls panel */}
        <div className="filter-controls-card">
          {/* Text Search */}
          <div className="filter-group text-search">
            <label className="filter-label">Search Logs</label>
            <div className="search-input-wrapper">
              <span className="search-icon-inside"><SearchIcon size={16} /></span>
              <input
                type="text"
                className="form-input search-box-field"
                placeholder="Search by action, description, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Super Admin: Filter by Employee */}
          {currentUser.isSuperAdmin && (
            <div className="filter-group">
              <label className="filter-label">User / Employee</label>
              <select
                className="form-input filter-dropdown"
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

          {/* Filter by Action Type */}
          <div className="filter-group">
            <label className="filter-label">Action Category</label>
            <select
              className="form-input filter-dropdown"
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
          <div className="filter-group">
            <label className="filter-label">Specific Date</label>
            <input
              type="date"
              className="form-input filter-datepicker"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="audit-loading-spinner-wrapper">
            <div className="spinner"></div>
            <span>Refreshing logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty-state">
            <p className="no-data-text">No activity records found matching the active filters.</p>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  {currentUser.isSuperAdmin && <th>User</th>}
                  <th>Action</th>
                  <th>Description</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="time-col-cell">
                        <span className="time-absolute">{formatDate(log.createdAt)}</span>
                        <span className="time-relative">{getRelativeTime(log.createdAt)}</span>
                      </div>
                    </td>
                    {currentUser.isSuperAdmin && (
                      <td>
                        <span className="user-name-cell" title={log.employeeName}>
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
                      <span className="details-text-cell">{log.details || '—'}</span>
                    </td>
                    <td>
                      <code className="ip-code-badge">{log.ipAddress || '—'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length > visibleCount && (
              <div className="load-more-btn-container">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setVisibleCount(prev => prev + 25)}
                >
                  Load More Logs ({filteredLogs.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .filter-controls-card {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          background: linear-gradient(135deg, rgba(243, 244, 246, 0.6) 0%, rgba(229, 231, 235, 0.4) 100%);
          backdrop-filter: blur(10px);
          padding: 18px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(229, 231, 235, 0.8);
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group.text-search {
          flex: 1.8;
          min-width: 240px;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-light);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-inside {
          position: absolute;
          left: 12px;
          color: var(--text-light);
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .search-box-field {
          padding-left: 38px;
          height: 38px;
        }

        .filter-dropdown, .filter-datepicker {
          height: 38px;
          appearance: auto;
          font-size: 0.85rem;
        }

        .audit-loading-spinner-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 60px;
          color: var(--primary);
          font-weight: 600;
        }

        .spinner {
          width: 44px;
          height: 44px;
          border: 3px solid var(--primary-border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .audit-empty-state {
          padding: 60px;
          text-align: center;
          background-color: #f9fafb;
          border-radius: var(--radius-md);
          border: 1px dashed var(--border);
        }

        .audit-table-wrapper {
          overflow-x: auto;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
          background-color: white;
        }

        .audit-table th {
          background-color: #f8fafc;
          padding: 14px 16px;
          font-weight: 600;
          color: var(--text-main);
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }

        .audit-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .time-col-cell {
          display: flex;
          flex-direction: column;
        }

        .time-absolute {
          font-size: 0.82rem;
          color: var(--text-main);
          font-weight: 500;
        }

        .time-relative {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .user-name-cell {
          font-weight: 600;
          color: var(--text-main);
        }

        .details-text-cell {
          color: var(--text-muted);
          line-height: 1.45;
          word-break: break-word;
          font-size: 0.84rem;
        }

        .ip-code-badge {
          background-color: #f1f5f9;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-family: SFMono-Regular, Consolas, Monaco, monospace;
          font-size: 0.78rem;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .load-more-btn-container {
          display: flex;
          justify-content: center;
          padding: 20px;
          background-color: #f8fafc;
          border-top: 1px solid var(--border);
        }

        /* Action Badges styling mapping */
        :global(.badge) {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1;
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

        :global(.badge-clockout) {
          background-color: #fff5f5;
          color: #9c0006;
          border: 1px solid #fed7d7;
        }

        :global(.badge-task-create) {
          background-color: #ecfeff;
          color: #155e75;
          border: 1px solid #c5f6fa;
        }

        :global(.badge-task-update) {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        :global(.badge-task-delete) {
          background-color: #fff5f5;
          color: #b91c1c;
          border: 1px solid #fee2e2;
        }

        :global(.badge-leave-apply) {
          background-color: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        :global(.badge-leave-update) {
          background-color: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }

        :global(.badge-emp-create) {
          background-color: #faf5ff;
          color: #6b21a8;
          border: 1px solid #f3e8ff;
        }

        :global(.badge-emp-update) {
          background-color: #f0f9ff;
          color: #075985;
          border: 1px solid #e0f2fe;
        }

        :global(.badge-emp-delete) {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }

        :global(.badge-revoke) {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        :global(.badge-default) {
          background-color: #f3f4f6;
          color: #1f2937;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </PageWrapper>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Loading workspace...</span>
      </div>
    }>
      <AuditLogsContent />
    </Suspense>
  );
}
