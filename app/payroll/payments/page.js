'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import { SearchIcon } from '@/components/Icons';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function getDaysInMonth(year, monthIndex) {
  // monthIndex is 0 for Jan, 11 for Dec
  return new Date(year, monthIndex + 1, 0).getDate();
}

function calculateNextScheduleDate(targetDay, refDate = new Date()) {
  if (!targetDay || targetDay < 1) targetDay = 1;

  const currentYear = refDate.getFullYear();
  const currentMonthIdx = refDate.getMonth(); // 0-indexed
  const currentDay = refDate.getDate();

  // Try current month
  const maxDaysCurrent = getDaysInMonth(currentYear, currentMonthIdx);
  const actualTargetDayCurrent = Math.min(targetDay, maxDaysCurrent);

  if (actualTargetDayCurrent >= currentDay) {
    return new Date(currentYear, currentMonthIdx, actualTargetDayCurrent);
  } else {
    // Next month
    let nextMonthIdx = currentMonthIdx + 1;
    let nextYear = currentYear;
    if (nextMonthIdx > 11) {
      nextMonthIdx = 0;
      nextYear += 1;
    }
    const maxDaysNext = getDaysInMonth(nextYear, nextMonthIdx);
    const actualTargetDayNext = Math.min(targetDay, maxDaysNext);
    return new Date(nextYear, nextMonthIdx, actualTargetDayNext);
  }
}

function formatDateFormatted(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '—';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthName = MONTHS[dateObj.getMonth()].slice(0, 3);
  const year = dateObj.getFullYear();
  return `${day} ${monthName} ${year}`;
}

