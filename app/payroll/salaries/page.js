'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { 
  SearchIcon, 
  ArrowRightIcon, 
  EyeIcon, 
  EditIcon, 
  AddIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  WarningIcon, 
  CheckIcon, 
  DollarIcon, 
  ClockIcon, 
  CalendarIcon, 
  EmployeesIcon,
  CloseIcon
} from '@/components/Icons';

function SalaryStructuresContent() {
  const { currentUser, hasPermission } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const canManage = currentUser?.isSuperAdmin || hasPermission('salary:manage');

  // Debounce search query changes by 250ms and reset page to 1
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });
        if (debouncedSearch.trim()) {
          queryParams.set('search', debouncedSearch.trim());
        }

        const data = await apiFetch(`/payroll/employees/salaries/?${queryParams.toString()}`);
        if (data && Array.isArray(data.results)) {
          setEmployees(data.results);
          setTotalCount(data.count || 0);
        } else if (Array.isArray(data)) {
          setEmployees(data);
          setTotalCount(data.length);
        } else {
          setEmployees([]);
          setTotalCount(0);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load salary data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, pageSize, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Compute summary stats
  const stats = useMemo(() => {
    let assigned = 0;
    let unassigned = 0;
    let monthly = 0;
    let daily = 0;
    let hourly = 0;

    employees.forEach(emp => {
      if (emp.has_structure && emp.structure) {
        assigned++;
        if (emp.structure.compensation_type === 'HOURLY') hourly++;
        else if (emp.structure.compensation_type === 'DAILY') daily++;
        else monthly++;
      } else {
        unassigned++;
      }
    });

    return { assigned, unassigned, monthly, daily, hourly };
  }, [employees]);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
  };

  return (
    <div className="payroll-content-container">
      {/* Header bar */}
      <div className="salary-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Salary Structures</h2>
          <p className="salary-header-caption" style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Assign and review each employee&apos;s pay basis and compensation. Monthly employees are paid from a monthly structure. Daily Wage employees are paid using their contractual daily rate.
          </p>
        </div>
        <div className="salary-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
          <Link
            href="/payroll/components"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', borderRadius: '10px' }}
          >
            <span>Salary Components</span>
            <ArrowRightIcon size={13} />
          </Link>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px', minWidth: 0, flex: 1 }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: searchQuery ? '#2563eb' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              transition: 'color 0.2s ease'
            }}>
              <SearchIcon size={16} />
            </span>
            <input
              id="salary-search"
              type="text"
              placeholder="Search by name, code or designation…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: searchQuery ? '36px' : '14px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid var(--border, #cbd5e1)',
                backgroundColor: 'var(--bg-input, #ffffff)',
                fontSize: '0.86rem',
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary, #2563eb)';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border, #cbd5e1)';
                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 0,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="salary-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Total Directory Size */}
        <div className="salary-kpi-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Total Employees
            </span>
            <span style={{ display: 'flex', padding: '4px', borderRadius: '6px', background: 'var(--bg-card-nested, #f1f5f9)', color: 'var(--text-muted, #475569)' }}>
              <EmployeesIcon size={14} />
            </span>
          </div>
          <div className="salary-kpi-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {totalCount}
          </div>
          <span className="salary-kpi-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            Employees in directory
          </span>
        </div>

        {/* Configured Packages */}
        <div className="salary-kpi-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Configured Structures
            </span>
            <span style={{ display: 'flex', padding: '4px', borderRadius: '6px', background: 'rgba(22, 163, 74, 0.15)', color: '#22c55e' }}>
              <CheckIcon size={14} />
            </span>
          </div>
          <div className="salary-kpi-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            {stats.assigned}
          </div>
          <span className="salary-kpi-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            Active salary structures assigned
          </span>
        </div>

        {/* Missing / Unassigned Packages */}
        <div className="salary-kpi-card" style={{
          backgroundColor: stats.unassigned > 0 ? 'var(--bg-card, #fffbeb)' : 'var(--bg-card, #ffffff)',
          borderRadius: '12px',
          border: stats.unassigned > 0 ? '1px solid #f59e0b' : '1px solid var(--border, #e2e8f0)',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: stats.unassigned > 0 ? '#f59e0b' : 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Unassigned Employees
            </span>
            <span style={{ display: 'flex', padding: '4px', borderRadius: '6px', background: stats.unassigned > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card-nested, #f1f5f9)', color: stats.unassigned > 0 ? '#f59e0b' : 'var(--text-muted, #94a3b8)' }}>
              <WarningIcon size={14} />
            </span>
          </div>
          <div className="salary-kpi-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: stats.unassigned > 0 ? '#f59e0b' : 'var(--text-main, #475569)', marginTop: '6px' }}>
            {stats.unassigned}
          </div>
          <span className="salary-kpi-caption" style={{ fontSize: '0.75rem', color: stats.unassigned > 0 ? '#f59e0b' : 'var(--text-muted, #64748b)' }}>
            {stats.unassigned > 0 ? 'Action required before payroll runs' : 'All employees configured'}
          </span>
        </div>

        {/* Pay Basis Distribution */}
        <div className="salary-kpi-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Pay Basis Distribution
            </span>
            <span style={{ display: 'flex', padding: '4px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6' }}>
              <DollarIcon size={14} />
            </span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', marginTop: '8px' }}>
            <span style={{ color: 'var(--text-main, #475569)' }}>{stats.monthly} Monthly</span>
            <span style={{ margin: '0 6px', color: 'var(--border, #cbd5e1)' }}>•</span>
            <span style={{ color: '#0284c7' }}>{stats.daily} Daily</span>
            <span style={{ margin: '0 6px', color: 'var(--border, #cbd5e1)' }}>•</span>
            <span style={{ color: '#d97706' }}>{stats.hourly} Hourly</span>
          </div>
          <span className="salary-kpi-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '4px', display: 'block' }}>
            Breakdown across employees
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="panel alert-box alert-box-danger" style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WarningIcon size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Loading salary structures…
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Employee','Code','Designation','Pay Basis','Gross / Rate','Deductions','Net Salary / Rate','Effective From','Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
                      {searchQuery ? 'No employees match your search.' : 'No employees found.'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, idx) => {
                    const s = emp.structure;
                    const currency = s?.currency || 'INR';
                    const isDaily = s?.compensation_type === 'DAILY';
                    const isHourly = s?.compensation_type === 'HOURLY';
                    return (
                      <tr key={emp.employee_id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-elevated)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{emp.employee_name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-light)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{emp.employee_code}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-light)' }}>{emp.designation || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {s ? (
                            isHourly ? (
                              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                <ClockIcon size={11} />
                                <span>Hourly Wage</span>
                              </span>
                            ) : isDaily ? (
                              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                <CalendarIcon size={11} />
                                <span>Daily Wage</span>
                              </span>
                            ) : (
                              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-card-nested, #f1f5f9)', color: 'var(--text-muted, #475569)', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                <DollarIcon size={11} />
                                <span>Monthly</span>
                              </span>
                            )
                          ) : (
                            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                              <WarningIcon size={11} />
                              <span>Not Assigned</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: isHourly ? '#92400e' : isDaily ? '#0369a1' : 'var(--success)' }}>
                          {s ? (
                            isHourly
                              ? `${formatCurrency(Number(s.hourly_rate || 0), currency)} / hr`
                              : isDaily
                              ? `${formatCurrency(Number(s.daily_rate || 0), currency)} / day`
                              : formatCurrency(Number(s.gross_salary || 0), currency)
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--danger)' }}>
                          {s && Number(s.base_deductions || 0) > 0 ? `-${formatCurrency(Number(s.base_deductions), currency)}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: isHourly ? '#92400e' : isDaily ? '#0369a1' : 'var(--primary)' }}>
                          {s ? (
                            isHourly
                              ? `${formatCurrency(Number(s.hourly_rate || 0), currency)} / hr`
                              : isDaily
                              ? `${formatCurrency(Number(s.daily_rate || 0), currency)} / day`
                              : formatCurrency(Number(s.base_net_salary || 0), currency)
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                          {s ? fmtDate(s.effective_from) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {emp.has_structure ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <Link
                                href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="View Compensation Breakdown"
                              >
                                <EyeIcon size={12} />
                                <span>View</span>
                              </Link>
                              {canManage && (
                                <Link
                                  href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Manage / Revise Salary Structure"
                                >
                                  <EditIcon size={12} />
                                  <span>Manage</span>
                                </Link>
                              )}
                            </div>
                          ) : (
                            <div>
                              {canManage ? (
                                <Link
                                  href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', backgroundColor: '#2563eb', borderColor: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Assign Initial Salary Package"
                                >
                                  <AddIcon size={12} />
                                  <span>Assign Compensation</span>
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--text-light)', fontSize: '0.82rem' }}>Unassigned</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: '0.84rem', color: 'var(--text-light)', flexWrap: 'wrap', gap: '8px' }}>
            <span>Showing {employees.length} of {totalCount} employee{totalCount !== 1 ? 's' : ''} (Page {page} of {totalPages})</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeftIcon size={12} />
                <span>Previous</span>
              </button>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => (page < totalPages ? p + 1 : p))}
                disabled={page >= totalPages || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Next</span>
                <ChevronRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .salary-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .salary-header-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: 12px;
          }

          .salary-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
        }

        @media (max-width: 480px) {
          .salary-header-caption,
          .salary-kpi-caption {
            display: none !important;
          }

          .salary-kpi-card {
            padding: 10px 12px !important;
          }

          .salary-kpi-val {
            font-size: 1.15rem !important;
            margin-top: 3px !important;
          }
        }

        @media (max-width: 360px) {
          .salary-kpi-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }

          .salary-kpi-card {
            padding: 8px 10px !important;
          }
        }

        :global(:root.dark) .salary-kpi-card {
          background-color: var(--bg-card, #1e293b) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }
      `}</style>
    </div>
  );
}

export default function SalaryStructuresPage() {
  return (
    <PageWrapper
      title="Salary Structures"
      requiredPermission={['salary:view', 'salary:manage']}
    >
      <SalaryStructuresContent />
    </PageWrapper>
  );
}
