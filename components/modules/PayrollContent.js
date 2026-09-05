'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import {
  SearchIcon,
  CloseIcon,
  ChevronIcon,
  DownloadIcon,
} from '@/components/Icons';
import PayslipModal from '@/components/PayslipModal';

export default function PayrollContent() {
  const { currentUser, hasPermission } = useApp();
  const searchParams = useSearchParams();

  // Date selection states (Default to previous completed month)
  const today = new Date();
  const defaultYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth();

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  // Sync URL search params if present
  useEffect(() => {
    if (!searchParams) return;
    const y = parseInt(searchParams.get('year'), 10);
    const m = parseInt(searchParams.get('month'), 10);
    if (!isNaN(y) && y >= 2020 && y <= 2035) {
      setSelectedYear(y);
    }
    if (!isNaN(m) && m >= 1 && m <= 12) {
      setSelectedMonth(m);
    }
  }, [searchParams]);

  // Data states
  const [periodSummary, setPeriodSummary] = useState(null);
  const [employeeSnapshots, setEmployeeSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [friendlyError, setFriendlyError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Employee Drawer State
  const [selectedEmployeeSnapshot, setSelectedEmployeeSnapshot] = useState(null);
  const [employeeAdjustments, setEmployeeAdjustments] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modal States
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjType, setAdjType] = useState('Earning');
  const [adjCategory, setAdjCategory] = useState('Bonus');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDesc, setAdjDesc] = useState('');
  const [adjError, setAdjError] = useState('');

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Payslip Modal & Download states
  const [selectedPayslipData, setSelectedPayslipData] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Payment Tracking Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetSnap, setPayTargetSnap] = useState(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('BankTransfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [selectedSnapIds, setSelectedSnapIds] = useState([]);

  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false);
  const [viewPaymentTarget, setViewPaymentTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidError, setVoidError] = useState('');

  const canProcess = currentUser?.isSuperAdmin || hasPermission('payroll:process') || hasPermission('payroll:manage');
  const canManage = currentUser?.isSuperAdmin || hasPermission('payroll:manage');

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(y => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(y => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // Helper to translate backend errors into user-friendly HR explanations
  const parseFriendlyError = useCallback((rawErr) => {
    if (!rawErr) return null;
    const msg = typeof rawErr === 'string' ? rawErr : (rawErr.message || JSON.stringify(rawErr));
    const lower = msg.toLowerCase();

    if (lower.includes('attendance period must be finalized') || lower.includes('attendance is not finalized')) {
      return {
        title: 'Payroll cannot be calculated yet',
        detail: `Attendance for ${currentMonthName} is still open. Please review and finalize monthly attendance before calculating payroll.`,
        actionLabel: 'Open Attendance Management',
        actionHref: `/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`
      };
    }
    if (lower.includes('cannot calculate payroll') && lower.includes('finalized')) {
      return {
        title: 'Payroll period is locked',
        detail: `Payroll for ${currentMonthName} is already Finalized. Reopen Payroll first if you need to recalculate or apply new changes.`,
        actionLabel: null,
        actionHref: null
      };
    }
    if (lower.includes('missing active salary structure') || lower.includes('no salary structure assigned')) {
      return {
        title: 'Missing Employee Salary Structure',
        detail: 'One or more employees do not have an active salary structure assigned. Assign salary packages in the Salary Directory.',
        actionLabel: 'Go to Salary Structures',
        actionHref: '/payroll/salaries'
      };
    }

    return {
      title: 'Action Error',
      detail: msg,
      actionLabel: null,
      actionHref: null
    };
  }, [currentMonthName, selectedYear, selectedMonth]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalSnapshotsCount, setTotalSnapshotsCount] = useState(0);

  // Debounce search query changes by 250ms and reset page to 1
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when month, year or statusFilter changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonth, statusFilter]);

  // Fetch Payroll Period & Snapshots
  const fetchPayrollData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setFriendlyError(null);
    try {
      const summaryRes = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/`);
      setPeriodSummary(summaryRes);

      if (summaryRes?.payroll_period) {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });
        if (debouncedSearch.trim()) {
          queryParams.set('search', debouncedSearch.trim());
        }

        const snapRes = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/employees/?${queryParams.toString()}`);
        if (snapRes && Array.isArray(snapRes.results)) {
          setEmployeeSnapshots(snapRes.results);
          setTotalSnapshotsCount(snapRes.count || 0);
        } else if (Array.isArray(snapRes)) {
          setEmployeeSnapshots(snapRes);
          setTotalSnapshotsCount(snapRes.length);
        } else {
          setEmployeeSnapshots([]);
          setTotalSnapshotsCount(0);
        }
      } else {
        setEmployeeSnapshots([]);
        setTotalSnapshotsCount(0);
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setErrorMsg(err.message || 'Failed to load payroll details for this period.');
      setFriendlyError(parseFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, page, pageSize, debouncedSearch, parseFriendlyError]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Calculate / Recalculate Payroll
  const handleCalculatePayroll = async () => {
    if (!canProcess) return;
    setActionLoading(true);
    setErrorMsg('');
    setFriendlyError(null);
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/calculate/`, {
        method: 'POST'
      });
      setSuccessMsg(`Payroll for ${currentMonthName} calculated successfully (Revision ${res.current_revision}).`);
      await fetchPayrollData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Calculation failed:', err);
      setErrorMsg(err.message || 'Failed to calculate payroll.');
      setFriendlyError(parseFriendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize Payroll
  const handleFinalizePayroll = async () => {
    if (!canManage) return;
    if (!window.confirm(`Are you sure you want to finalize and lock payroll for ${currentMonthName}? This will prevent further edits until reopened.`)) {
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setFriendlyError(null);
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/finalize/`, {
        method: 'POST'
      });
      setSuccessMsg(`Payroll for ${currentMonthName} has been finalized and locked.`);
      await fetchPayrollData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Finalization failed:', err);
      setErrorMsg(err.message || 'Failed to finalize payroll.');
      setFriendlyError(parseFriendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Reopen Payroll
  const handleReopenPayroll = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      setReopenError('A valid justification reason (at least 5 characters) is required.');
      return;
    }

    setActionLoading(true);
    setReopenError('');
    try {
      await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/reopen/`, {
        method: 'POST',
        body: JSON.stringify({ reason: reopenReason.trim() })
      });
      setShowReopenModal(false);
      setReopenReason('');
      setSuccessMsg(`Payroll period ${currentMonthName} reopened. Attendance modifications and recalculations are now unlocked.`);
      await fetchPayrollData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Reopen failed:', err);
      setReopenError(err.message || 'Failed to reopen payroll period.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Employee Breakdown Drawer
  const handleOpenDrawer = async (snapshot) => {
    setSelectedEmployeeSnapshot(snapshot);
    setDrawerLoading(true);
    try {
      const res = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/employees/${snapshot.employee}/`);
      setSelectedEmployeeSnapshot(res.snapshot);
      setEmployeeAdjustments(res.adjustments || []);
    } catch (err) {
      console.error('Failed to load employee snapshot detail:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Add Adjustment
  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    setAdjError('');

    const amt = parseFloat(adjAmount);
    if (isNaN(amt) || amt <= 0) {
      setAdjError('Amount must be a valid positive number.');
      return;
    }
    if (!adjDesc.trim()) {
      setAdjError('Description is required.');
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/adjustments/`, {
        method: 'POST',
        body: JSON.stringify({
          employee: adjEmployeeId,
          adjustment_type: adjType,
          category: adjCategory,
          amount: amt.toFixed(2),
          description: adjDesc.trim()
        })
      });
      setShowAdjustmentModal(false);
      setAdjAmount('');
      setAdjDesc('');
      setSuccessMsg('Adjustment added. Please recalculate payroll to apply changes.');
      await fetchPayrollData();
      if (selectedEmployeeSnapshot && String(selectedEmployeeSnapshot.employee) === String(adjEmployeeId)) {
        handleOpenDrawer(selectedEmployeeSnapshot);
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to create adjustment:', err);
      setAdjError(err.message || 'Failed to create adjustment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Adjustment
  const handleDeleteAdjustment = async (adjustmentId) => {
    if (!window.confirm('Remove this payroll adjustment?')) return;
    setActionLoading(true);
    try {
      await apiFetch(`/payroll/adjustments/${adjustmentId}/`, { method: 'DELETE' });
      setSuccessMsg('Adjustment removed. Please recalculate payroll to refresh totals.');
      if (selectedEmployeeSnapshot) {
        handleOpenDrawer(selectedEmployeeSnapshot);
      }
      await fetchPayrollData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to delete adjustment:', err);
      setErrorMsg(err.message || 'Failed to delete adjustment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Payslip Preview Modal
  const handleOpenPayslipModal = async (snap) => {
    setActionLoading(true);
    try {
      if (snap?.payslip_id) {
        const detail = await apiFetch(`/payroll/payslips/${snap.payslip_id}/`);
        setSelectedPayslipData(detail);
        setShowPayslipModal(true);
      } else {
        const res = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/payslips/`);
        const ps = (Array.isArray(res) ? res : []).find(p => p.employee === snap.employee);
        if (ps) {
          const detail = await apiFetch(`/payroll/payslips/${ps.id}/`);
          setSelectedPayslipData(detail);
          setShowPayslipModal(true);
        } else {
          setErrorMsg('No issued payslip found for this employee.');
        }
      }
    } catch (err) {
      console.error('Failed to load payslip:', err);
      setErrorMsg('Failed to load payslip details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Download PDF
  const handleDownloadAdminPdf = async (payslip) => {
    const psId = payslip?.id || payslip?.payslip_id;
    if (!psId) return;
    try {
      setDownloadingPdfId(psId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`/api/payroll/payslips/${psId}/pdf/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${payslip.payslip_number || psId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg('Failed to download PDF payslip.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Bulk ZIP Export of All Issued Payslips
  const handleExportZip = async () => {
    if (isExportingZip) return;
    setIsExportingZip(true);
    setErrorMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`/api/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: 'Failed to export payslips ZIP.' };
        }
        throw new Error(errData.detail || 'Failed to export payslips ZIP.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const padMonth = selectedMonth.toString().padStart(2, '0');
      a.download = `Payslips_${selectedYear}_${padMonth}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMsg(`Successfully exported Payslips_${selectedYear}_${padMonth}.zip`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('ZIP Export error:', err);
      setErrorMsg(err.message || 'Failed to export payslips ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Payment Tracking Handlers
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
      fetchPayrollData();
    } catch (err) {
      setPayError(err.message || 'Failed to record salary payment.');
    } finally {
      setPaySubmitting(false);
    }
  };

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
          snapshot_ids: selectedSnapIds.length > 0 ? selectedSnapIds : [],
          paid_at: payDate,
          payment_method: payMethod,
          transaction_reference: payRef,
          notes: payNotes,
        }),
      });
      setSuccessMsg(res.message || 'Successfully recorded bulk salary payments.');
      setShowBulkPayModal(false);
      setSelectedSnapIds([]);
      fetchPayrollData();
    } catch (err) {
      setPayError(err.message || 'Failed to record bulk salary payments.');
    } finally {
      setPaySubmitting(false);
    }
  };

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
      fetchPayrollData();
    } catch (err) {
      setVoidError(err.message || 'Failed to void salary payment.');
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Derived Values
  const pPeriod = periodSummary?.payroll_period;
  const isAttendanceFinalized = periodSummary?.attendance_finalized || false;
  const isPayrollFinalized = pPeriod?.status === 'Finalized';
  const isPayrollCalculated = pPeriod?.status === 'Calculated';
  const isStale = periodSummary?.is_stale || false;
  const staleReasons = periodSummary?.stale_reasons || [];
  const currency = pPeriod?.currency || 'INR';

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    return employeeSnapshots.filter(snap => {
      const matchSearch = !searchQuery ||
        snap.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snap.designation?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || snap.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employeeSnapshots, searchQuery, statusFilter]);

  const hasNegativeNet = employeeSnapshots.some(s => s.status === 'NegativeNet');
  const hasMissingSalary = employeeSnapshots.some(s => s.status === 'MissingSalaryStructure');
  const canFinalize = isPayrollCalculated && !isStale && !hasNegativeNet && !hasMissingSalary && isAttendanceFinalized;

  const formatMoney = (val, rowCurrency = null, options = {}) => {
    return formatCurrency(val, rowCurrency || currency, options);
  };

  return (
    <div className="payroll-content-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Header & Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main, #0f172a)' }}>
            Monthly Payroll Processing
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
            Deterministic gross-to-net payroll engine powered by finalized monthly attendance snapshots.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <button
            onClick={handlePrevMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', borderRadius: '6px' }}
            title="Previous Month"
          >
            ‹
          </button>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', outline: 'none' }}
            >
              {monthNames.map((m, idx) => (
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

          <button
            onClick={handleNextMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', borderRadius: '6px' }}
            title="Next Month"
          >
            ›
          </button>
        </div>
      </div>

      {/* Messages */}
      {friendlyError && (
        <div style={{ padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>⚠️</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#991b1b' }}>
                {friendlyError.title}
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                {friendlyError.detail}
              </p>
              {friendlyError.actionHref && (
                <div style={{ marginTop: '8px' }}>
                  <Link
                    href={friendlyError.actionHref}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.8rem', padding: '4px 12px', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  >
                    {friendlyError.actionLabel} →
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFriendlyError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && !friendlyError && (
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
      {/* 1. PAYROLL WORKFLOW STEPPER                                               */}
      {/* ========================================================================= */}
      <div
        className="payroll-workflow-stepper"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
            Monthly Payroll Lifecycle • {currentMonthName}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {isPayrollFinalized
              ? '✓ Period Complete'
              : (isPayrollCalculated ? '● Review & Finalize in progress' : (isAttendanceFinalized ? '● Ready for calculation' : '⚠ Attendance pending finalization'))}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Step 1: Attendance */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isAttendanceFinalized ? '#bbf7d0' : '#fde68a'}`,
            backgroundColor: isAttendanceFinalized ? '#f0fdf4' : '#fffbeb',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isAttendanceFinalized ? '#166534' : '#92400e' }}>
                Step 1: Attendance
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isAttendanceFinalized ? '#16a34a' : '#d97706' }}>
                {isAttendanceFinalized ? '✓ Finalized' : '⚠ Action Req'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isAttendanceFinalized ? '#166534' : '#92400e' }}>
              {isAttendanceFinalized ? `Rev ${periodSummary?.attendance_revision || 1} Locked` : 'Needs Finalization'}
            </div>
          </div>

          {/* Step 2: Calculate Payroll */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollCalculated || isPayrollFinalized ? '#bbf7d0' : (isAttendanceFinalized ? '#bfdbfe' : '#e2e8f0')}`,
            backgroundColor: isPayrollCalculated || isPayrollFinalized ? '#f0fdf4' : (isAttendanceFinalized ? '#eff6ff' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollCalculated || isPayrollFinalized ? '#166534' : (isAttendanceFinalized ? '#1e40af' : '#64748b') }}>
                Step 2: Calculation
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isPayrollCalculated || isPayrollFinalized ? '#16a34a' : (isAttendanceFinalized ? '#2563eb' : '#94a3b8') }}>
                {isPayrollCalculated || isPayrollFinalized ? '✓ Calculated' : (isAttendanceFinalized ? '● Ready' : '○ Pending')}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollCalculated || isPayrollFinalized ? '#166534' : (isAttendanceFinalized ? '#1e40af' : '#64748b') }}>
              {pPeriod ? `Rev ${pPeriod.current_revision}` : 'Gross-to-Net'}
            </div>
          </div>

          {/* Step 3: Review & Adjust */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : (isPayrollCalculated ? '#fed7aa' : '#e2e8f0')}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : (isPayrollCalculated ? '#fff7ed' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : (isPayrollCalculated ? '#9a3412' : '#64748b') }}>
                Step 3: Review & Adjust
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : (isPayrollCalculated ? '#ea580c' : '#94a3b8') }}>
                {isPayrollFinalized ? '✓ Reviewed' : (isPayrollCalculated ? '● Active' : '○ Pending')}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : (isPayrollCalculated ? '#9a3412' : '#64748b') }}>
              {isPayrollCalculated ? `${employeeSnapshots.length} Snapshots` : 'Audit Ledger'}
            </div>
          </div>

          {/* Step 4: Finalize */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : (isPayrollCalculated ? '#cbd5e1' : '#e2e8f0')}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : (isPayrollCalculated ? '#f8fafc' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
                Step 4: Finalize
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : (canFinalize ? '#2563eb' : '#94a3b8') }}>
                {isPayrollFinalized ? '✓ Finalized' : (canFinalize ? '● Ready' : '○ Locked')}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
              {isPayrollFinalized ? 'Audit Locked' : 'Prevent Edits'}
            </div>
          </div>

          {/* Step 5: Disbursement */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#bbf7d0' : '#fed7aa') : '#e2e8f0'}`,
            backgroundColor: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#f0fdf4' : '#fff7ed') : '#f8fafc',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#166534' : '#9a3412') : '#64748b' }}>
                Step 5: Disbursement
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#16a34a' : '#ea580c') : '#94a3b8' }}>
                {isPayrollFinalized
                  ? (periodSummary?.payment_summary?.unpaid_employee_count === 0
                      ? '✓ Paid'
                      : (periodSummary?.payment_summary?.paid_employee_count > 0 ? `● ${periodSummary?.payment_summary?.paid_employee_count}/${pPeriod?.total_employees} Paid` : '● Unpaid'))
                  : '○ Pending'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#166534' : '#9a3412') : '#64748b' }}>
              {isPayrollFinalized
                ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? 'All Disbursed' : `${periodSummary?.payment_summary?.unpaid_employee_count || 0} Pending`)
                : 'Post-Finalization'}
            </div>
          </div>

          {/* Step 5: Payslips */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : '#e2e8f0'}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : '#f8fafc',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
                Step 5: Payslips
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : '#94a3b8' }}>
                {isPayrollFinalized ? '✓ Issued' : '○ Pending'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
              {isPayrollFinalized ? 'PDF & ZIP Ready' : 'Post-Finalization'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE PREFLIGHT READINESS CARD                                    */}
      {/* ========================================================================= */}
      {!isAttendanceFinalized ? (
        <div
          className="attendance-preflight-card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>
                Attendance is not ready for payroll
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78350f' }}>
                Finalize attendance for <strong>{currentMonthName}</strong> before payroll can be calculated.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: '600', padding: '6px 14px' }}
            >
              Review Attendance →
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="attendance-preflight-card"
          style={{
            padding: '14px 20px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.3rem', color: '#16a34a' }}>✓</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#166534' }}>
                  Attendance Ready
                </h4>
                <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                  Snapshot Rev {periodSummary?.attendance_revision || 1}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#15803d' }}>
                Monthly attendance for {currentMonthName} is locked and ready for payroll calculation.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
              style={{ fontSize: '0.82rem', color: '#166534', textDecoration: 'underline', fontWeight: '600' }}
            >
              View Attendance Snapshot
            </Link>
            <span className="badge" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
              Ready for Payroll
            </span>
          </div>
        </div>
      )}

      {/* Missing Salary Structure Warning */}
      {hasMissingSalary && (
        <div style={{ padding: '12px 18px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', color: '#9a3412', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
              {employeeSnapshots.filter(s => s.status === 'MissingSalaryStructure').length} employees need compensation setup before payroll can be finalized.
            </span>
          </div>
          <Link
            href="/payroll/salaries"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8rem', padding: '5px 12px', borderColor: '#fb923c', color: '#9a3412' }}
          >
            Review Employees →
          </Link>
        </div>
      )}

      {/* Status & Action Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Attendance Source Status */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Attendance Source
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '700',
                backgroundColor: isAttendanceFinalized ? '#ecfdf5' : '#fffbeb',
                color: isAttendanceFinalized ? '#065f46' : '#92400e',
                border: `1px solid ${isAttendanceFinalized ? '#a7f3d0' : '#fde68a'}`
              }}>
                {isAttendanceFinalized ? `Finalized (Rev ${periodSummary?.attendance_revision || 1})` : 'Not Finalized'}
              </span>
              {!isAttendanceFinalized && (
                <Link
                  href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
                  style={{ fontSize: '0.8rem', color: '#0284c7', textDecoration: 'underline', fontWeight: '600' }}
                >
                  Finalize Attendance →
                </Link>
              )}
            </div>
          </div>

          <div style={{ width: '1px', height: '36px', backgroundColor: '#e2e8f0' }}></div>

          {/* Payroll Period Status */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Payroll Period Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '700',
                backgroundColor: isPayrollFinalized ? '#f1f5f9' : (isPayrollCalculated ? '#ecfeff' : '#f8fafc'),
                color: isPayrollFinalized ? '#0f172a' : (isPayrollCalculated ? '#0891b2' : '#475569'),
                border: `1px solid ${isPayrollFinalized ? '#cbd5e1' : (isPayrollCalculated ? '#a5f3fc' : '#e2e8f0')}`
              }}>
                {pPeriod ? `${pPeriod.status} (Rev ${pPeriod.current_revision})` : 'Draft / Uncalculated'}
              </span>
              {isPayrollFinalized && (
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>🔒 Hard Locked</span>
              )}
            </div>
          </div>

          {/* Stale Warning Indicator */}
          {isStale && (
            <div style={{ padding: '6px 12px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#be123c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>⚠️ Recalculation Required:</span>
              <span>{staleReasons.join(' | ')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {canProcess && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAdjEmployeeId(employeeSnapshots[0]?.employee || '');
                setShowAdjustmentModal(true);
              }}
              disabled={isPayrollFinalized || actionLoading || !pPeriod}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              + Add Adjustment
            </button>
          )}

          {canProcess && !isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCalculatePayroll}
              disabled={actionLoading || !isAttendanceFinalized}
              style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{pPeriod ? 'Recalculate Payroll' : 'Calculate Payroll'}</span>
            </button>
          )}

          {canManage && isPayrollCalculated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinalizePayroll}
              disabled={!canFinalize || actionLoading}
              style={{ fontSize: '0.85rem', padding: '8px 16px', backgroundColor: '#15803d', borderColor: '#15803d' }}
              title={!canFinalize ? 'Cannot finalize: Ensure attendance is finalized, no negative net pay, and all employees have salary structures.' : 'Finalize and Lock Payroll'}
            >
              Finalize Month
            </button>
          )}

          {isPayrollFinalized && (
            <Link
              href={`/payroll/payments?year=${selectedYear}&month=${selectedMonth}`}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px', backgroundColor: '#2563eb', borderColor: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Go to Payroll Payments →</span>
            </Link>
          )}

          {isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportZip}
              disabled={isExportingZip || actionLoading}
              style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', borderColor: '#99f6e4', background: '#f0fdfa' }}
              title="Download all issued payslips for this finalized period as a ZIP archive"
            >
              <DownloadIcon size={14} />
              <span>{isExportingZip ? 'Exporting ZIP...' : 'Export All Payslips (ZIP)'}</span>
            </button>
          )}

          {canManage && isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowReopenModal(true)}
              disabled={actionLoading || isExportingZip}
              style={{ fontSize: '0.85rem', padding: '8px 14px', color: '#b91c1c', borderColor: '#fca5a5' }}
            >
              🔓 Reopen Period
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {isPayrollFinalized && (
          <>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '18px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                Disbursed / Paid
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
                {formatMoney(periodSummary?.payment_summary?.total_paid_amount || 0)}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                {periodSummary?.payment_summary?.paid_employee_count || 0} employees paid
              </span>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fed7aa', padding: '18px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#9a3412', letterSpacing: '0.05em' }}>
                Outstanding / Unpaid
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#c2410c', marginTop: '6px' }}>
                {formatMoney(periodSummary?.payment_summary?.total_unpaid_amount || 0)}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#9a3412' }}>
                {periodSummary?.payment_summary?.unpaid_employee_count || 0} employees pending
              </span>
            </div>
          </>
        )}
        
        {/* Net Payable */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '18px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
            Total Net Payable
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
            {formatMoney(pPeriod?.total_net_payable || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
            For {pPeriod?.total_employees || 0} active employees
          </span>
        </div>

        {/* Earned Gross */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Earned Gross Salary
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {formatMoney(pPeriod?.total_earned_gross || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Base Gross: {formatMoney(pPeriod?.total_base_gross || 0)}
          </span>
        </div>

        {/* Attendance Deductions */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Attendance Deductions
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '6px' }}>
            -{formatMoney(pPeriod?.total_attendance_deductions || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            From unpaid leaves & absences
          </span>
        </div>

        {/* Base Deductions */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Base Fixed Deductions
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#475569', marginTop: '6px' }}>
            -{formatMoney(pPeriod?.total_base_deductions || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Insurance & scheduled deductions
          </span>
        </div>

        {/* Manual Adjustments */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Net Adjustments
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: parseFloat(pPeriod?.total_adjustments_net || 0) >= 0 ? '#15803d' : '#b91c1c', marginTop: '6px' }}>
            {parseFloat(pPeriod?.total_adjustments_net || 0) >= 0 ? '+' : ''}{formatMoney(pPeriod?.total_adjustments_net || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Bonuses, fines, reimbursements
          </span>
        </div>
      </div>

      {/* Main Ledger Panel */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Table Filters Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search employee by name or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }}>
                <SearchIcon size={14} />
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OK">Ready / OK</option>
              <option value="NegativeNet">Negative Net Pay</option>
              <option value="MissingSalaryStructure">Missing Salary Structure</option>
              <option value="NeedsReview">Needs Review</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#0284c7', fontWeight: '600' }}>
            Loading monthly payroll records...
          </div>
        ) : !pPeriod ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 14px 0', fontSize: '1rem', color: '#475569', fontWeight: '600' }}>
              Payroll has not been calculated for {currentMonthName} yet.
            </p>
            {isAttendanceFinalized ? (
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#166534' }}>
                  Attendance for {currentMonthName} is finalized and ready.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCalculatePayroll}
                  disabled={actionLoading}
                >
                  Calculate Payroll Now
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Please finalize attendance for {currentMonthName} first to enable payroll calculations.
                </p>
                <Link
                  href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: '600', padding: '8px 16px', display: 'inline-block' }}
                >
                  Review Attendance →
                </Link>
              </div>
            )}
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No employee payroll records match the selected filter.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Employee</th>
                  <th style={{ padding: '12px 14px' }}>Attendance (Worked / Unpaid)</th>
                  <th style={{ padding: '12px 14px' }}>Base Gross</th>
                  <th style={{ padding: '12px 14px' }}>Daily Rate</th>
                  <th style={{ padding: '12px 14px' }}>Att. Deduction</th>
                  <th style={{ padding: '12px 14px' }}>Earned Gross</th>
                  <th style={{ padding: '12px 14px' }}>Adjustments</th>
                  <th style={{ padding: '12px 14px' }}>Fixed Deductions</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>Net Payable</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  {isPayrollFinalized && <th style={{ padding: '12px 14px' }}>Payment</th>}
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSnapshots.map(snap => {
                  const hasIssue = snap.status !== 'OK';
                  const isDaily = snap.compensation_type === 'DAILY';
                  const isHourly = snap.compensation_type === 'HOURLY';
                  const isPaid = snap.payment_status === 'Paid';
                  return (
                    <tr
                      key={snap.id}
                      onClick={() => handleOpenDrawer(snap)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: hasIssue ? '#fff1f2' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{snap.employee_name}</span>
                          {isHourly ? (
                            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              Hourly
                            </span>
                          ) : isDaily ? (
                            <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              Daily
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{snap.designation || 'Staff'}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        {isHourly ? (
                          <>
                            <div><strong>{snap.payable_hours || '0.00'} hrs</strong> ({snap.working_days} working days)</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Rate: {formatMoney(snap.hourly_rate, snap.currency)}/hr
                            </div>
                          </>
                        ) : (
                          <>
                            <div><strong>{snap.payable_attendance_units}</strong> / {snap.working_days} days</div>
                            <div style={{ fontSize: '0.75rem', color: parseFloat(snap.unpaid_leave_days) > 0 ? '#b91c1c' : '#64748b' }}>
                              {parseFloat(snap.unpaid_leave_days) > 0 ? `${snap.unpaid_leave_days} unpaid days` : '0 unpaid days'}
                            </div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '600' }}>
                        {isHourly || isDaily
                          ? (parseFloat(snap.base_gross_salary) > 0 ? `${formatMoney(snap.base_gross_salary, snap.currency)} (Fixed)` : '—')
                          : formatMoney(snap.base_gross_salary, snap.currency)}
                      </td>
                      <td style={{ padding: '14px', color: isHourly ? '#92400e' : isDaily ? '#0369a1' : '#64748b', fontWeight: isHourly || isDaily ? '700' : '400' }}>
                        {isHourly
                          ? `${formatMoney(snap.hourly_rate, snap.currency)}/hr`
                          : isDaily
                          ? `${formatMoney(snap.daily_rate, snap.currency)}/day`
                          : formatMoney(snap.daily_rate, snap.currency)}
                      </td>
                      <td style={{ padding: '14px', color: parseFloat(snap.attendance_deduction) > 0 ? '#b91c1c' : '#64748b' }}>
                        {isHourly || isDaily ? '—' : (parseFloat(snap.attendance_deduction) > 0 ? `-${formatMoney(snap.attendance_deduction, snap.currency)}` : '—')}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '600' }}>
                        {formatMoney(snap.earned_gross, snap.currency)}
                      </td>
                      <td style={{ padding: '14px', color: (parseFloat(snap.additional_earnings) - parseFloat(snap.additional_deductions)) >= 0 ? '#15803d' : '#b91c1c' }}>
                        {parseFloat(snap.additional_earnings) > 0 && `+${formatMoney(snap.additional_earnings, snap.currency)} `}
                        {parseFloat(snap.additional_deductions) > 0 && `-${formatMoney(snap.additional_deductions, snap.currency)}`}
                        {parseFloat(snap.additional_earnings) === 0 && parseFloat(snap.additional_deductions) === 0 && '—'}
                      </td>
                      <td style={{ padding: '14px', color: '#64748b' }}>
                        {parseFloat(snap.base_fixed_deductions) > 0 ? `-${formatMoney(snap.base_fixed_deductions, snap.currency)}` : '—'}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '800', color: parseFloat(snap.net_payable) >= 0 ? '#15803d' : '#b91c1c', fontSize: '0.95rem' }}>
                        {formatMoney(snap.net_payable, snap.currency)}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          backgroundColor: snap.status === 'OK' ? '#ecfdf5' : '#fef2f2',
                          color: snap.status === 'OK' ? '#065f46' : '#991b1b',
                          border: `1px solid ${snap.status === 'OK' ? '#a7f3d0' : '#fecaca'}`
                        }}>
                          {snap.status}
                        </span>
                      </td>
                      {isPayrollFinalized && (
                        <td style={{ padding: '14px' }}>
                          {isPaid ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
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
                              padding: '3px 8px',
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
                      )}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isPayrollFinalized && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPayslipModal(snap);
                                }}
                                style={{ fontSize: '0.78rem', padding: '4px 8px', borderColor: '#86efac', color: '#166534', background: '#f0fdf4' }}
                                title="View Official Payslip"
                              >
                                View Payslip
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadAdminPdf(snap);
                                }}
                                style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                                title="Download PDF"
                                disabled={downloadingPdfId === (snap.payslip_id || snap.id)}
                              >
                                <DownloadIcon size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(snap);
                            }}
                            style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                          >
                            Breakdown →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
            <span>Showing {employeeSnapshots.length} of {totalSnapshotsCount} employee record{totalSnapshotsCount !== 1 ? 's' : ''} (Page {page} of {Math.max(1, Math.ceil(totalSnapshotsCount / pageSize))})</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                ‹ Previous
              </button>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{page} / {Math.max(1, Math.ceil(totalSnapshotsCount / pageSize))}</span>
              <button
                type="button"
                onClick={() => setPage(p => (page < Math.ceil(totalSnapshotsCount / pageSize) ? p + 1 : p))}
                disabled={page >= Math.ceil(totalSnapshotsCount / pageSize) || loading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                Next ›
              </button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* DETAIL BREAKDOWN DRAWER */}
      {selectedEmployeeSnapshot && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '640px', height: '100%', backgroundColor: '#ffffff', padding: '28px', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedEmployeeSnapshot.employee_name}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {selectedEmployeeSnapshot.designation || 'Staff'} • {currentMonthName} (Revision {selectedEmployeeSnapshot.revision})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeSnapshot(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Finalized Period: Payslip Action Banner */}
            {isPayrollFinalized && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534', display: 'block' }}>Official Issued Payslip</span>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>Immutable payroll document</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenPayslipModal(selectedEmployeeSnapshot)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    View Payslip
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDownloadAdminPdf(selectedEmployeeSnapshot)}
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    disabled={downloadingPdfId === (selectedEmployeeSnapshot.payslip_id || selectedEmployeeSnapshot.id)}
                  >
                    <DownloadIcon size={14} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Net Pay Highlight Card */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  Final Net Payable
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534' }}>
                  {formatMoney(selectedEmployeeSnapshot.net_payable, selectedEmployeeSnapshot.currency)}
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                backgroundColor: selectedEmployeeSnapshot.status === 'OK' ? '#dcfce7' : '#fee2e2',
                color: selectedEmployeeSnapshot.status === 'OK' ? '#15803d' : '#b91c1c'
              }}>
                Status: {selectedEmployeeSnapshot.status}
              </span>
            </div>

            {/* Calculation Breakdown Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mathematical Derivation ({selectedEmployeeSnapshot.compensation_type === 'HOURLY' ? 'Hourly Wage' : selectedEmployeeSnapshot.compensation_type === 'DAILY' ? 'Daily Wage' : 'Monthly Salary'})
              </h4>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '14px 16px', fontSize: '0.85rem' }}>
                {selectedEmployeeSnapshot.compensation_type === 'HOURLY' ? (
                  <>
                    <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '0.8rem', fontWeight: '600', marginBottom: '10px' }}>
                      Hourly Wage — Pay = Hourly Rate × Finalized Payable Hours.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Pay Basis:</span>
                      <strong style={{ color: '#92400e' }}>Hourly Wage</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Contractual Hourly Rate:</span>
                      <strong>{formatMoney(selectedEmployeeSnapshot.hourly_rate, selectedEmployeeSnapshot.currency)} / hour</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Finalized Payable Work Hours:</span>
                      <span>{selectedEmployeeSnapshot.payable_hours || '0.00'} hrs</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#92400e' }}>
                      <span>Wage Earnings ({selectedEmployeeSnapshot.payable_hours || 0} hrs × hourly rate):</span>
                      <strong>
                        {formatMoney(
                          (parseFloat(selectedEmployeeSnapshot.hourly_rate || 0) * parseFloat(selectedEmployeeSnapshot.payable_hours || 0)),
                          selectedEmployeeSnapshot.currency
                        )}
                      </strong>
                    </div>
                    {parseFloat(selectedEmployeeSnapshot.non_proratable_gross) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Fixed Monthly Allowances:</span>
                        <span>+{formatMoney(selectedEmployeeSnapshot.non_proratable_gross, selectedEmployeeSnapshot.currency)}</span>
                      </div>
                    )}
                  </>
                ) : selectedEmployeeSnapshot.compensation_type === 'DAILY' ? (
                  <>
                    <div style={{ padding: '8px 12px', backgroundColor: '#e0f2fe', borderRadius: '6px', color: '#0369a1', fontSize: '0.8rem', fontWeight: '600', marginBottom: '10px' }}>
                      Daily Wage — Pay = Daily Rate × Payable Days.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Pay Basis:</span>
                      <strong style={{ color: '#0369a1' }}>Daily Wage</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Contractual Daily Rate:</span>
                      <strong>{formatMoney(selectedEmployeeSnapshot.daily_rate, selectedEmployeeSnapshot.currency)} / day</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Finalized Payable Days:</span>
                      <span>{selectedEmployeeSnapshot.payable_attendance_units} days</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#0369a1' }}>
                      <span>Wage Earnings ({selectedEmployeeSnapshot.payable_attendance_units} × daily rate):</span>
                      <strong>
                        {formatMoney(
                          (parseFloat(selectedEmployeeSnapshot.daily_rate || 0) * parseFloat(selectedEmployeeSnapshot.payable_attendance_units || 0)),
                          selectedEmployeeSnapshot.currency
                        )}
                      </strong>
                    </div>
                    {parseFloat(selectedEmployeeSnapshot.non_proratable_gross) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Fixed Monthly Allowances:</span>
                        <span>+{formatMoney(selectedEmployeeSnapshot.non_proratable_gross, selectedEmployeeSnapshot.currency)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', color: '#475569', fontSize: '0.8rem', fontWeight: '600', marginBottom: '10px' }}>
                      Monthly Salary — Attendance affects proratable salary components (1 unpaid day × calculated daily rate = attendance deduction).
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Proratable Gross (Basic):</span>
                      <strong>{formatMoney(selectedEmployeeSnapshot.proratable_gross, selectedEmployeeSnapshot.currency)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Working Days:</span>
                      <span>{selectedEmployeeSnapshot.working_days} days</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Daily Rate (Proratable / Working Days):</span>
                      <span>{formatMoney(selectedEmployeeSnapshot.daily_rate, selectedEmployeeSnapshot.currency)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#b91c1c' }}>
                      <span>Attendance Deduction ({selectedEmployeeSnapshot.unpaid_leave_days || 0} unpaid × daily rate):</span>
                      <strong>-{formatMoney(selectedEmployeeSnapshot.attendance_deduction, selectedEmployeeSnapshot.currency)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Non-Proratable Fixed Allowances:</span>
                      <span>+{formatMoney(selectedEmployeeSnapshot.non_proratable_gross, selectedEmployeeSnapshot.currency)}</span>
                    </div>
                  </>
                )}
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' }}>
                  <span>Earned Gross:</span>
                  <span>{formatMoney(selectedEmployeeSnapshot.earned_gross, selectedEmployeeSnapshot.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b' }}>
                  <span>Base Fixed Deductions:</span>
                  <span>-{formatMoney(selectedEmployeeSnapshot.base_fixed_deductions, selectedEmployeeSnapshot.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                  <span>Manual Adjustments Net:</span>
                  <span>
                    {(parseFloat(selectedEmployeeSnapshot.additional_earnings) - parseFloat(selectedEmployeeSnapshot.additional_deductions)) >= 0 ? '+' : ''}
                    {formatMoney(parseFloat(selectedEmployeeSnapshot.additional_earnings) - parseFloat(selectedEmployeeSnapshot.additional_deductions), selectedEmployeeSnapshot.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Base Salary Components Breakdown */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Salary Structure Snapshot
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px' }}>Component</th>
                      <th style={{ padding: '8px 12px' }}>Type</th>
                      <th style={{ padding: '8px 12px' }}>Proration</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedEmployeeSnapshot.salary_components_snapshot || []).map((comp, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{comp.name} ({comp.code})</td>
                        <td style={{ padding: '8px 12px' }}>{comp.component_type}</td>
                        <td style={{ padding: '8px 12px' }}>{comp.is_proratable ? 'Prorated' : 'Fixed'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatMoney(comp.amount, selectedEmployeeSnapshot.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Adjustments Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Monthly Adjustments
                </h4>
                {canProcess && !isPayrollFinalized && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAdjEmployeeId(selectedEmployeeSnapshot.employee);
                      setShowAdjustmentModal(true);
                    }}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    + Add Adjustment
                  </button>
                )}
              </div>

              {employeeAdjustments.length === 0 ? (
                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                  No manual adjustments applied for this employee.
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px' }}>Type / Category</th>
                        <th style={{ padding: '8px 12px' }}>Description</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                        {canProcess && !isPayrollFinalized && <th style={{ padding: '8px 12px', width: '40px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {employeeAdjustments.map(adj => (
                        <tr key={adj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontWeight: '600', color: adj.adjustment_type === 'Earning' ? '#15803d' : '#b91c1c' }}>
                              {adj.adjustment_type}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>({adj.category})</span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>{adj.description}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: adj.adjustment_type === 'Earning' ? '#15803d' : '#b91c1c' }}>
                            {adj.adjustment_type === 'Earning' ? '+' : '-'}{formatMoney(adj.amount, selectedEmployeeSnapshot.currency)}
                          </td>
                          {canProcess && !isPayrollFinalized && (
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdjustment(adj.id)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                title="Remove Adjustment"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Close */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedEmployeeSnapshot(null)}
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Add Manual Adjustment */}
      {showAdjustmentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Add Payroll Adjustment</h3>
              <button type="button" onClick={() => setShowAdjustmentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {adjError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {adjError}
              </div>
            )}

            <form onSubmit={handleAddAdjustment}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Employee *</label>
                <select
                  className="form-input"
                  value={adjEmployeeId}
                  onChange={(e) => setAdjEmployeeId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                >
                  {employeeSnapshots.map(emp => (
                    <option key={emp.employee} value={emp.employee}>{emp.employee_name} ({emp.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Adjustment Type *</label>
                  <select
                    className="form-input"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Earning">Earning (+ Addition)</option>
                    <option value="Deduction">Deduction (- Deduction)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Category *</label>
                  <select
                    className="form-input"
                    value={adjCategory}
                    onChange={(e) => setAdjCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Bonus">Bonus</option>
                    <option value="Commission">Commission</option>
                    <option value="Reimbursement">Reimbursement</option>
                    <option value="Fine">Fine</option>
                    <option value="AdvanceRecovery">Advance Recovery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Description / Reason *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Q3 Performance Bonus"
                  value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustmentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reopen Period */}
      {showReopenModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#991b1b' }}>Reopen Finalized Payroll</h3>
              <button type="button" onClick={() => setShowReopenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {reopenError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {reopenError}
              </div>
            )}

            <form onSubmit={handleReopenPayroll}>
              <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.84rem', marginBottom: '14px', lineHeight: '1.4' }}>
                <strong>⚠️ Warning:</strong> Issued payslips from the current revision will become <strong>superseded</strong>. A new payslip revision will be created after recalculation and finalization.
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                Reopening <strong>{currentMonthName}</strong> unlocks this period, allowing attendance and salary modifications. A security audit log will record this action.
              </p>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Mandatory Justification Reason *
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Explain why this finalized payroll period needs to be reopened..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReopenModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={actionLoading}>
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Single Record Salary Payment */}
      {showPayModal && payTargetSnap && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Record Salary Payment</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {payTargetSnap.employee_name} • Net Pay: <strong>{formatMoney(payTargetSnap.net_payable, payTargetSnap.currency)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {payError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {payError}
              </div>
            )}

            <form onSubmit={handleSinglePaySubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Net Payable Amount (Locked)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatMoney(payTargetSnap.net_payable, payTargetSnap.currency)}
                  readOnly
                  disabled
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#f8fafc', fontWeight: '700', color: '#166534', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Disbursement Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Payment Method *</label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Reference / UTR Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UTR987654321 or Check #102"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Processed via HDFC Salary Account"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }} disabled={paySubmitting}>
                  {paySubmitting ? 'Recording...' : 'Confirm Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Record Salary Payments */}
      {showBulkPayModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Bulk Mark Salary as Paid</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Month: <strong>{currentMonthName}</strong> • Disbursing <strong>{periodSummary?.payment_summary?.unpaid_employee_count || 0}</strong> unpaid records
                </p>
              </div>
              <button type="button" onClick={() => setShowBulkPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {payError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {payError}
              </div>
            )}

            <form onSubmit={handleBulkPaySubmit}>
              <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.84rem', marginBottom: '14px' }}>
                Total Outstanding Net Pay: <strong>{formatMoney(periodSummary?.payment_summary?.total_unpaid_amount || 0)}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Disbursement Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={payDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Payment Method *</label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Batch Reference / UTR Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BATCH_REF_AUG2026"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Corporate Bank Bulk Disbursal"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }} disabled={paySubmitting}>
                  {paySubmitting ? 'Processing Bulk Payment...' : 'Confirm Bulk Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View / Void Salary Payment Details */}
      {showViewPaymentModal && viewPaymentTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Salary Payment Record</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {viewPaymentTarget.employee_name || 'Employee'}
                </p>
              </div>
              <button type="button" onClick={() => setShowViewPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {voidError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {voidError}
              </div>
            )}

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.88rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: viewPaymentTarget.status === 'Paid' ? '#166534' : '#b91c1c' }}>{viewPaymentTarget.status}</strong></div>
                <div><span style={{ color: '#64748b' }}>Disbursed Date:</span> <strong>{viewPaymentTarget.paid_at || '-'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Amount:</span> <strong style={{ color: '#166534' }}>{formatMoney(viewPaymentTarget.paid_amount || 0)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Method:</span> <strong>{viewPaymentTarget.payment_method_display || viewPaymentTarget.payment_method}</strong></div>
              </div>
              {viewPaymentTarget.transaction_reference && (
                <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Reference / UTR:</span> <strong>{viewPaymentTarget.transaction_reference}</strong></div>
              )}
              {viewPaymentTarget.recorded_by_name && (
                <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Recorded By:</span> <strong>{viewPaymentTarget.recorded_by_name}</strong></div>
              )}
              {viewPaymentTarget.notes && (
                <div><span style={{ color: '#64748b' }}>Notes:</span> {viewPaymentTarget.notes}</div>
              )}
            </div>

            {canManage && viewPaymentTarget.status === 'Paid' && (
              <form onSubmit={handleVoidPaymentSubmit} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '700', color: '#991b1b' }}>Void This Payment Record</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                  Voiding will mark this payment history as Voided and return the employee's salary status to Unpaid.
                </p>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.84rem', marginBottom: '4px', color: '#7f1d1d' }}>
                    Mandatory Void Reason (Min 5 chars) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Incorrect bank account reference or returned transaction"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fca5a5' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowViewPaymentModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={voidSubmitting}>
                    {voidSubmitting ? 'Voiding...' : 'Void Payment'}
                  </button>
                </div>
              </form>
            )}

            {viewPaymentTarget.status !== 'Paid' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowViewPaymentModal(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYSLIP PREVIEW MODAL */}
      <PayslipModal
        isOpen={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
        payslipData={selectedPayslipData}
        onDownloadPdf={handleDownloadAdminPdf}
        isDownloading={downloadingPdfId === (selectedPayslipData?.id || selectedPayslipData?.payslip_id)}
      />

      <style jsx>{`
        .table-row-hover:hover {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