function PayrollPaymentsContent() {
  const { currentUser, hasPermission } = useApp();
  const searchParams = useSearchParams();

  const today = new Date();
  const defaultYear = parseInt(searchParams.get('year')) || (today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear());
  const defaultMonth = parseInt(searchParams.get('month')) || (today.getMonth() === 0 ? 12 : today.getMonth() + 1);

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [periodSummary, setPeriodSummary] = useState(null);
  const [employeeSnapshots, setEmployeeSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Org Settings / Schedule State
  const [orgSettings, setOrgSettings] = useState(null);
  const [procDay, setProcDay] = useState(28);
  const [payDay, setPayDay] = useState(1);
  const [editScheduleModalOpen, setEditScheduleModalOpen] = useState(false);
  const [editProcDay, setEditProcDay] = useState(28);
  const [editPayDay, setEditPayDay] = useState(1);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState('');
  const [scheduleErrorMsg, setScheduleErrorMsg] = useState('');

  // Payment Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetSnap, setPayTargetSnap] = useState(null);
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false);
  const [viewPaymentTarget, setViewPaymentTarget] = useState(null);

  // Form Fields
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('BankTransfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  // Void Fields
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidError, setVoidError] = useState('');

  const canProcess = currentUser?.isSuperAdmin || hasPermission('payroll:process') || hasPermission('payroll:manage');
  const canManageSchedule = currentUser?.isSuperAdmin || hasPermission('payroll:manage') || hasPermission('settings:branding') || hasPermission('admin:templates');

  // Fetch Org Schedule Settings
  const fetchOrgSettings = async () => {
    try {
      const data = await apiFetch('/settings/');
      setOrgSettings(data);
      if (data) {
        const p = data.payroll_processing_day || 28;
        const s = data.salary_payment_day || 1;
        setProcDay(p);
        setPayDay(s);
        setEditProcDay(p);
        setEditPayDay(s);
      }
    } catch (err) {
      console.warn('Could not load org settings schedule:', err);
    }
  };

  // Fetch Period & Employee Payment Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const summaryRes = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/`);
      setPeriodSummary(summaryRes);

      if (summaryRes?.payroll_period) {
        const snapRes = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/employees/?page=1&page_size=200`);
        if (snapRes && Array.isArray(snapRes.results)) {
          setEmployeeSnapshots(snapRes.results);
        } else if (Array.isArray(snapRes)) {
          setEmployeeSnapshots(snapRes);
        } else {
          setEmployeeSnapshots([]);
        }
      } else {
        setEmployeeSnapshots([]);
      }
    } catch (err) {
      console.error('Error fetching payroll payment details:', err);
      setErrorMsg(err.message || 'Failed to load payroll payments for this period.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, setErrorMsg]);

  useEffect(() => {
    fetchOrgSettings();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Edit Schedule Modal
  const handleOpenEditSchedule = () => {
    setEditProcDay(procDay);
    setEditPayDay(payDay);
    setScheduleErrorMsg('');
    setEditScheduleModalOpen(true);
  };

  // Save Org Schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    setScheduleSuccessMsg('');
    setScheduleErrorMsg('');

    const pDay = parseInt(editProcDay);
    const sDay = parseInt(editPayDay);

    if (isNaN(pDay) || pDay < 1 || pDay > 31) {
      setScheduleErrorMsg('Processing day must be between 1 and 31.');
      setSavingSchedule(false);
      return;
    }
    if (isNaN(sDay) || sDay < 1 || sDay > 31) {
      setScheduleErrorMsg('Salary payment day must be between 1 and 31.');
      setSavingSchedule(false);
      return;
    }

    try {
      const res = await apiFetch('/settings/', {
        method: 'PUT',
        body: JSON.stringify({
          ...(orgSettings || {}),
          payroll_processing_day: pDay,
          salary_payment_day: sDay,
        }),
      });
      setOrgSettings(res);
      setProcDay(pDay);
      setPayDay(sDay);
      setScheduleSuccessMsg('Payroll schedule settings updated successfully.');
      setEditScheduleModalOpen(false);
      setTimeout(() => setScheduleSuccessMsg(''), 4000);
    } catch (err) {
      setScheduleErrorMsg(err.message || 'Failed to update payroll schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Next Date Calculations
  const nextPayrollRunDate = useMemo(() => calculateNextScheduleDate(procDay, today), [procDay]);
  const nextSalaryPaymentDate = useMemo(() => calculateNextScheduleDate(payDay, today), [payDay]);

  // Handlers for Single Pay
  const handleOpenPayModal = (snap) => {
    setPayTargetSnap(snap);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('BankTransfer');
    setPayRef('');
    setPayNotes('');
    setPayError('');
    setShowPayModal(true);
  };

  const handleSinglePaySubmit = async (e) => {
    e.preventDefault();
    if (!payTargetSnap) return;
    try {
      setPaySubmitting(true);
      setPayError('');
      await apiFetch('/payroll/payments/pay-employee/', {
        method: 'POST',
        body: JSON.stringify({
          snapshot_id: payTargetSnap.id,
          paid_at: payDate,
          payment_method: payMethod,
          transaction_reference: payRef,
          notes: payNotes,
        }),
      });
      setSuccessMsg(`Successfully recorded salary payment for ${payTargetSnap.employee_name}.`);
      setShowPayModal(false);
      setPayTargetSnap(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setPayError(err.message || 'Failed to record salary payment.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Handlers for Bulk Pay
  const handleOpenBulkPayModal = () => {
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('BankTransfer');
    setPayRef('');
    setPayNotes('');
    setPayError('');
    setShowBulkPayModal(true);
  };

  const handleBulkPaySubmit = async (e) => {
    e.preventDefault();
    try {
      setPaySubmitting(true);
      setPayError('');
      const res = await apiFetch('/payroll/payments/bulk-pay/', {
        method: 'POST',
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          paid_at: payDate,
          payment_method: payMethod,
          transaction_reference: payRef,
          notes: payNotes,
        }),
      });
      setSuccessMsg(res.message || 'Successfully recorded bulk salary payments.');
      setShowBulkPayModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setPayError(err.message || 'Failed to record bulk salary payments.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Handlers for View / Void
  const handleOpenViewPaymentModal = (snap) => {
    setViewPaymentTarget(snap.payment_details || snap);
    setVoidReason('');
    setVoidError('');
    setShowViewPaymentModal(true);
  };

  const handleVoidPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!viewPaymentTarget || !viewPaymentTarget.id) return;
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setVoidError('Reason (minimum 5 characters) is required to void payment.');
      return;
    }
    try {
      setVoidSubmitting(true);
      setVoidError('');
      await apiFetch(`/payroll/payments/${viewPaymentTarget.id}/void/`, {
        method: 'POST',
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      setSuccessMsg('Salary payment successfully voided. Record returned to Unpaid.');
      setShowViewPaymentModal(false);
      setViewPaymentTarget(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setVoidError(err.message || 'Failed to void salary payment.');
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Derived Properties
  const pPeriod = periodSummary?.payroll_period;
  const isPayrollFinalized = pPeriod?.status === 'Finalized';
  const currency = pPeriod?.currency || orgSettings?.payroll_currency || 'INR';

  const paymentSummary = periodSummary?.payment_summary || {
    total_paid_amount: '0.00',
    total_unpaid_amount: '0.00',
    paid_employee_count: 0,
    unpaid_employee_count: 0,
  };

  // Filtered Table Rows
  const filteredSnapshots = useMemo(() => {
    return employeeSnapshots.filter(snap => {
      const matchSearch = !searchQuery ||
        snap.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snap.designation?.toLowerCase().includes(searchQuery.toLowerCase());

      const isPaid = snap.payment_status === 'Paid';
      let matchStatus = true;
      if (statusFilter === 'PAID') matchStatus = isPaid;
      if (statusFilter === 'UNPAID') matchStatus = !isPaid;

      return matchSearch && matchStatus;
    });
  }, [employeeSnapshots, searchQuery, statusFilter]);

  const currentMonthName = MONTHS[selectedMonth - 1];

  return (
    <PageWrapper
      title="Payroll Payments"
      requiredPermission={['payroll:view', 'payroll:process', 'payroll:manage']}
    >
      <div className="payments-page-container">
        
        {/* Header Title & Navigation Bar */}
        <div className="payments-header">
          <div className="payments-header-text">
            <h2 className="payments-title">
              Payroll Payments
            </h2>
            <p className="payments-subtitle">
              Review finalized payroll and record when employee salaries are actually paid.
            </p>
          </div>

          <div className="payments-header-actions">
            <Link href="/payroll" className="btn btn-secondary back-to-payroll-btn">
              ← Back to Monthly Payroll
            </Link>
          </div>
        </div>

        {/* Short Explanatory Sentence */}
        <div className="payments-info-banner">
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
          <span>Finalize payroll first, then record when employee salaries are actually paid.</span>
        </div>

        {/* ========================================================================= */}
        {/* 1. ORGANIZATION PAYROLL SCHEDULE CARD                                     */}
        {/* ========================================================================= */}
        <div className="payments-card">
          <div className="schedule-card-header">
            <div className="schedule-title-wrap">
              <div className="schedule-heading-row">
                <h3 className="schedule-heading">
                  Organization Payroll Schedule
                </h3>
                <span className="badge schedule-freq-badge">
                  Frequency: Monthly
                </span>
              </div>
              <p className="schedule-subheading">
                Planned processing and salary disbursement target days.
              </p>
            </div>

            {canManageSchedule && (
              <button
                type="button"
                className="btn btn-secondary btn-sm schedule-edit-btn"
                onClick={handleOpenEditSchedule}
              >
                ⚙️ Edit Schedule
              </button>
            )}
          </div>

          {scheduleSuccessMsg && (
            <div className="schedule-success-alert">
              {scheduleSuccessMsg}
            </div>
          )}

          {/* Compact Schedule Overview Cards */}
          <div className="schedule-mini-grid">
            
            {/* Processing Day */}
            <div className="schedule-mini-card">
              <span className="schedule-card-lbl">
                Payroll Processing Day
              </span>
              <div className="schedule-card-val">
                Day {procDay} of month
              </div>
              <span className="schedule-card-sub">
                Planned HR calculation date
              </span>
            </div>

            {/* Salary Payment Day */}
            <div className="schedule-mini-card">
              <span className="schedule-card-lbl">
                Salary Payment Day
              </span>
              <div className="schedule-card-val">
                Day {payDay} of month
              </div>
              <span className="schedule-card-sub">
                Planned salary disbursement date
              </span>
            </div>

            {/* Next Payroll Run */}
            <div className="schedule-mini-card schedule-run-card">
              <span className="schedule-card-lbl schedule-run-lbl">
                Next Payroll Run
              </span>
              <div className="schedule-card-val schedule-run-val">
                {formatDateFormatted(nextPayrollRunDate)}
              </div>
              <span className="schedule-card-sub schedule-run-sub">
                Target: Day {procDay}
              </span>
            </div>

            {/* Next Salary Payment */}
            <div className="schedule-mini-card schedule-pay-card">
              <span className="schedule-card-lbl schedule-pay-lbl">
                Next Salary Payment
              </span>
              <div className="schedule-card-val schedule-pay-val">
                {formatDateFormatted(nextSalaryPaymentDate)}
              </div>
              <span className="schedule-card-sub schedule-pay-sub">
                Target: Day {payDay}
              </span>
            </div>

          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '1rem', flexShrink: 0 }}>✕</button>
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '1rem', flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PERIOD SELECTOR & SUMMARY METRICS                                      */}
        {/* ========================================================================= */}
        <div className="payments-card">
          <div className="period-controls-row">
            
            {/* Month & Year Selectors */}
            <div className="period-month-select-box">
              <span className="period-select-label">
                Payroll Month:
              </span>
              <div className="period-select-inputs">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="period-native-select"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="period-native-select"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Status Badge & Bulk Action Button */}
            <div className="period-actions-wrap">
              <span className={`period-status-badge ${isPayrollFinalized ? 'status-finalized' : 'status-draft'}`}>
                {pPeriod ? `Status: ${pPeriod.status}` : 'Status: Draft / Uncalculated'}
              </span>

              {canProcess && isPayrollFinalized && paymentSummary.unpaid_employee_count > 0 && (
                <button
                  type="button"
                  className="btn btn-primary period-bulk-btn"
                  onClick={handleOpenBulkPayModal}
                >
                  ✓ Mark All Unpaid as Paid
                </button>
              )}
            </div>

          </div>

          {/* Metric Cards Grid */}
          <div className="metrics-grid">
            
            {/* Total Net Payable */}
            <div className="metric-card metric-net">
              <span className="metric-card-lbl">
                Total Net Payable
              </span>
              <div className="metric-card-val">
                {formatCurrency(pPeriod?.total_net_payable || 0, currency)}
              </div>
              <span className="metric-card-sub">
                {pPeriod?.total_employees || 0} employees in period
              </span>
            </div>

            {/* Total Paid */}
            <div className="metric-card metric-paid">
              <span className="metric-card-lbl metric-paid-lbl">
                Total Paid
              </span>
              <div className="metric-card-val metric-paid-val">
                {formatCurrency(paymentSummary.total_paid_amount || 0, currency)}
              </div>
              <span className="metric-card-sub metric-paid-sub">
                {paymentSummary.paid_employee_count || 0} employees paid
              </span>
            </div>

            {/* Total Unpaid */}
            <div className="metric-card metric-unpaid">
              <span className="metric-card-lbl metric-unpaid-lbl">
                Total Unpaid
              </span>
              <div className="metric-card-val metric-unpaid-val">
                {formatCurrency(paymentSummary.total_unpaid_amount || 0, currency)}
              </div>
              <span className="metric-card-sub metric-unpaid-sub">
                {paymentSummary.unpaid_employee_count || 0} employees pending
              </span>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FINALIZED EMPLOYEE PAYMENT TABLE & CARDS                               */}
        {/* ========================================================================= */}
        <div className="payments-card">
          
          {/* Toolbar */}
          <div className="table-toolbar">
            <div className="toolbar-search-box">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search employee or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }}>
                  <SearchIcon size={14} />
                </span>
              </div>
            </div>

            <div className="toolbar-filter-box">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input toolbar-select"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="UNPAID">Unpaid Only</option>
                <option value="PAID">Paid Only</option>
              </select>
            </div>
          </div>

          {/* Table / Cards Area */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 16px', color: '#0284c7', fontWeight: '600', fontSize: '0.9rem' }}>
              Loading payroll payment records...
            </div>
          ) : !pPeriod ? (
            <div className="payments-empty-state">
              <p className="payments-empty-state-title">
                No payroll calculations found for {currentMonthName} {selectedYear}.
              </p>
              <p className="payments-empty-state-desc">
                Please run and finalize payroll on the Monthly Payroll page before recording payments.
              </p>
              <Link href={`/payroll?year=${selectedYear}&month=${selectedMonth}`} className="btn btn-primary btn-sm">
                Go to Monthly Payroll →
              </Link>
            </div>
          ) : !isPayrollFinalized ? (
            <div className="payments-empty-state payments-empty-state-warning">
              <p className="payments-empty-warning-title">
                Payroll for {currentMonthName} {selectedYear} is currently {pPeriod.status}.
              </p>
              <p className="payments-empty-warning-desc">
                Salary payments can be recorded after payroll is finalized.
              </p>
              <Link href={`/payroll?year=${selectedYear}&month=${selectedMonth}`} className="btn btn-primary btn-sm" style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
                Go to Monthly Payroll →
              </Link>
            </div>
          ) : employeeSnapshots.length > 0 && paymentSummary.unpaid_employee_count === 0 && statusFilter === 'ALL' && !searchQuery ? (
            <div className="payments-empty-state payments-empty-state-success">
              <p className="payments-empty-success-title">
                ✓ All salaries for {currentMonthName} {selectedYear} have been recorded as paid.
              </p>
              <p className="payments-empty-success-desc">
                Total disbursed: {formatCurrency(paymentSummary.total_paid_amount, currency)} across {paymentSummary.paid_employee_count} employees.
              </p>
            </div>
          ) : filteredSnapshots.length === 0 ? (
            <div className="payments-empty-state">
              <p className="payments-empty-state-desc" style={{ margin: 0 }}>
                No employee payment records match the selected search or filter criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (>768px) */}
              <div className="desktop-table-wrapper">
                <table className="payments-data-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 14px' }}>Employee</th>
                      <th style={{ padding: '12px 14px', fontWeight: '800' }}>Net Payable</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Payment Date</th>
                      <th style={{ padding: '12px 14px' }}>Payment Method</th>
                      <th style={{ padding: '12px 14px' }}>Reference</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSnapshots.map(snap => {
                      const isPaid = snap.payment_status === 'Paid';
                      const payDetails = snap.payment_details;

                      return (
                        <tr key={snap.id}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{snap.employee_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{snap.designation || 'Staff'}</div>
                          </td>
                          <td style={{ padding: '14px', fontWeight: '800', color: '#15803d', fontSize: '0.95rem' }}>
                            {formatCurrency(snap.net_payable, snap.currency || currency)}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {isPaid ? (
                              <span className="badge-paid">
                                ✓ Paid
                              </span>
                            ) : (
                              <span className="badge-unpaid">
                                ● Unpaid
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px', color: '#475569' }}>
                            {isPaid && payDetails?.paid_at ? payDetails.paid_at : '—'}
                          </td>
                          <td style={{ padding: '14px', color: '#475569' }}>
                            {isPaid && payDetails ? (payDetails.payment_method_display || payDetails.payment_method) : '—'}
                          </td>
                          <td style={{ padding: '14px', color: '#64748b', fontSize: '0.82rem' }}>
                            {isPaid && payDetails?.transaction_reference ? payDetails.transaction_reference : '—'}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            {isPaid ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleOpenViewPaymentModal(snap)}
                                style={{ fontSize: '0.78rem', padding: '4px 10px', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#334155', fontWeight: '600' }}
                              >
                                View Payment
                              </button>
                            ) : canProcess ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleOpenPayModal(snap)}
                                style={{ fontSize: '0.78rem', padding: '4px 10px', backgroundColor: '#2563eb', borderColor: '#2563eb', color: '#ffffff', fontWeight: '700' }}
                              >
                                Mark as Paid
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (<=768px / 320px) */}
              <div className="mobile-records-wrapper">
                {filteredSnapshots.map(snap => {
                  const isPaid = snap.payment_status === 'Paid';
                  const payDetails = snap.payment_details;

                  return (
                    <div key={snap.id} className="mobile-payment-card">
                      <div className="mp-header">
                        <div className="mp-emp-info">
                          <div className="mp-emp-name">{snap.employee_name}</div>
                          <div className="mp-emp-desig">{snap.designation || 'Staff'}</div>
                        </div>
                        <div className="mp-badge-wrap">
                          {isPaid ? (
                            <span className="badge-paid">✓ Paid</span>
                          ) : (
                            <span className="badge-unpaid">● Unpaid</span>
                          )}
                        </div>
                      </div>

                      <div className="mp-amount-box">
                        <span className="mp-amount-lbl">Net Payable</span>
                        <span className="mp-amount-val">{formatCurrency(snap.net_payable, snap.currency || currency)}</span>
                      </div>

                      <div className="mp-details-grid">
                        <div className="mp-detail-item">
                          <span className="mp-detail-lbl">Date:</span>
                          <span className="mp-detail-val">{isPaid && payDetails?.paid_at ? payDetails.paid_at : '—'}</span>
                        </div>
                        <div className="mp-detail-item">
                          <span className="mp-detail-lbl">Method:</span>
                          <span className="mp-detail-val">{isPaid && payDetails ? (payDetails.payment_method_display || payDetails.payment_method) : '—'}</span>
                        </div>
                        {isPaid && payDetails?.transaction_reference && (
                          <div className="mp-detail-item mp-full-col">
                            <span className="mp-detail-lbl">Reference:</span>
                            <span className="mp-detail-val">{payDetails.transaction_reference}</span>
                          </div>
                        )}
                      </div>

                      <div className="mp-action-wrap">
                        {isPaid ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary mp-action-btn"
                            onClick={() => handleOpenViewPaymentModal(snap)}
                          >
                            View Payment Record
                          </button>
                        ) : canProcess ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary mp-action-btn"
                            onClick={() => handleOpenPayModal(snap)}
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', display: 'block' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 0: EDIT PAYROLL SCHEDULE                                            */}
        {/* ========================================================================= */}
        {editScheduleModalOpen && (
          <div className="modal-backdrop payment-modal-backdrop">
            <div className="payment-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Edit Payroll Schedule
                </h3>
                <button type="button" onClick={() => setEditScheduleModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>✕</button>
              </div>

              {scheduleErrorMsg && (
                <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', marginBottom: '12px' }}>
                  {scheduleErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payroll Frequency
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Monthly"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 10px', fontSize: '0.85rem', color: '#64748b' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payroll Processing Day (1–31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    className="form-input"
                    value={editProcDay}
                    onChange={(e) => setEditProcDay(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Planned day HR processes/finalizes payroll</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Salary Payment Day (1–31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    className="form-input"
                    value={editPayDay}
                    onChange={(e) => setEditPayDay(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Planned organization salary payment day</span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#475569', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f1f5f9', lineHeight: '1.35' }}>
                  ℹ️ Dates beyond the end of a month automatically use that month's last valid day.
                </div>

                <div className="modal-btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditScheduleModalOpen(false)} disabled={savingSchedule}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingSchedule} style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}>
                    {savingSchedule ? 'Saving...' : 'Save Schedule Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: SINGLE MARK AS PAID                                             */}
        {/* ========================================================================= */}
        {showPayModal && payTargetSnap && (
          <div className="modal-backdrop payment-modal-backdrop">
            <div className="payment-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Mark Salary as Paid
                </h3>
                <button type="button" onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Employee & Amount</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginTop: '2px', wordBreak: 'break-word' }}>
                  {payTargetSnap.employee_name}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534', marginTop: '4px', wordBreak: 'break-all' }}>
                  Paid Amount: {formatCurrency(payTargetSnap.net_payable, payTargetSnap.currency || currency)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  (Full Net Payable disbursement)
                </div>
              </div>

              {payError && (
                <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', marginBottom: '12px' }}>
                  {payError}
                </div>
              )}

              <form onSubmit={handleSinglePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Method *
                  </label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR123456789 or Cheque #0012"
                    className="form-input"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Optional disbursement notes..."
                    className="form-input"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="modal-btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)} disabled={paySubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={paySubmitting} style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}>
                    {paySubmitting ? 'Recording Payment...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: BULK MARK AS PAID                                               */}
        {/* ========================================================================= */}
        {showBulkPayModal && (
          <div className="modal-backdrop payment-modal-backdrop">
            <div className="payment-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Bulk Mark Salaries as Paid
                </h3>
                <button type="button" onClick={() => setShowBulkPayModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '700' }}>
                  Bulk Disbursement: {currentMonthName} {selectedYear}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '4px', lineHeight: '1.35' }}>
                  Marking <strong>{paymentSummary.unpaid_employee_count} unpaid employees</strong> ({formatCurrency(paymentSummary.total_unpaid_amount, currency)}) as Paid.
                </div>
              </div>

              {payError && (
                <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', marginBottom: '12px' }}>
                  {payError}
                </div>
              )}

              <form onSubmit={handleBulkPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Method *
                  </label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Batch Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-SALARY-2026-08"
                    className="form-input"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Bulk payment notes..."
                    className="form-input"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="modal-btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBulkPayModal(false)} disabled={paySubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={paySubmitting} style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}>
                    {paySubmitting ? 'Recording Bulk Payment...' : 'Confirm Bulk Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: VIEW & VOID PAYMENT                                              */}
        {/* ========================================================================= */}
        {showViewPaymentModal && viewPaymentTarget && (
          <div className="modal-backdrop payment-modal-backdrop">
            <div className="payment-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Salary Payment Details
                </h3>
                <button type="button" onClick={() => setShowViewPaymentModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>✕</button>
              </div>

              <div className="modal-detail-grid">
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Paid Amount</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#166534', wordBreak: 'break-all' }}>
                    {formatCurrency(viewPaymentTarget.paid_amount || viewPaymentTarget.net_payable, currency)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Payment Date</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>
                    {viewPaymentTarget.paid_at || '—'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Payment Method</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#0f172a' }}>
                    {viewPaymentTarget.payment_method_display || viewPaymentTarget.payment_method || 'BankTransfer'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Reference</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#0f172a', wordBreak: 'break-word' }}>
                    {viewPaymentTarget.transaction_reference || '—'}
                  </span>
                </div>
                <div className="modal-detail-full">
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Recorded By</span>
                  <span style={{ fontSize: '0.84rem', color: '#334155' }}>
                    {viewPaymentTarget.recorded_by_name || 'System Admin'}
                  </span>
                </div>
                {viewPaymentTarget.notes && (
                  <div className="modal-detail-full">
                    <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Notes</span>
                    <span style={{ fontSize: '0.84rem', color: '#334155', wordBreak: 'break-word' }}>{viewPaymentTarget.notes}</span>
                  </div>
                )}
              </div>

              {/* Void Form */}
              {canProcess && (
                <form onSubmit={handleVoidPaymentSubmit} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: '700', color: '#b91c1c' }}>
                    Void Salary Payment Record
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.35' }}>
                    Voiding this payment will return the employee record to <strong>Unpaid</strong> state.
                  </p>

                  {voidError && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.82rem', marginBottom: '10px' }}>
                      {voidError}
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Reason for Voiding * (min 5 characters)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      placeholder="Specify mandatory reason..."
                      className="form-input"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div className="modal-btn-row">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewPaymentModal(false)} disabled={voidSubmitting}>
                      Close
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={voidSubmitting} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
                      {voidSubmitting ? 'Voiding Payment...' : 'Confirm Void Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RESPONSIVE CSS STYLES (DOWN TO 320PX)                                     */}
        {/* ========================================================================= */}
        <style jsx>{`
          .payments-page-container {
            width: 100%;
            max-width: 1400px;
            margin: 0 auto;
            padding-bottom: 60px;
            box-sizing: border-box;
            overflow-x: hidden;
          }

          .payments-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 14px;
          }
          .payments-header-text {
            flex: 1;
            min-width: 200px;
          }
          .payments-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          .payments-subtitle {
            margin: 4px 0 0 0;
            color: #64748b;
            font-size: 0.88rem;
            line-height: 1.4;
          }
          .payments-header-actions {
            display: flex;
            gap: 10px;
          }
          .back-to-payroll-btn {
            font-size: 0.85rem;
            padding: 8px 14px;
            display: inline-flex;
            align-items: center;
            font-weight: 600;
          }

          .payments-info-banner {
            padding: 10px 14px;
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            color: #1e40af;
            font-size: 0.84rem;
            font-weight: 600;
            margin-bottom: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
            line-height: 1.4;
          }

          .payments-card {
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 20px 24px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            box-sizing: border-box;
            width: 100%;
          }

          .payments-empty-state {
            text-align: center;
            padding: 32px 16px;
            background-color: #f8fafc;
            border-radius: 10px;
            border: 1px dashed #cbd5e1;
            box-sizing: border-box;
          }
          .payments-empty-state-title {
            margin: 0 0 8px;
            font-size: 0.95rem;
            color: #334155;
            font-weight: 700;
          }
          .payments-empty-state-desc {
            margin: 0 0 16px;
            font-size: 0.82rem;
            color: #64748b;
          }
          .payments-empty-state-warning {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
          }
          .payments-empty-warning-title {
            margin: 0 0 6px;
            font-size: 0.95rem;
            color: #92400e;
            font-weight: 700;
          }
          .payments-empty-warning-desc {
            margin: 0 0 16px;
            font-size: 0.82rem;
            color: #78350f;
          }
          .payments-empty-state-success {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
          }
          .payments-empty-success-title {
            margin: 0 0 4px;
            font-size: 0.95rem;
            font-weight: 700;
            color: #166534;
          }
          .payments-empty-success-desc {
            margin: 0;
            font-size: 0.82rem;
            color: #15803d;
          }

          /* Schedule Card */
          .schedule-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .schedule-title-wrap {
            flex: 1;
            min-width: 180px;
          }
          .schedule-heading-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .schedule-heading {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 700;
            color: #0f172a;
          }
          .schedule-freq-badge {
            background-color: #f1f5f9;
            color: #334155;
            font-size: 0.72rem;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
          }
          .schedule-subheading {
            margin: 3px 0 0;
            font-size: 0.8rem;
            color: #64748b;
            line-height: 1.35;
          }
          .schedule-edit-btn {
            font-size: 0.8rem;
            padding: 6px 12px;
            font-weight: 600;
            flex-shrink: 0;
          }
          .schedule-success-alert {
            padding: 10px 12px;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            color: #166534;
            font-size: 0.84rem;
            margin-bottom: 14px;
          }
          .schedule-mini-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
            width: 100%;
          }
          .schedule-mini-card {
            background-color: #f8fafc;
            padding: 14px 16px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            box-sizing: border-box;
          }
          .schedule-card-lbl {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.05em;
            display: block;
          }
          .schedule-card-val {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
            word-break: break-word;
          }
          .schedule-card-sub {
            font-size: 0.73rem;
            color: #64748b;
            margin-top: 2px;
            display: block;
          }
          .schedule-run-card {
            background-color: #eff6ff;
            border-color: #bfdbfe;
          }
          .schedule-run-lbl {
            color: #1e40af;
            font-weight: 800;
          }
          .schedule-run-val {
            color: #1e3a8a;
          }
          .schedule-run-sub {
            color: #2563eb;
          }
          .schedule-pay-card {
            background-color: #f0fdf4;
            border-color: #bbf7d0;
          }
          .schedule-pay-lbl {
            color: #166534;
            font-weight: 800;
          }
          .schedule-pay-val {
            color: #14532d;
          }
          .schedule-pay-sub {
            color: #16a34a;
          }

          /* Period Selector */
          .period-controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
            flex-wrap: wrap;
            gap: 14px;
          }
          .period-month-select-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #f8fafc;
            padding: 6px 14px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            box-sizing: border-box;
          }
          .period-select-label {
            font-size: 0.78rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            flex-shrink: 0;
          }
          .period-select-inputs {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .period-native-select {
            border: none;
            background: transparent;
            font-weight: 700;
            font-size: 0.92rem;
            cursor: pointer;
            outline: none;
            color: #0f172a;
          }
          .period-actions-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .period-status-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 12px;
            border-radius: 9999px;
            font-size: 0.78rem;
            font-weight: 700;
            white-space: nowrap;
          }
          .status-finalized {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .status-draft {
            background-color: #fffbeb;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .period-bulk-btn {
            font-size: 0.84rem;
            padding: 8px 14px;
            background-color: #2563eb;
            border-color: #2563eb;
            font-weight: 600;
            white-space: nowrap;
          }

          /* Metrics Grid */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 14px;
            width: 100%;
          }
          .metric-card {
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            padding: 14px 16px;
            box-sizing: border-box;
          }
          .metric-net {
            background-color: #f8fafc;
            border-color: #e2e8f0;
          }
          .metric-card-lbl {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.05em;
            display: block;
          }
          .metric-card-val {
            font-size: 1.3rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
            word-break: break-all;
          }
          .metric-card-sub {
            font-size: 0.72rem;
            color: #64748b;
            margin-top: 2px;
            display: block;
          }
          .metric-paid {
            background-color: #f0fdf4;
            border-color: #bbf7d0;
          }
          .metric-paid-lbl {
            color: #15803d;
          }
          .metric-paid-val {
            color: #166534;
          }
          .metric-paid-sub {
            color: #15803d;
          }
          .metric-unpaid {
            background-color: #fff7ed;
            border-color: #fed7aa;
          }
          .metric-unpaid-lbl {
            color: #9a3412;
          }
          .metric-unpaid-val {
            color: #c2410c;
          }
          .metric-unpaid-sub {
            color: #9a3412;
          }

          /* Toolbar */
          .table-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .toolbar-search-box {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            max-width: 400px;
            min-width: 180px;
          }
          .toolbar-filter-box {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .toolbar-select {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 0.84rem;
          }

          /* Desktop Table */
          .desktop-table-wrapper {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .payments-data-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.86rem;
          }
          .payments-data-table thead tr {
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            color: #475569;
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .payments-data-table tbody tr {
            border-bottom: 1px solid #f1f5f9;
          }

          /* Mobile Records View */
          .mobile-records-wrapper {
            display: none;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          .mobile-payment-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            width: 100%;
          }
          .mp-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
          }
          .mp-emp-info {
            flex: 1;
            min-width: 0;
          }
          .mp-emp-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 0.92rem;
            line-height: 1.3;
            word-break: break-word;
          }
          .mp-emp-desig {
            font-size: 0.74rem;
            color: #64748b;
            margin-top: 2px;
          }
          .mp-badge-wrap {
            flex-shrink: 0;
          }
          .badge-paid {
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.74rem;
            font-weight: 700;
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            white-space: nowrap;
          }
          .badge-unpaid {
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.74rem;
            font-weight: 700;
            background-color: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
            white-space: nowrap;
          }
          .mp-amount-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
          }
          .mp-amount-lbl {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .mp-amount-val {
            font-size: 1.05rem;
            font-weight: 800;
            color: #15803d;
          }
          .mp-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 0.78rem;
          }
          .mp-detail-item {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .mp-full-col {
            grid-column: span 2;
          }
          .mp-detail-lbl {
            color: #64748b;
            font-size: 0.7rem;
            text-transform: uppercase;
            font-weight: 600;
          }
          .mp-detail-val {
            color: #1e293b;
            font-weight: 600;
            word-break: break-all;
          }
          .mp-action-wrap {
            margin-top: 2px;
          }
          .mp-action-btn {
            width: 100%;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.82rem;
            font-weight: 700;
            border-radius: 8px;
          }

          /* Modals */
          .payment-modal-backdrop {
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1060;
            padding: 16px;
            box-sizing: border-box;
          }
          .payment-modal-card {
            background-color: #ffffff;
            border-radius: 12px;
            width: 100%;
            max-width: 500px;
            padding: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            max-height: 90vh;
            overflow-y: auto;
          }
          .modal-detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background-color: #f8fafc;
            padding: 14px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            margin-bottom: 14px;
          }
          .modal-detail-full {
            grid-column: span 2;
          }
          .modal-btn-row {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 12px;
          }

          /* ========================================================================= */
          /* MOBILE BREAKPOINTS (<= 768px, <= 480px, <= 320px)                         */
          /* ========================================================================= */
          @media (max-width: 768px) {
            .desktop-table-wrapper {
              display: none;
            }
            .mobile-records-wrapper {
              display: flex;
            }
          }

          @media (max-width: 640px) {
            .payments-card {
              padding: 16px 14px;
              border-radius: 10px;
              margin-bottom: 16px;
            }
            .schedule-mini-grid {
              grid-template-columns: 1fr !important;
              gap: 10px;
            }
            .metrics-grid {
              grid-template-columns: 1fr !important;
              gap: 10px;
            }
            .period-controls-row {
              flex-direction: column;
              align-items: stretch;
              gap: 12px;
            }
            .period-month-select-box {
              width: 100%;
              justify-content: space-between;
            }
            .period-actions-wrap {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
            }
            .period-status-badge {
              width: 100%;
              justify-content: center;
              box-sizing: border-box;
              text-align: center;
              padding: 6px 10px;
            }
            .period-bulk-btn {
              width: 100%;
              justify-content: center;
            }
            .table-toolbar {
              flex-direction: column;
              align-items: stretch;
              gap: 10px;
            }
            .toolbar-search-box {
              max-width: 100%;
              width: 100%;
            }
            .toolbar-filter-box {
              width: 100%;
            }
            .toolbar-select {
              width: 100%;
            }
          }

          @media (max-width: 480px) {
            .payments-page-container {
              padding: 10px 8px !important;
            }
            .payments-header {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
              margin-bottom: 12px;
            }
            .payments-title {
              font-size: 1.15rem !important;
            }
            /* Omit verbose captions on mobile as requested */
            .payments-subtitle,
            .schedule-subheading,
            .schedule-card-sub,
            .metric-card-sub {
              display: none !important;
            }
            .payments-header-actions {
              width: 100%;
            }
            .back-to-payroll-btn {
              width: 100%;
              justify-content: center;
              text-align: center;
              height: 36px;
            }
            .payments-info-banner {
              padding: 8px 10px !important;
              font-size: 0.78rem !important;
              margin-bottom: 12px !important;
            }
            .payments-card {
              padding: 12px 10px !important;
              margin-bottom: 12px !important;
            }
            .schedule-card-header {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
              margin-bottom: 12px;
            }
            .schedule-heading {
              font-size: 0.96rem !important;
            }
            .schedule-edit-btn {
              width: 100%;
              justify-content: center;
              height: 34px;
            }
            .schedule-mini-grid {
              grid-template-columns: 1fr !important;
              gap: 8px !important;
            }
            .metrics-grid {
              grid-template-columns: 1fr !important;
              gap: 8px !important;
            }
            .metric-card {
              padding: 10px 12px !important;
            }
            .metric-card-val {
              font-size: 1.15rem !important;
            }
            .period-month-select-box {
              flex-direction: row !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 6px !important;
              padding: 6px 10px !important;
              box-sizing: border-box !important;
            }
            .period-select-inputs {
              width: auto !important;
              flex: 1 !important;
              display: flex !important;
              gap: 6px !important;
              min-width: 0 !important;
            }
            .period-native-select {
              flex: 1 !important;
              min-width: 0 !important;
              height: 32px !important;
              font-size: 0.8rem !important;
              padding: 0 4px !important;
            }
            .table-toolbar {
              gap: 8px !important;
              margin-bottom: 12px !important;
            }
            .toolbar-select {
              height: 36px !important;
              font-size: 0.82rem !important;
            }
            .payments-empty-state {
              padding: 22px 12px !important;
            }
            .payments-empty-state-title,
            .payments-empty-warning-title,
            .payments-empty-success-title {
              font-size: 0.88rem !important;
            }
            .payments-empty-state-desc,
            .payments-empty-warning-desc,
            .payments-empty-success-desc {
              font-size: 0.78rem !important;
            }
            .payment-modal-backdrop {
              padding: 8px;
              align-items: flex-end;
            }
            .payment-modal-card {
              padding: 16px 12px;
              border-radius: 12px 12px 0 0;
              max-height: 92vh;
            }
            .modal-detail-grid {
              grid-template-columns: 1fr;
              gap: 8px;
              padding: 12px;
            }
            .modal-btn-row {
              flex-direction: column-reverse;
              gap: 8px;
              width: 100%;
            }
            .modal-btn-row button,
            .modal-btn-row .btn {
              width: 100%;
              justify-content: center;
              height: 38px;
            }
          }

          /* Small Mobile (<= 360px - 300px base) */
          @media (max-width: 360px) {
            .payments-page-container {
              padding: 6px 4px !important;
            }
            .payments-card {
              padding: 10px 8px !important;
              border-radius: 8px;
            }
            .payments-title {
              font-size: 1.05rem !important;
            }
            .schedule-heading {
              font-size: 0.9rem !important;
            }
            .schedule-mini-card {
              padding: 8px 10px !important;
            }
            .schedule-card-val {
              font-size: 1rem !important;
            }
            .metric-card {
              padding: 8px 10px !important;
            }
            .metric-card-val {
              font-size: 1.05rem !important;
            }
            .mobile-payment-card {
              padding: 10px 8px !important;
              gap: 6px !important;
            }
            .mp-amount-box {
              padding: 6px 8px !important;
            }
            .mp-amount-val {
              font-size: 0.95rem !important;
            }
            .mp-details-grid {
              grid-template-columns: 1fr;
              gap: 6px;
            }
            .mp-full-col {
              grid-column: span 1;
            }
            .payments-empty-state {
              padding: 18px 8px !important;
            }
          }

          /* ---------------------------------------------------- */
          /* Dark Mode Theming                                    */
          /* ---------------------------------------------------- */
          :global(:root.dark) .payments-card {
            background-color: var(--bg-card, #1e293b) !important;
            border-color: var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payments-title,
          :global(:root.dark) .schedule-heading {
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payments-subtitle,
          :global(:root.dark) .schedule-subheading {
            color: var(--text-muted, #94a3b8) !important;
          }

          /* Info Banner in Dark Mode */
          :global(:root.dark) .payments-info-banner {
            background-color: rgba(30, 58, 138, 0.2) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
            color: #93c5fd !important;
          }

          :global(:root.dark) .schedule-freq-badge {
            background-color: rgba(255, 255, 255, 0.08) !important;
            color: #cbd5e1 !important;
          }

          :global(:root.dark) .schedule-mini-card {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .schedule-card-lbl {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .schedule-card-val {
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .schedule-card-sub {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .schedule-run-card {
            background-color: rgba(37, 99, 235, 0.15) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
          }

          :global(:root.dark) .schedule-run-lbl {
            color: #60a5fa !important;
          }

          :global(:root.dark) .schedule-run-val {
            color: #93c5fd !important;
          }

          :global(:root.dark) .schedule-run-sub {
            color: #60a5fa !important;
          }

          :global(:root.dark) .schedule-pay-card {
            background-color: rgba(22, 163, 74, 0.15) !important;
            border-color: rgba(74, 222, 128, 0.3) !important;
          }

          :global(:root.dark) .schedule-pay-lbl {
            color: #4ade80 !important;
          }

          :global(:root.dark) .schedule-pay-val {
            color: #86efac !important;
          }

          :global(:root.dark) .schedule-pay-sub {
            color: #4ade80 !important;
          }

          /* Dark Mode Metric Cards */
          :global(:root.dark) .metric-net {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .metric-net .metric-card-lbl {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .metric-net .metric-card-val {
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .metric-paid {
            background-color: rgba(22, 163, 74, 0.15) !important;
            border-color: rgba(74, 222, 128, 0.3) !important;
          }

          :global(:root.dark) .metric-paid-lbl {
            color: #4ade80 !important;
          }

          :global(:root.dark) .metric-paid-val {
            color: #4ade80 !important;
          }

          :global(:root.dark) .metric-paid-sub {
            color: #86efac !important;
          }

          :global(:root.dark) .metric-unpaid {
            background-color: rgba(234, 88, 12, 0.15) !important;
            border-color: rgba(249, 115, 22, 0.3) !important;
          }

          :global(:root.dark) .metric-unpaid-lbl {
            color: #fb923c !important;
          }

          :global(:root.dark) .metric-unpaid-val {
            color: #fb923c !important;
          }

          :global(:root.dark) .metric-unpaid-sub {
            color: #fdba74 !important;
          }

          /* Dark Mode Period Selectors & Status */
          :global(:root.dark) .period-month-select-box {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .period-select-label {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .period-native-select {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .status-finalized {
            background-color: rgba(22, 163, 74, 0.2) !important;
            color: #4ade80 !important;
            border-color: rgba(74, 222, 128, 0.35) !important;
          }

          :global(:root.dark) .status-draft {
            background-color: rgba(217, 119, 6, 0.2) !important;
            color: #fbbf24 !important;
            border-color: rgba(251, 191, 36, 0.35) !important;
          }

          /* Dark Mode Empty States (Eliminating White Rectangles) */
          :global(:root.dark) .payments-empty-state {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payments-empty-state-title {
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payments-empty-state-desc {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .payments-empty-state-warning {
            background-color: rgba(217, 119, 6, 0.15) !important;
            border-color: rgba(251, 191, 36, 0.35) !important;
          }

          :global(:root.dark) .payments-empty-warning-title {
            color: #fbbf24 !important;
          }

          :global(:root.dark) .payments-empty-warning-desc {
            color: #cbd5e1 !important;
          }

          :global(:root.dark) .payments-empty-state-success {
            background-color: rgba(22, 163, 74, 0.15) !important;
            border-color: rgba(74, 222, 128, 0.35) !important;
            color: #4ade80 !important;
          }

          :global(:root.dark) .payments-empty-success-title {
            color: #4ade80 !important;
          }

          :global(:root.dark) .payments-empty-success-desc {
            color: #86efac !important;
          }

          /* Dark Mode Toolbar & Table */
          :global(:root.dark) .toolbar-select,
          :global(:root.dark) .toolbar-search-box input {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payments-data-table thead tr {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-bottom-color: var(--border, #334155) !important;
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .payments-data-table tbody tr {
            border-bottom-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .payments-data-table tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.03) !important;
          }

          /* Dark Mode Mobile Cards */
          :global(:root.dark) .mobile-payment-card {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .badge-paid {
            background-color: rgba(22, 163, 74, 0.2) !important;
            color: #4ade80 !important;
            border-color: rgba(74, 222, 128, 0.35) !important;
          }

          :global(:root.dark) .badge-unpaid {
            background-color: rgba(217, 119, 6, 0.2) !important;
            color: #fbbf24 !important;
            border-color: rgba(251, 191, 36, 0.35) !important;
          }

          :global(:root.dark) .mp-amount-box {
            background-color: rgba(15, 23, 42, 0.8) !important;
            border-color: var(--border, #334155) !important;
          }

          :global(:root.dark) .mp-amount-val {
            color: #4ade80 !important;
          }

          :global(:root.dark) .mp-detail-lbl {
            color: var(--text-muted, #94a3b8) !important;
          }

          :global(:root.dark) .mp-detail-val {
            color: var(--text-main, #f8fafc) !important;
          }

          /* Dark Mode Modals */
          :global(:root.dark) .payment-modal-card {
            background-color: var(--bg-card, #1e293b) !important;
            border: 1px solid var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payment-modal-card h3 {
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .payment-modal-card label {
            color: var(--text-muted, #cbd5e1) !important;
          }

          :global(:root.dark) .payment-modal-card input,
          :global(:root.dark) .payment-modal-card select,
          :global(:root.dark) .payment-modal-card textarea {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
            color: var(--text-main, #f8fafc) !important;
          }

          :global(:root.dark) .modal-detail-grid {
            background-color: var(--bg-card-nested, #0f172a) !important;
            border-color: var(--border, #334155) !important;
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}

export default function PayrollPaymentsPage() {
  return (
    <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Payroll Payments...</div>}>
      <PayrollPaymentsContent />
    </React.Suspense>
  );
}
