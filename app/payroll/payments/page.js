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
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Header Title & Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
              Payroll Payments
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Review finalized payroll and record when employee salaries are actually paid.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/payroll" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
              ← Back to Monthly Payroll
            </Link>
          </div>
        </div>

        {/* Short Explanatory Sentence */}
        <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span>Finalize payroll first, then record when employee salaries are actually paid.</span>
        </div>

        {/* ========================================================================= */}
        {/* 1. ORGANIZATION PAYROLL SCHEDULE CARD                                     */}
        {/* ========================================================================= */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  Organization Payroll Schedule
                </h3>
                <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  Frequency: Monthly
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Planned processing and salary disbursement target days.
              </p>
            </div>

            {canManageSchedule && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleOpenEditSchedule}
                style={{ fontSize: '0.8rem', padding: '6px 14px', fontWeight: '600' }}
              >
                ⚙️ Edit Schedule
              </button>
            )}
          </div>

          {scheduleSuccessMsg && (
            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.84rem', marginBottom: '16px' }}>
              {scheduleSuccessMsg}
            </div>
          )}

          {/* Compact Schedule Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            
            {/* Processing Day */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                Payroll Processing Day
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                Day {procDay} of month
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Planned HR calculation date
              </span>
            </div>

            {/* Salary Payment Day */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                Salary Payment Day
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                Day {payDay} of month
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Planned salary disbursement date
              </span>
            </div>

            {/* Next Payroll Run */}
            <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', padding: '14px 16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.05em' }}>
                Next Payroll Run
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a', marginTop: '4px' }}>
                {formatDateFormatted(nextPayrollRunDate)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#2563eb' }}>
                Target: Day {procDay}
              </span>
            </div>

            {/* Next Salary Payment */}
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', padding: '14px 16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em' }}>
                Next Salary Payment
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#14532d', marginTop: '4px' }}>
                {formatDateFormatted(nextSalaryPaymentDate)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#16a34a' }}>
                Target: Day {payDay}
              </span>
            </div>

          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>✕</button>
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PERIOD SELECTOR & SUMMARY METRICS                                      */}
        {/* ========================================================================= */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* Month & Year Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Payroll Month:
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', outline: 'none' }}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', outline: 'none' }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Status Badge & Bulk Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '700',
                backgroundColor: isPayrollFinalized ? '#ecfdf5' : '#fffbeb',
                color: isPayrollFinalized ? '#065f46' : '#92400e',
                border: `1px solid ${isPayrollFinalized ? '#a7f3d0' : '#fde68a'}`
              }}>
                {pPeriod ? `Status: ${pPeriod.status}` : 'Status: Draft / Uncalculated'}
              </span>

              {canProcess && isPayrollFinalized && paymentSummary.unpaid_employee_count > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenBulkPayModal}
                  style={{ fontSize: '0.85rem', padding: '8px 16px', backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                >
                  ✓ Mark All Unpaid as Paid
                </button>
              )}
            </div>

          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            
            {/* Total Net Payable */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                Total Net Payable
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(pPeriod?.total_net_payable || 0, currency)}
              </div>
              <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                {pPeriod?.total_employees || 0} employees in period
              </span>
            </div>

            {/* Total Paid */}
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', padding: '14px 16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                Total Paid
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                {formatCurrency(paymentSummary.total_paid_amount || 0, currency)}
              </div>
              <span style={{ fontSize: '0.73rem', color: '#15803d' }}>
                {paymentSummary.paid_employee_count || 0} employees paid
              </span>
            </div>

            {/* Total Unpaid */}
            <div style={{ backgroundColor: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa', padding: '14px 16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#9a3412', letterSpacing: '0.05em' }}>
                Total Unpaid
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#c2410c', marginTop: '4px' }}>
                {formatCurrency(paymentSummary.total_unpaid_amount || 0, currency)}
              </div>
              <span style={{ fontSize: '0.73rem', color: '#9a3412' }}>
                {paymentSummary.unpaid_employee_count || 0} employees pending
              </span>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FINALIZED EMPLOYEE PAYMENT TABLE                                      */}
        {/* ========================================================================= */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search employee name or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }}>
                  <SearchIcon size={14} />
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="UNPAID">Unpaid Only</option>
                <option value="PAID">Paid Only</option>
              </select>
            </div>
          </div>

          {/* Table Area */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#0284c7', fontWeight: '600' }}>
              Loading payroll payment records...
            </div>
          ) : !pPeriod ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: '0 0 10px', fontSize: '1rem', color: '#475569', fontWeight: '600' }}>
                No payroll calculations found for {currentMonthName} {selectedYear}.
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Please run and finalize payroll on the Monthly Payroll page before recording payments.
              </p>
              <Link href={`/payroll?year=${selectedYear}&month=${selectedMonth}`} className="btn btn-primary btn-sm">
                Go to Monthly Payroll →
              </Link>
            </div>
          ) : !isPayrollFinalized ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 8px', fontSize: '1rem', color: '#92400e', fontWeight: '700' }}>
                Payroll for {currentMonthName} {selectedYear} is currently {pPeriod.status}.
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#78350f' }}>
                Salary payments can be recorded after payroll is finalized.
              </p>
              <Link href={`/payroll?year=${selectedYear}&month=${selectedMonth}`} className="btn btn-primary btn-sm" style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
                Go to Monthly Payroll →
              </Link>
            </div>
          ) : employeeSnapshots.length > 0 && paymentSummary.unpaid_employee_count === 0 && statusFilter === 'ALL' && !searchQuery ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534' }}>
              <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: '700' }}>
                ✓ All salaries for {currentMonthName} {selectedYear} have been recorded as paid.
              </p>
              <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#15803d' }}>
                Total disbursed: {formatCurrency(paymentSummary.total_paid_amount, currency)} across {paymentSummary.paid_employee_count} employees.
              </p>
            </div>
          ) : filteredSnapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No employee payment records match the selected search or filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      <tr key={snap.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{snap.employee_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{snap.designation || 'Staff'}</div>
                        </td>
                        <td style={{ padding: '14px', fontWeight: '800', color: '#15803d', fontSize: '0.95rem' }}>
                          {formatCurrency(snap.net_payable, snap.currency || currency)}
                        </td>
                        <td style={{ padding: '14px' }}>
                          {isPaid ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #86efac'
                            }}>
                              ✓ Paid
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}>
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
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 0: EDIT PAYROLL SCHEDULE                                            */}
        {/* ========================================================================= */}
        {editScheduleModalOpen && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Edit Payroll Schedule
                </h3>
                <button type="button" onClick={() => setEditScheduleModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              {scheduleErrorMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {scheduleErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payroll Frequency
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Monthly"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 10px', fontSize: '0.88rem', color: '#64748b' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
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
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Planned day HR processes/finalizes payroll</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
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
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Planned organization salary payment day</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  ℹ️ Dates beyond the end of a month automatically use that month's last valid day.
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
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
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Mark Salary as Paid
                </h3>
                <button type="button" onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Employee & Amount</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {payTargetSnap.employee_name}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                  Paid Amount: {formatCurrency(payTargetSnap.net_payable, payTargetSnap.currency || currency)}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  (Full Net Payable disbursement)
                </div>
              </div>

              {payError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {payError}
                </div>
              )}

              <form onSubmit={handleSinglePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Method *
                  </label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR123456789 or Cheque #0012"
                    className="form-input"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Optional disbursement notes..."
                    className="form-input"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
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
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Bulk Mark Salaries as Paid
                </h3>
                <button type="button" onClick={() => setShowBulkPayModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '700' }}>
                  Bulk Disbursement Target: {currentMonthName} {selectedYear}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#15803d', marginTop: '4px' }}>
                  Marking <strong>{paymentSummary.unpaid_employee_count} unpaid employees</strong> ({formatCurrency(paymentSummary.total_unpaid_amount, currency)}) as Paid.
                </div>
              </div>

              {payError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {payError}
                </div>
              )}

              <form onSubmit={handleBulkPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Payment Method *
                  </label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Batch Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-SALARY-2026-08"
                    className="form-input"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Bulk payment notes..."
                    className="form-input"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
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
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Salary Payment Details
                </h3>
                <button type="button" onClick={() => setShowViewPaymentModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Paid Amount</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>
                    {formatCurrency(viewPaymentTarget.paid_amount || viewPaymentTarget.net_payable, currency)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Payment Date</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                    {viewPaymentTarget.paid_at || '—'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Payment Method</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                    {viewPaymentTarget.payment_method_display || viewPaymentTarget.payment_method || 'BankTransfer'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Reference</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                    {viewPaymentTarget.transaction_reference || '—'}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Recorded By</span>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                    {viewPaymentTarget.recorded_by_name || 'System Admin'}
                  </span>
                </div>
                {viewPaymentTarget.notes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Notes</span>
                    <span style={{ fontSize: '0.85rem', color: '#334155' }}>{viewPaymentTarget.notes}</span>
                  </div>
                )}
              </div>

              {/* Void Form */}
              {canProcess && (
                <form onSubmit={handleVoidPaymentSubmit} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: '700', color: '#b91c1c' }}>
                    Void Salary Payment Record
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
                    Voiding this payment will return the employee record to <strong>Unpaid</strong> state.
                  </p>

                  {voidError && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.82rem', marginBottom: '12px' }}>
                      {voidError}
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Reason for Voiding * (min 5 characters)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      placeholder="Specify mandatory reason for voiding payment..."
                      className="form-input"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
