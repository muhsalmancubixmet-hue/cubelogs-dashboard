'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { SearchIcon } from '@/components/Icons';

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

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Salary Structures</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Assign and review each employee&apos;s pay basis and compensation. Monthly employees are paid from a monthly structure. Daily Wage employees are paid using their contractual daily rate.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/payroll/components"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            Salary Components →
          </Link>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex' }}>
              <SearchIcon size={15} />
            </span>
            <input
              id="salary-search"
              type="text"
              placeholder="Search by name, code or designation…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', width: '100%' }}
              className="form-control"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="panel alert-box alert-box-danger" style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.88rem' }}>
          {errorMsg}
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
                              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                Hourly Wage
                              </span>
                            ) : isDaily ? (
                              <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                Daily Wage
                              </span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                                Monthly
                              </span>
                            )
                          ) : (
                            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                              Salary Not Assigned
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Link
                                href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                              >
                                View
                              </Link>
                              {canManage && (
                                <Link
                                  href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                >
                                  Manage
                                </Link>
                              )}
                            </div>
                          ) : (
                            <div>
                              {canManage ? (
                                <Link
                                  href={`/admin/employees/profile?id=${emp.employee_id}&tab=salary`}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                                >
                                  Assign Compensation
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                ‹ Previous
              </button>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => (page < totalPages ? p + 1 : p))}
                disabled={page >= totalPages || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}
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
