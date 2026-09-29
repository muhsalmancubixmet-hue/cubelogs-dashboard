'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  ArrowRightIcon,
  SearchIcon,
  BankIcon,
} from '@/components/Icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollPeriodsPage() {
  const { currentUser } = useApp();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  useEffect(() => {
    async function fetchPeriods() {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await apiFetch('/payroll/periods/');
        setPeriods(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching payroll periods:', err);
        setErrorMsg(err.message || 'Failed to load payroll periods.');
      } finally {
        setLoading(false);
      }
    }
    fetchPeriods();
  }, []);

  // Distinct available years
  const availableYears = useMemo(() => {
    const years = new Set(periods.map(p => p.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [periods]);

  // Filtered periods
  const filteredPeriods = useMemo(() => {
    return periods.filter(p => {
      const monthName = MONTH_NAMES[(p.month || 1) - 1] || '';
      const label = `${monthName} ${p.year}`.toLowerCase();
      const matchSearch = !searchQuery || label.includes(searchQuery.toLowerCase().trim());
      const matchYear = yearFilter === 'ALL' || String(p.year) === String(yearFilter);
      return matchSearch && matchYear;
    });
  }, [periods, searchQuery, yearFilter]);

  return (
    <PageWrapper
      title="All Payroll Periods & Transfers"
      requiredPermission={['payroll:view', 'payroll:process', 'payroll:manage']}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link
                href="/payroll"
                style={{ fontSize: '0.85rem', color: '#0284c7', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                ← Back to Monthly Payroll
              </Link>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-main, #0f172a)' }}>
              All Payroll Periods & Statements
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)' }}>
              Comprehensive archive of all payroll cycles. Click any month to view all bank transfers and disbursement details.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/payroll/payments"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', textDecoration: 'none', fontWeight: '600' }}
            >
              <BankIcon size={14} />
              <span>Current Month Payments</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', maxWidth: '360px', position: 'relative' }}>
            <SearchIcon size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search month or year (e.g. September)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '0.88rem',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted, #64748b)' }}>
              Filter by Year:
            </span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '0.88rem',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'var(--card-bg, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Loading payroll periods...</span>
          </div>
        ) : filteredPeriods.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px'
          }}>
            <CalendarIcon size={44} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
              No Payroll Periods Found
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
              {searchQuery || yearFilter !== 'ALL'
                ? 'No months match your search criteria. Try resetting filters.'
                : 'No payroll cycles have been processed yet for your organization.'}
            </p>
            <Link
              href="/payroll"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <span>Go to Monthly Payroll</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Period (Month & Year)</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Payroll Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Employees</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Total Net Payout</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Disbursement Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriods.map((period) => {
                    const monthName = MONTH_NAMES[(period.month || 1) - 1] || `Month ${period.month}`;
                    const isFinalized = period.status === 'Finalized';
                    const isCalculated = period.status === 'Calculated';
                    const paidCount = period.paid_count || 0;
                    const totalEmp = period.total_employees || 0;
                    const isFullyPaid = isFinalized && totalEmp > 0 && paidCount >= totalEmp;

                    return (
                      <tr
                        key={period.id || `${period.year}-${period.month}`}
                        style={{ borderBottom: '1px solid var(--border, #f1f5f9)', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f8fafc)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Month & Year */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: isFinalized ? '#f0fdf4' : '#eff6ff',
                              color: isFinalized ? '#16a34a' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              border: `1px solid ${isFinalized ? '#bbf7d0' : '#bfdbfe'}`
                            }}>
                              {period.month < 10 ? `0${period.month}` : period.month}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)', fontSize: '0.95rem' }}>
                                {monthName} {period.year}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                                Cycle Revision {period.current_revision || 1}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: isFinalized ? '#dcfce7' : (isCalculated ? '#dbeafe' : '#f1f5f9'),
                            color: isFinalized ? '#15803d' : (isCalculated ? '#1d4ed8' : '#475569')
                          }}>
                            {isFinalized ? <LockIcon size={11} /> : (isCalculated ? <ClockIcon size={11} /> : null)}
                            <span>{period.status}</span>
                          </span>
                        </td>

                        {/* Employees */}
                        <td style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-main, #334155)' }}>
                          {totalEmp} {totalEmp === 1 ? 'employee' : 'employees'}
                        </td>

                        {/* Total Net Payout */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main, #0f172a)', fontSize: '0.95rem' }}>
                            {formatCurrency(period.total_net_payable || 0, period.currency || 'INR')}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Base Gross: {formatCurrency(period.total_base_gross || 0, period.currency || 'INR')}
                          </span>
                        </td>

                        {/* Disbursement Status */}
                        <td style={{ padding: '14px 18px' }}>
                          {isFinalized ? (
                            isFullyPaid ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                fontSize: '0.78rem',
                                fontWeight: '700'
                              }}>
                                <CheckIcon size={12} />
                                <span>All Disbursed ({paidCount}/{totalEmp})</span>
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: paidCount > 0 ? '#fff7ed' : '#f8fafc',
                                color: paidCount > 0 ? '#c2410c' : '#64748b',
                                border: `1px solid ${paidCount > 0 ? '#fed7aa' : '#e2e8f0'}`,
                                fontSize: '0.78rem',
                                fontWeight: '700'
                              }}>
                                <ClockIcon size={12} />
                                <span>{paidCount} of {totalEmp} Paid</span>
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              Pre-Finalization
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            
                            {/* Primary Button: View Transfers */}
                            <Link
                              href={`/payroll/payments?year=${period.year}&month=${period.month}`}
                              className="btn btn-primary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                textDecoration: 'none',
                                backgroundColor: '#0284c7',
                                borderColor: '#0284c7'
                              }}
                              title={`View bank transfers and payment statement for ${monthName} ${period.year}`}
                            >
                              <BankIcon size={13} />
                              <span>View Transfers</span>
                              <ArrowRightIcon size={11} />
                            </Link>

                            {/* Secondary Button: Open Payroll */}
                            <Link
                              href={`/payroll?year=${period.year}&month=${period.month}`}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '6px 10px',
                                fontSize: '0.8rem',
                                textDecoration: 'none'
                              }}
                              title={`Open Monthly Payroll calculation view for ${monthName} ${period.year}`}
                            >
                              Payroll
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
