'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { apiFetch, getApiBaseUrl, getAccessToken, getRefreshToken, refreshAccessToken } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import {
  SearchIcon,
  CloseIcon,
  ChevronIcon,
  DownloadIcon,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  WarningIcon,
  CalendarIcon,
  ClockIcon,
  ZapIcon,
  AddIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  LockIcon,
  UnlockIcon,
  DollarIcon,
  ReceiptIcon,
  ActivityIcon,
  ShieldIcon,
  BankIcon,
} from '@/components/Icons';
import PayslipModal from '@/components/PayslipModal';
import BankExportModal from '@/components/BankExportModal';

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
  const [editingAdjId, setEditingAdjId] = useState(null);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Payslip Modal & Download states
  const [selectedPayslipData, setSelectedPayslipData] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showBankExportModal, setShowBankExportModal] = useState(false);

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

  // Open Adjustment Modal for Creating
  const handleOpenCreateAdjustment = (empId) => {
    setEditingAdjId(null);
    setAdjEmployeeId(empId || '');
    setAdjType('Earning');
    setAdjCategory('Bonus');
    setAdjAmount('');
    setAdjDesc('');
    setAdjError('');
    setShowAdjustmentModal(true);
  };

  // Open Adjustment Modal for Editing
  const handleOpenEditAdjustment = (adj, empId) => {
    setEditingAdjId(adj.id);
    setAdjEmployeeId(empId || adj.employee);
    setAdjType(adj.adjustment_type || 'Earning');
    setAdjCategory(adj.category || 'Bonus');
    setAdjAmount(adj.amount ? String(adj.amount) : '');
    setAdjDesc(adj.description || '');
    setAdjError('');
    setShowAdjustmentModal(true);
  };

  // Handle Edit Action on Employee (from table row or drawer)
  const handleEditEmployee = (snap) => {
    if (!snap) return;
    if (isPayrollFinalized) {
      if (window.confirm(`This payroll period (${currentMonthName}) is Finalized and locked.\n\nTo edit calculations or employee adjustments, the period must be reopened first.\n\nWould you like to reopen this period now?`)) {
        setShowReopenModal(true);
      }
      return;
    }
    handleOpenCreateAdjustment(snap.employee);
  };

  // Add or Update Adjustment
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
      if (editingAdjId) {
        await apiFetch(`/payroll/adjustments/${editingAdjId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            adjustment_type: adjType,
            category: adjCategory,
            amount: amt.toFixed(2),
            description: adjDesc.trim()
          })
        });
        setSuccessMsg('Adjustment updated successfully. Please recalculate payroll to apply changes.');
      } else {
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
        setSuccessMsg('Adjustment added successfully. Please recalculate payroll to apply changes.');
      }
      setShowAdjustmentModal(false);
      setEditingAdjId(null);
      setAdjAmount('');
      setAdjDesc('');
      await fetchPayrollData();
      if (selectedEmployeeSnapshot && String(selectedEmployeeSnapshot.employee) === String(adjEmployeeId)) {
        handleOpenDrawer(selectedEmployeeSnapshot);
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to save adjustment:', err);
      setAdjError(err.message || 'Failed to save adjustment.');
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
    const psId = payslip?.payslip_id || payslip?.id;
    if (!psId) {
      setErrorMsg('No payslip identifier found for download.');
      return;
    }
    try {
      setDownloadingPdfId(psId);
      const baseUrl = getApiBaseUrl();
      let token = getAccessToken();
      let res = await fetch(`${baseUrl}/payroll/payslips/${psId}/pdf/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getAccessToken();
          res = await fetch(`${baseUrl}/payroll/payslips/${psId}/pdf/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
        }
      }

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: 'Failed to download PDF payslip' };
        }
        throw new Error(errData.detail || 'Failed to download PDF payslip');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${payslip.payslip_number || payslip.employee_name || psId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Failed to download PDF payslip.');
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
      const baseUrl = getApiBaseUrl();
      let token = getAccessToken();
      let res = await fetch(`${baseUrl}/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getAccessToken();
          res = await fetch(`${baseUrl}/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
        }
      }

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
    <div className="payroll-content-container">
      
      {/* Top Header & Period Selector */}
      <div className="payroll-header-row">
        <div className="payroll-header-title-wrap">
          <h2 className="payroll-main-title">
            Monthly Payroll Processing
          </h2>
          <p className="payroll-header-caption">
            Deterministic gross-to-net payroll engine powered by finalized monthly attendance snapshots.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="payroll-period-selector">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn btn-secondary btn-sm payroll-period-nav-btn"
            title="Previous Month"
          >
            <ChevronLeftIcon size={14} />
          </button>
          
          <div className="payroll-period-dropdowns">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="payroll-period-select"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="payroll-period-select"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="btn btn-secondary btn-sm payroll-period-nav-btn"
            title="Next Month"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {friendlyError && (
        <div style={{ padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <WarningIcon size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
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
                    style={{ fontSize: '0.8rem', padding: '4px 12px', backgroundColor: '#dc2626', borderColor: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>{friendlyError.actionLabel}</span>
                    <ArrowRightIcon size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFriendlyError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', display: 'flex', alignItems: 'center', padding: '2px' }}
            title="Dismiss"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      )}

      {errorMsg && !friendlyError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', display: 'flex', alignItems: 'center' }} title="Dismiss">
            <CloseIcon size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', display: 'flex', alignItems: 'center' }} title="Dismiss">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PAYROLL WORKFLOW STEPPER                                               */}
      {/* ========================================================================= */}
      <div className="payroll-workflow-stepper">
        <div className="stepper-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
            Monthly Payroll Lifecycle • {currentMonthName}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {isPayrollFinalized ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: '700' }}>
                <CheckIcon size={13} />
                <span>Period Complete</span>
              </span>
            ) : isPayrollCalculated ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: '700' }}>
                <ActivityIcon size={13} />
                <span>Review & Finalize in progress</span>
              </span>
            ) : isAttendanceFinalized ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: '700' }}>
                <ClockIcon size={13} />
                <span>Ready for calculation</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: '700' }}>
                <WarningIcon size={13} />
                <span>Attendance pending finalization</span>
              </span>
            )}
          </span>
        </div>

        <div className="stepper-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Step 1: Attendance */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isAttendanceFinalized ? '#bbf7d0' : '#fde68a'}`,
            backgroundColor: isAttendanceFinalized ? '#f0fdf4' : '#fffbeb',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isAttendanceFinalized ? '#166534' : '#92400e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={12} />
                <span>Step 1: Attendance</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isAttendanceFinalized ? '#16a34a' : '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isAttendanceFinalized ? <CheckIcon size={12} /> : <WarningIcon size={12} />}
                <span>{isAttendanceFinalized ? 'Finalized' : 'Action Req'}</span>
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isAttendanceFinalized ? '#166534' : '#92400e' }}>
              {isAttendanceFinalized ? `Rev ${periodSummary?.attendance_revision || 1} Locked` : 'Needs Finalization'}
            </div>
          </div>

          {/* Step 2: Calculate Payroll */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollCalculated || isPayrollFinalized ? '#bbf7d0' : (isAttendanceFinalized ? '#bfdbfe' : '#e2e8f0')}`,
            backgroundColor: isPayrollCalculated || isPayrollFinalized ? '#f0fdf4' : (isAttendanceFinalized ? '#eff6ff' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollCalculated || isPayrollFinalized ? '#166534' : (isAttendanceFinalized ? '#1e40af' : '#64748b'), display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ZapIcon size={12} />
                <span>Step 2: Calculation</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isPayrollCalculated || isPayrollFinalized ? '#16a34a' : (isAttendanceFinalized ? '#2563eb' : '#94a3b8'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isPayrollCalculated || isPayrollFinalized ? <CheckIcon size={12} /> : <ClockIcon size={12} />}
                <span>{isPayrollCalculated || isPayrollFinalized ? 'Calculated' : (isAttendanceFinalized ? 'Ready' : 'Pending')}</span>
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollCalculated || isPayrollFinalized ? '#166534' : (isAttendanceFinalized ? '#1e40af' : '#64748b') }}>
              {pPeriod ? `Rev ${pPeriod.current_revision}` : 'Gross-to-Net'}
            </div>
          </div>

          {/* Step 3: Review & Adjust */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : (isPayrollCalculated ? '#fed7aa' : '#e2e8f0')}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : (isPayrollCalculated ? '#fff7ed' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : (isPayrollCalculated ? '#9a3412' : '#64748b'), display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <EditIcon size={12} />
                <span>Step 3: Review & Adjust</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : (isPayrollCalculated ? '#ea580c' : '#94a3b8'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isPayrollFinalized ? <CheckIcon size={12} /> : (isPayrollCalculated ? <ActivityIcon size={12} /> : <ClockIcon size={12} />)}
                <span>{isPayrollFinalized ? 'Reviewed' : (isPayrollCalculated ? 'Active' : 'Pending')}</span>
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : (isPayrollCalculated ? '#9a3412' : '#64748b') }}>
              {isPayrollCalculated ? `${employeeSnapshots.length} Snapshots` : 'Audit Ledger'}
            </div>
          </div>

          {/* Step 4: Finalize */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : (isPayrollCalculated ? '#cbd5e1' : '#e2e8f0')}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : (isPayrollCalculated ? '#f8fafc' : '#f8fafc'),
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <LockIcon size={12} />
                <span>Step 4: Finalize</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : (canFinalize ? '#2563eb' : '#94a3b8'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isPayrollFinalized ? <CheckIcon size={12} /> : (canFinalize ? <CheckIcon size={12} /> : <LockIcon size={12} />)}
                <span>{isPayrollFinalized ? 'Finalized' : (canFinalize ? 'Ready' : 'Locked')}</span>
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
              {isPayrollFinalized ? 'Audit Locked' : 'Prevent Edits'}
            </div>
          </div>

          {/* Step 5: Disbursement */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#bbf7d0' : '#fed7aa') : '#e2e8f0'}`,
            backgroundColor: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#f0fdf4' : '#fff7ed') : '#f8fafc',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#166534' : '#9a3412') : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <DollarIcon size={12} />
                <span>Step 5: Disbursement</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#16a34a' : '#ea580c') : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isPayrollFinalized ? (
                  periodSummary?.payment_summary?.unpaid_employee_count === 0 ? (
                    <>
                      <CheckIcon size={12} />
                      <span>Paid</span>
                    </>
                  ) : (
                    <>
                      <ClockIcon size={12} />
                      <span>{periodSummary?.payment_summary?.paid_employee_count > 0 ? `${periodSummary?.payment_summary?.paid_employee_count}/${pPeriod?.total_employees} Paid` : 'Unpaid'}</span>
                    </>
                  )
                ) : (
                  <>
                    <ClockIcon size={12} />
                    <span>Pending</span>
                  </>
                )}
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? '#166534' : '#9a3412') : '#64748b' }}>
              {isPayrollFinalized
                ? (periodSummary?.payment_summary?.unpaid_employee_count === 0 ? 'All Disbursed' : `${periodSummary?.payment_summary?.unpaid_employee_count || 0} Pending`)
                : 'Post-Finalization'}
            </div>
          </div>

          {/* Step 6: Payslips */}
          <div className="payroll-workflow-step" style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isPayrollFinalized ? '#bbf7d0' : '#e2e8f0'}`,
            backgroundColor: isPayrollFinalized ? '#f0fdf4' : '#f8fafc',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: isPayrollFinalized ? '#166534' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ReceiptIcon size={12} />
                <span>Step 6: Payslips</span>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isPayrollFinalized ? '#16a34a' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isPayrollFinalized ? <CheckIcon size={12} /> : <ClockIcon size={12} />}
                <span>{isPayrollFinalized ? 'Issued' : 'Pending'}</span>
              </span>
            </div>
            <div className="stepper-step-caption" style={{ fontSize: '0.82rem', fontWeight: '600', color: isPayrollFinalized ? '#166534' : '#64748b' }}>
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
            <span className="preflight-icon-box-warn" style={{ display: 'flex', padding: '6px', borderRadius: '8px', background: '#fef3c7', flexShrink: 0 }}>
              <WarningIcon size={20} style={{ color: '#d97706' }} />
            </span>
            <div>
              <h4 className="preflight-title-warn" style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#92400e' }}>
                Attendance is not ready for payroll
              </h4>
              <p className="preflight-caption" style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#78350f' }}>
                Finalize attendance for <strong>{currentMonthName}</strong> before payroll can be calculated.
              </p>
            </div>
          </div>
          <div className="preflight-action-wrap" style={{ display: 'flex', gap: '8px' }}>
            <Link
              href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
              className="btn btn-primary btn-sm preflight-btn"
              style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: '600', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Review Attendance</span>
              <ArrowRightIcon size={12} />
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
            <span className="preflight-icon-box-ok" style={{ display: 'flex', padding: '6px', borderRadius: '8px', background: '#dcfce7', flexShrink: 0 }}>
              <CheckIcon size={18} style={{ color: '#16a34a' }} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 className="preflight-title-ok" style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#166534' }}>
                  Attendance Ready
                </h4>
                <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                  Rev {periodSummary?.attendance_revision || 1}
                </span>
              </div>
              <p className="preflight-caption" style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#15803d' }}>
                Monthly attendance for {currentMonthName} is locked and ready for payroll calculation.
              </p>
            </div>
          </div>
          <div className="preflight-action-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
              style={{ fontSize: '0.82rem', color: '#166534', textDecoration: 'underline', fontWeight: '600' }}
            >
              View Attendance
            </Link>
            <span className="badge preflight-ready-badge" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
              Ready for Payroll
            </span>
          </div>
        </div>
      )}

      {/* Missing Salary Structure Warning */}
      {hasMissingSalary && (
        <div className="payroll-warning-banner" style={{ padding: '12px 18px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', color: '#9a3412', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WarningIcon size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
            <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
              {employeeSnapshots.filter(s => s.status === 'MissingSalaryStructure').length} employees need compensation setup before payroll can be finalized.
            </span>
          </div>
          <Link
            href="/payroll/salaries"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8rem', padding: '5px 12px', borderColor: '#fb923c', color: '#9a3412', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Review Employees</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>
      )}

      {/* Status & Action Banner */}
      <div className="payroll-action-banner">
        <div className="action-banner-statuses" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Attendance Source Status */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Attendance Source
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className={`status-pill ${isAttendanceFinalized ? 'status-pill-success' : 'status-pill-warning'}`}>
                {isAttendanceFinalized ? <CheckIcon size={12} /> : <ClockIcon size={12} />}
                <span>{isAttendanceFinalized ? `Finalized (Rev ${periodSummary?.attendance_revision || 1})` : 'Not Finalized'}</span>
              </span>
              {!isAttendanceFinalized && (
                <Link
                  href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
                  style={{ fontSize: '0.8rem', color: '#0284c7', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Finalize Attendance</span>
                  <ArrowRightIcon size={12} />
                </Link>
              )}
            </div>
          </div>

          <div className="status-divider" style={{ width: '1px', height: '36px', backgroundColor: 'var(--border, #e2e8f0)' }}></div>

          {/* Payroll Period Status */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Payroll Period Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className={`status-pill ${isPayrollFinalized ? 'status-pill-locked' : (isPayrollCalculated ? 'status-pill-info' : 'status-pill-neutral')}`}>
                {isPayrollFinalized ? <LockIcon size={12} /> : (isPayrollCalculated ? <ActivityIcon size={12} /> : <ClockIcon size={12} />)}
                <span>{pPeriod ? `${pPeriod.status} (Rev ${pPeriod.current_revision})` : 'Draft / Uncalculated'}</span>
              </span>
              {isPayrollFinalized && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <LockIcon size={12} />
                  <span>Hard Locked</span>
                </span>
              )}
            </div>
          </div>

          {/* Stale Warning Indicator */}
          {isStale && (
            <div style={{ padding: '6px 12px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#be123c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <WarningIcon size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: '700' }}>Recalculation Required:</span>
              <span>{staleReasons.join(' | ')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-banner-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {canProcess && (
            <button
              type="button"
              className="btn btn-secondary banner-btn"
              onClick={() => {
                setAdjEmployeeId(employeeSnapshots[0]?.employee || '');
                setShowAdjustmentModal(true);
              }}
              disabled={isPayrollFinalized || actionLoading || !pPeriod}
              style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <AddIcon size={13} />
              <span>Add Adjustment</span>
            </button>
          )}

          {canProcess && !isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-primary banner-btn"
              onClick={handleCalculatePayroll}
              disabled={actionLoading || !isAttendanceFinalized}
              style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ZapIcon size={14} />
              <span>{pPeriod ? 'Recalculate Payroll' : 'Calculate Payroll'}</span>
            </button>
          )}

          {canManage && isPayrollCalculated && (
            <button
              type="button"
              className="btn btn-primary banner-btn"
              onClick={handleFinalizePayroll}
              disabled={!canFinalize || actionLoading}
              style={{ fontSize: '0.85rem', padding: '8px 16px', backgroundColor: '#15803d', borderColor: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title={!canFinalize ? 'Cannot finalize: Ensure attendance is finalized, no negative net pay, and all employees have salary structures.' : 'Finalize and Lock Payroll'}
            >
              <CheckIcon size={14} />
              <span>Finalize Month</span>
            </button>
          )}

          {isPayrollFinalized && (
            <Link
              href={`/payroll/payments?year=${selectedYear}&month=${selectedMonth}`}
              className="btn btn-primary banner-btn"
              style={{ fontSize: '0.85rem', padding: '8px 16px', backgroundColor: '#2563eb', borderColor: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Go to Payroll Payments</span>
              <ArrowRightIcon size={13} />
            </Link>
          )}

          {isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-secondary banner-btn"
              onClick={handleExportZip}
              disabled={isExportingZip || actionLoading}
              style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', borderColor: '#99f6e4', background: '#f0fdfa' }}
              title="Download all issued payslips for this finalized period as a ZIP archive"
            >
              <DownloadIcon size={14} />
              <span>{isExportingZip ? 'Exporting ZIP...' : 'Export All Payslips (ZIP)'}</span>
            </button>
          )}

          {isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-secondary banner-btn"
              onClick={() => setShowBankExportModal(true)}
              disabled={actionLoading || isExportingZip}
              style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', borderColor: '#bfdbfe', background: '#eff6ff' }}
              title="Generate bank-compatible salary payment disbursement file (HDFC, ICICI, SBI, Generic)"
            >
              <BankIcon size={14} />
              <span>Export Bank File</span>
            </button>
          )}

          {canManage && isPayrollFinalized && (
            <button
              type="button"
              className="btn btn-secondary banner-btn"
              onClick={() => setShowReopenModal(true)}
              disabled={actionLoading || isExportingZip}
              style={{ fontSize: '0.85rem', padding: '8px 14px', color: '#b91c1c', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UnlockIcon size={14} />
              <span>Reopen Period</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="payroll-kpi-grid">
        
        {isPayrollFinalized && (
          <>
            <div className="payroll-kpi-card kpi-card-disbursed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title-disbursed" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  Disbursed / Paid
                </span>
                <span className="kpi-icon-badge kpi-icon-disbursed">
                  <CheckIcon size={13} />
                </span>
              </div>
              <div className="kpi-card-value kpi-disbursed-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
                {formatMoney(periodSummary?.payment_summary?.total_paid_amount || 0)}
              </div>
              <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: '#15803d' }}>
                {periodSummary?.payment_summary?.paid_employee_count || 0} employees paid
              </span>
            </div>

            <div className="payroll-kpi-card kpi-card-outstanding">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title-outstanding" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#9a3412', letterSpacing: '0.05em' }}>
                  Outstanding / Unpaid
                </span>
                <span className="kpi-icon-badge kpi-icon-outstanding">
                  <ClockIcon size={13} />
                </span>
              </div>
              <div className="kpi-card-value kpi-outstanding-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: '#c2410c', marginTop: '6px' }}>
                {formatMoney(periodSummary?.payment_summary?.total_unpaid_amount || 0)}
              </div>
              <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: '#9a3412' }}>
                {periodSummary?.payment_summary?.unpaid_employee_count || 0} employees pending
              </span>
            </div>
          </>
        )}
        
        {/* Net Payable */}
        <div className="payroll-kpi-card kpi-card-net">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title-net" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
              Total Net Payable
            </span>
            <span className="kpi-icon-badge kpi-icon-net">
              <DollarIcon size={14} />
            </span>
          </div>
          <div className="kpi-card-value kpi-net-val" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
            {formatMoney(pPeriod?.total_net_payable || 0)}
          </div>
          <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: '#15803d' }}>
            For {pPeriod?.total_employees || 0} active employees
          </span>
        </div>

        {/* Earned Gross */}
        <div className="payroll-kpi-card kpi-card-gross">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Earned Gross Salary
            </span>
            <span className="kpi-icon-badge kpi-icon-gross">
              <ReceiptIcon size={14} />
            </span>
          </div>
          <div className="kpi-card-value kpi-gross-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {formatMoney(pPeriod?.total_earned_gross || 0)}
          </div>
          <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            Base Gross: {formatMoney(pPeriod?.total_base_gross || 0)}
          </span>
        </div>

        {/* Attendance Deductions */}
        <div className="payroll-kpi-card kpi-card-att">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Attendance Deductions
            </span>
            <span className="kpi-icon-badge kpi-icon-att">
              <CalendarIcon size={14} />
            </span>
          </div>
          <div className="kpi-card-value kpi-att-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '6px' }}>
            -{formatMoney(pPeriod?.total_attendance_deductions || 0)}
          </div>
          <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            From unpaid leaves & absences
          </span>
        </div>

        {/* Base Deductions */}
        <div className="payroll-kpi-card kpi-card-ded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Base Fixed Deductions
            </span>
            <span className="kpi-icon-badge kpi-icon-ded">
              <ShieldIcon size={14} />
            </span>
          </div>
          <div className="kpi-card-value kpi-ded-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: '#475569', marginTop: '6px' }}>
            -{formatMoney(pPeriod?.total_base_deductions || 0)}
          </div>
          <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            Insurance & scheduled deductions
          </span>
        </div>

        {/* Manual Adjustments */}
        <div className="payroll-kpi-card kpi-card-adj">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              Net Adjustments
            </span>
            <span className="kpi-icon-badge kpi-icon-adj">
              <ActivityIcon size={14} />
            </span>
          </div>
          <div className="kpi-card-value kpi-adj-val" style={{ fontSize: '1.4rem', fontWeight: '800', color: parseFloat(pPeriod?.total_adjustments_net || 0) >= 0 ? '#15803d' : '#b91c1c', marginTop: '6px' }}>
            {parseFloat(pPeriod?.total_adjustments_net || 0) >= 0 ? '+' : ''}{formatMoney(pPeriod?.total_adjustments_net || 0)}
          </div>
          <span className="kpi-card-caption" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            Bonuses, fines, reimbursements
          </span>
        </div>
      </div>

      {/* Main Ledger Panel */}
      <div className="payroll-ledger-panel panel" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Table Filters Toolbar */}
        <div className="ledger-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="ledger-search-box" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '420px', width: '100%', minWidth: 0 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: searchQuery ? '#0284c7' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                transition: 'color 0.2s ease'
              }}>
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search employee or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ledger-search-input"
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
                  e.target.style.borderColor = '#0284c7';
                  e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#cbd5e1';
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

          <div className="ledger-filter-box" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ledger-status-select"
              style={{
                height: '40px',
                borderRadius: '10px',
                border: '1px solid var(--border, #cbd5e1)',
                fontSize: '0.85rem',
                padding: '0 14px',
                backgroundColor: 'var(--bg-input, #ffffff)',
                color: 'var(--text-main, #334155)',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#0284c7', fontWeight: '600', fontSize: '0.9rem' }}>
            Loading monthly payroll records...
          </div>
        ) : !pPeriod ? (
          <div className="payroll-empty-state" style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--border, #cbd5e1)' }}>
            <p className="empty-state-title" style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>
              Payroll has not been calculated for {currentMonthName} yet.
            </p>
            {isAttendanceFinalized ? (
              <div>
                <p className="empty-state-caption" style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#166534' }}>
                  Attendance for {currentMonthName} is finalized and ready.
                </p>
                <button
                  type="button"
                  className="btn btn-primary empty-state-btn"
                  onClick={handleCalculatePayroll}
                  disabled={actionLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ZapIcon size={14} />
                  <span>Calculate Payroll Now</span>
                </button>
              </div>
            ) : (
              <div>
                <p className="empty-state-caption" style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Please finalize attendance for {currentMonthName} first to enable payroll calculations.
                </p>
                <Link
                  href={`/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`}
                  className="btn btn-primary btn-sm empty-state-btn"
                  style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: '600', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Review Attendance</span>
                  <ArrowRightIcon size={13} />
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
            <div className="ledger-desktop-table">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)', color: 'var(--text-muted, #475569)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: snap.status === 'OK' ? '#ecfdf5' : '#fef2f2',
                              color: snap.status === 'OK' ? '#065f46' : '#991b1b',
                              border: `1px solid ${snap.status === 'OK' ? '#a7f3d0' : '#fecaca'}`
                            }}>
                              {snap.status === 'OK' ? <CheckIcon size={11} /> : <WarningIcon size={11} />}
                              <span>{snap.status}</span>
                            </span>
                          </td>
                          {isPayrollFinalized && (
                            <td style={{ padding: '14px' }}>
                              {isPaid ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: '#dcfce7',
                                  color: '#166534',
                                  border: '1px solid #86efac'
                                }}>
                                  <CheckIcon size={11} />
                                  <span>Paid</span>
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a'
                                }}>
                                  <ClockIcon size={11} />
                                  <span>Unpaid</span>
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
                                    style={{ fontSize: '0.78rem', padding: '4px 8px', borderColor: '#86efac', color: '#166534', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="View Official Payslip"
                                  >
                                    <EyeIcon size={12} />
                                    <span>View Payslip</span>
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
                                  handleEditEmployee(snap);
                                }}
                                style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Edit Employee / Adjustments"
                              >
                                <EditIcon size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDrawer(snap);
                                }}
                                style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>Breakdown</span>
                                <ChevronRightIcon size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Snap Cards View (<=768px down to 300px) */}
            <div className="ledger-mobile-cards">
              {filteredSnapshots.map(snap => {
                const hasIssue = snap.status !== 'OK';
                const isDaily = snap.compensation_type === 'DAILY';
                const isHourly = snap.compensation_type === 'HOURLY';
                const isPaid = snap.payment_status === 'Paid';
                return (
                  <div
                    key={snap.id}
                    className="mobile-snap-card"
                    onClick={() => handleOpenDrawer(snap)}
                    style={{
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      border: `1px solid ${hasIssue ? '#fca5a5' : 'var(--border, #e2e8f0)'}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Header: Name, Desig, Type, Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main, #0f172a)' }}>
                            {snap.employee_name}
                          </span>
                          {isHourly && (
                            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              Hourly
                            </span>
                          )}
                          {isDaily && (
                            <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              Daily
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                          {snap.designation || 'Staff'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          backgroundColor: snap.status === 'OK' ? '#ecfdf5' : '#fef2f2',
                          color: snap.status === 'OK' ? '#065f46' : '#991b1b',
                          border: `1px solid ${snap.status === 'OK' ? '#a7f3d0' : '#fecaca'}`
                        }}>
                          {snap.status === 'OK' ? <CheckIcon size={10} /> : <WarningIcon size={10} />}
                          <span>{snap.status}</span>
                        </span>

                        {isPayrollFinalized && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
                            color: isPaid ? '#166534' : '#b45309',
                            border: `1px solid ${isPaid ? '#86efac' : '#fde68a'}`
                          }}>
                            {isPaid ? <CheckIcon size={9} /> : <ClockIcon size={9} />}
                            <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Net & Earned Gross block */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-card-nested, #f8fafc)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      border: '1px solid var(--border, #e2e8f0)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                          Net Payable
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: parseFloat(snap.net_payable) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatMoney(snap.net_payable, snap.currency)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {isHourly
                            ? `${snap.payable_hours || '0.00'} hrs`
                            : `${snap.payable_attendance_units} / ${snap.working_days} d`}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main, #334155)' }}>
                          Gross: {formatMoney(snap.earned_gross, snap.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '4px', flexWrap: 'wrap' }}>
                      {isPayrollFinalized && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPayslipModal(snap);
                            }}
                            style={{ fontSize: '0.74rem', padding: '3px 7px', borderColor: '#86efac', color: '#166534', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View Payslip"
                          >
                            <EyeIcon size={11} />
                            <span>Payslip</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadAdminPdf(snap);
                            }}
                            style={{ fontSize: '0.74rem', padding: '3px 7px', display: 'flex', alignItems: 'center' }}
                            title="Download PDF"
                            disabled={downloadingPdfId === (snap.payslip_id || snap.id)}
                          >
                            <DownloadIcon size={11} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEmployee(snap);
                        }}
                        style={{ fontSize: '0.74rem', padding: '3px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title="Edit Employee / Adjustments"
                      >
                        <EditIcon size={11} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(snap);
                        }}
                        style={{ fontSize: '0.74rem', padding: '3px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <span>Breakdown</span>
                        <ChevronRightIcon size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ledger-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
              <span className="pagination-info">Showing {employeeSnapshots.length} of {totalSnapshotsCount} employee record{totalSnapshotsCount !== 1 ? 's' : ''} (Page {page} of {Math.max(1, Math.ceil(totalSnapshotsCount / pageSize))})</span>
              <div className="pagination-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{page} / {Math.max(1, Math.ceil(totalSnapshotsCount / pageSize))}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => (page < Math.ceil(totalSnapshotsCount / pageSize) ? p + 1 : p))}
                  disabled={page >= Math.ceil(totalSnapshotsCount / pageSize) || loading}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRightIcon size={12} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DETAIL BREAKDOWN DRAWER */}
      {selectedEmployeeSnapshot && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="payroll-drawer-panel" style={{ width: '100%', maxWidth: '640px', height: '100%', backgroundColor: 'var(--bg-card, #ffffff)', padding: '28px', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            
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
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534', display: 'block' }}>Official Issued Payslip</span>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>Immutable payroll document</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenPayslipModal(selectedEmployeeSnapshot)}
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <EyeIcon size={13} />
                    <span>View Payslip</span>
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
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEditEmployee(selectedEmployeeSnapshot)}
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Edit Employee / Adjustments"
                  >
                    <EditIcon size={14} />
                    <span>Edit</span>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                backgroundColor: selectedEmployeeSnapshot.status === 'OK' ? '#dcfce7' : '#fee2e2',
                color: selectedEmployeeSnapshot.status === 'OK' ? '#15803d' : '#b91c1c'
              }}>
                {selectedEmployeeSnapshot.status === 'OK' ? <CheckIcon size={12} /> : <WarningIcon size={12} />}
                <span>Status: {selectedEmployeeSnapshot.status}</span>
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
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
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
                    onClick={() => handleOpenCreateAdjustment(selectedEmployeeSnapshot.employee)}
                    style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <AddIcon size={12} />
                    <span>Add Adjustment</span>
                  </button>
                )}
              </div>

              {employeeAdjustments.length === 0 ? (
                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                  No manual adjustments applied for this employee.
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px' }}>Type / Category</th>
                        <th style={{ padding: '8px 12px' }}>Description</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                        {canProcess && !isPayrollFinalized && <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}>Actions</th>}
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAdjustment(adj, selectedEmployeeSnapshot.employee)}
                                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                  title="Edit Adjustment"
                                >
                                  <EditIcon size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdjustment(adj.id)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                  title="Remove Adjustment"
                                >
                                  <DeleteIcon size={13} />
                                </button>
                              </div>
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
          <div className="custom-modal-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{editingAdjId ? 'Edit Payroll Adjustment' : 'Add Payroll Adjustment'}</h3>
              <button type="button" onClick={() => { setShowAdjustmentModal(false); setEditingAdjId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
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
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAdjustmentModal(false); setEditingAdjId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? (editingAdjId ? 'Updating...' : 'Saving...') : (editingAdjId ? 'Update Adjustment' : 'Save Adjustment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reopen Period */}
      {showReopenModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="custom-modal-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
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
              {periodSummary?.payment_summary?.paid_employee_count > 0 && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', marginBottom: '14px', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <WarningIcon size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Recorded Payments Detected:</strong> This period contains <strong>{periodSummary.payment_summary.paid_employee_count}</strong> recorded salary payment(s). All recorded payments must be voided before reopening payroll.
                  </div>
                </div>
              )}

              <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.84rem', marginBottom: '14px', lineHeight: '1.4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WarningIcon size={16} />
                <span>
                  <strong>Warning:</strong> Issued payslips from the current revision will become <strong>superseded</strong>. A new payslip revision will be created after recalculation and finalization.
                </span>
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: (periodSummary?.payment_summary?.paid_employee_count > 0) ? '#94a3b8' : '#dc2626',
                    borderColor: (periodSummary?.payment_summary?.paid_employee_count > 0) ? '#94a3b8' : '#dc2626',
                    cursor: (periodSummary?.payment_summary?.paid_employee_count > 0) ? 'not-allowed' : 'pointer'
                  }}
                  disabled={actionLoading || (periodSummary?.payment_summary?.paid_employee_count > 0)}
                  title={(periodSummary?.payment_summary?.paid_employee_count > 0) ? 'Void existing payments first before reopening' : 'Confirm Reopen'}
                >
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
          <div className="custom-modal-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
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
          <div className="custom-modal-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
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
          <div className="custom-modal-card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
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

      {/* BANK PAYMENT EXPORT MODAL */}
      <BankExportModal
        isOpen={showBankExportModal}
        onClose={() => setShowBankExportModal(false)}
        year={selectedYear}
        month={selectedMonth}
      />

      <style jsx>{`
        .table-row-hover:hover {
          background-color: var(--bg-card-nested, #f8fafc) !important;
        }

        .payroll-content-container {
          padding: 20px 24px;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .payroll-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }

        .payroll-header-title-wrap {
          flex: 1;
          min-width: 200px;
        }

        .payroll-period-selector {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          flex-shrink: 0;
          flex-wrap: nowrap;
        }

        .payroll-period-dropdowns {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .payroll-period-select {
          height: 34px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid var(--border, #e2e8f0);
          background-color: var(--bg-card-nested, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .payroll-period-select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .payroll-period-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          min-width: 34px;
          padding: 0;
          border-radius: 6px;
          border: 1px solid var(--border, #e2e8f0);
          background-color: var(--bg-card-nested, #f8fafc);
          color: var(--text-main, #0f172a);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .payroll-period-nav-btn:hover {
          background-color: var(--bg-active, #e2e8f0);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid transparent;
          line-height: 1.2;
          white-space: nowrap;
        }

        .status-pill-warning {
          background-color: #fef3c7;
          color: #b45309;
          border-color: #fde68a;
        }

        .status-pill-neutral {
          background-color: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }

        .status-pill-success {
          background-color: #dcfce7;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .status-pill-info {
          background-color: #e0f2fe;
          color: #0369a1;
          border-color: #bae6fd;
        }

        .status-pill-locked {
          background-color: #f1f5f9;
          color: #334155;
          border-color: #cbd5e1;
        }

        .payroll-workflow-stepper {
          background-color: var(--bg-card, #ffffff);
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          padding: 16px 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .payroll-action-banner {
          background-color: var(--bg-card, #ffffff);
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          padding: 18px 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .payroll-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .payroll-kpi-card {
          background-color: var(--bg-card, #ffffff);
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          padding: 18px 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }

        .kpi-card-net,
        .kpi-card-disbursed {
          border-color: #bbf7d0;
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }

        .kpi-card-outstanding {
          border-color: #fed7aa;
          background: linear-gradient(135deg, #ffffff 0%, #fff7ed 100%);
        }

        .kpi-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .kpi-icon-net,
        .kpi-icon-disbursed {
          background: #dcfce7;
          color: #15803d;
        }

        .kpi-icon-outstanding {
          background: #ffedd5;
          color: #c2410c;
        }

        .kpi-icon-gross,
        .kpi-icon-ded {
          background: #f1f5f9;
          color: #475569;
        }

        .kpi-icon-att {
          background: #fef2f2;
          color: #dc2626;
        }

        .kpi-icon-adj {
          background: #f0f9ff;
          color: #0284c7;
        }

        .ledger-desktop-table {
          display: block;
        }

        .ledger-mobile-cards {
          display: none;
        }

        /* ---------------------------------------------------- */
        /* Tablet Breakpoint (<= 768px)                         */
        /* ---------------------------------------------------- */
        @media (max-width: 768px) {
          .payroll-content-container {
            padding: 14px 12px;
          }

          .payroll-workflow-stepper {
            padding: 12px 14px;
            margin-bottom: 14px;
          }

          .payroll-action-banner {
            padding: 14px 16px;
            margin-bottom: 16px;
          }

          .payroll-ledger-panel {
            padding: 16px 14px !important;
          }

          .stepper-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }

          .ledger-desktop-table {
            display: none !important;
          }

          .ledger-mobile-cards {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
          }
        }

        /* ---------------------------------------------------- */
        /* Phablet Breakpoint (<= 640px)                        */
        /* ---------------------------------------------------- */
        @media (max-width: 640px) {
          .payroll-header-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: 10px;
          }

          .payroll-period-selector {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            flex-wrap: nowrap !important;
          }

          .payroll-period-dropdowns {
            display: flex;
            flex: 1;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .payroll-period-select {
            flex: 1;
            min-width: 0;
          }

          .payroll-action-banner {
            flex-direction: column;
            align-items: stretch !important;
            gap: 14px;
          }

          .action-banner-statuses {
            flex-direction: column;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .status-divider {
            display: none !important;
          }

          .action-banner-buttons {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 8px !important;
          }

          .banner-btn {
            width: 100%;
            justify-content: center;
          }

          .payroll-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 16px;
          }

          .payroll-drawer-panel {
            padding: 16px 14px !important;
          }

          .custom-modal-card {
            padding: 16px 14px !important;
          }
        }

        /* ---------------------------------------------------- */
        /* Mobile Breakpoint (<= 480px)                         */
        /* Captions omitted & font size reduced as requested    */
        /* ---------------------------------------------------- */
        @media (max-width: 480px) {
          .payroll-content-container {
            padding: 10px 8px;
          }

          .payroll-main-title {
            font-size: 1.15rem !important;
          }

          .payroll-period-selector {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 4px !important;
            padding: 3px !important;
            box-sizing: border-box !important;
            flex-wrap: nowrap !important;
          }

          .payroll-period-dropdowns {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .payroll-period-select {
            height: 32px !important;
            font-size: 0.8rem !important;
            padding: 0 4px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .payroll-period-nav-btn {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
          }

          /* Omit verbose captions on mobile */
          .payroll-header-caption,
          .stepper-step-caption,
          .preflight-caption,
          .kpi-card-caption {
            display: none !important;
          }

          .payroll-workflow-step {
            padding: 8px 10px !important;
          }

          .attendance-preflight-card {
            padding: 10px 12px !important;
            margin-bottom: 14px !important;
          }

          .preflight-action-wrap {
            width: 100%;
          }

          .preflight-btn {
            width: 100%;
            justify-content: center;
          }

          .payroll-kpi-card {
            padding: 10px 12px !important;
          }

          .kpi-card-value {
            font-size: 1.15rem !important;
            margin-top: 3px !important;
          }

          .kpi-net-val {
            font-size: 1.25rem !important;
          }

          .payroll-ledger-panel {
            padding: 12px 10px !important;
            border-radius: 10px !important;
          }

          .ledger-toolbar {
            flex-direction: column;
            align-items: stretch !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
          }

          .ledger-search-box {
            max-width: 100% !important;
          }

          .ledger-search-input {
            height: 36px !important;
            font-size: 0.82rem !important;
          }

          .ledger-filter-box {
            width: 100%;
          }

          .ledger-status-select {
            width: 100%;
            height: 36px !important;
            font-size: 0.82rem !important;
          }

          .payroll-empty-state {
            padding: 22px 12px !important;
          }

          .empty-state-title {
            font-size: 0.88rem !important;
          }

          .ledger-pagination-bar {
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 10px 8px !important;
            text-align: center;
          }

          .pagination-buttons {
            width: 100%;
            justify-content: center;
          }
        }

        /* ---------------------------------------------------- */
        /* Small Mobile / 300px Base Breakpoint (<= 360px)       */
        /* ---------------------------------------------------- */
        @media (max-width: 360px) {
          .payroll-content-container {
            padding: 6px 4px !important;
          }

          .payroll-main-title {
            font-size: 1.05rem !important;
          }

          .payroll-period-selector {
            padding: 2px !important;
            gap: 3px !important;
          }

          .payroll-period-dropdowns {
            gap: 3px !important;
          }

          .payroll-period-select {
            height: 30px !important;
            font-size: 0.76rem !important;
            padding: 0 2px !important;
          }

          .payroll-period-nav-btn {
            width: 30px !important;
            height: 30px !important;
            min-width: 30px !important;
          }

          .stepper-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }

          .payroll-kpi-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }

          .payroll-ledger-panel {
            padding: 10px 6px !important;
          }

          .mobile-snap-card {
            padding: 10px 8px !important;
            gap: 6px !important;
          }

          .payroll-drawer-panel {
            padding: 12px 8px !important;
          }

          .custom-modal-card {
            padding: 12px 8px !important;
          }
        }

        /* ---------------------------------------------------- */
        /* Dark Mode Theming                                    */
        /* ---------------------------------------------------- */
        :global(:root.dark) .payroll-period-selector,
        :global(:root.dark) .payroll-workflow-stepper,
        :global(:root.dark) .payroll-action-banner,
        :global(:root.dark) .payroll-ledger-panel,
        :global(:root.dark) .payroll-kpi-card,
        :global(:root.dark) .payroll-drawer-panel,
        :global(:root.dark) .custom-modal-card,
        :global(:root.dark) .mobile-snap-card {
          background-color: var(--bg-card, #1e293b) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payroll-empty-state,
        :global(:root.dark) .payroll-workflow-step {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-color: var(--border, #334155) !important;
        }

        :global(:root.dark) .payroll-ledger-panel input,
        :global(:root.dark) .payroll-ledger-panel select,
        :global(:root.dark) .payroll-period-select,
        :global(:root.dark) .payroll-period-nav-btn {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payroll-period-nav-btn:hover {
          background-color: var(--border, #334155) !important;
        }

        /* Dark Mode Status Badges (Eliminating Glaring White Boxes) */
        :global(:root.dark) .status-pill-warning {
          background-color: rgba(217, 119, 6, 0.2) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.35) !important;
        }

        :global(:root.dark) .status-pill-neutral {
          background-color: rgba(51, 65, 85, 0.6) !important;
          color: #cbd5e1 !important;
          border-color: #475569 !important;
        }

        :global(:root.dark) .status-pill-success {
          background-color: rgba(22, 163, 74, 0.2) !important;
          color: #4ade80 !important;
          border-color: rgba(74, 222, 128, 0.35) !important;
        }

        :global(:root.dark) .status-pill-info {
          background-color: rgba(8, 145, 178, 0.2) !important;
          color: #38bdf8 !important;
          border-color: rgba(56, 189, 248, 0.35) !important;
        }

        :global(:root.dark) .status-pill-locked {
          background-color: rgba(30, 41, 59, 0.8) !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
        }

        /* Dark Mode KPI Cards & Figures High-Contrast */
        :global(:root.dark) .kpi-card-net {
          border-color: rgba(34, 197, 94, 0.3) !important;
          background: linear-gradient(135deg, #1e293b 0%, rgba(22, 101, 52, 0.2) 100%) !important;
        }

        :global(:root.dark) .kpi-card-disbursed {
          border-color: rgba(34, 197, 94, 0.3) !important;
          background: linear-gradient(135deg, #1e293b 0%, rgba(22, 101, 52, 0.2) 100%) !important;
        }

        :global(:root.dark) .kpi-card-outstanding {
          border-color: rgba(249, 115, 22, 0.3) !important;
          background: linear-gradient(135deg, #1e293b 0%, rgba(154, 52, 18, 0.2) 100%) !important;
        }

        :global(:root.dark) .kpi-title-net,
        :global(:root.dark) .kpi-title-disbursed {
          color: #4ade80 !important;
        }

        :global(:root.dark) .kpi-title-outstanding {
          color: #fb923c !important;
        }

        :global(:root.dark) .kpi-net-val {
          color: #4ade80 !important;
        }

        :global(:root.dark) .kpi-disbursed-val {
          color: #4ade80 !important;
        }

        :global(:root.dark) .kpi-outstanding-val {
          color: #fb923c !important;
        }

        :global(:root.dark) .kpi-gross-val {
          color: #f8fafc !important;
        }

        :global(:root.dark) .kpi-att-val {
          color: #f87171 !important;
        }

        :global(:root.dark) .kpi-ded-val {
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .kpi-adj-val {
          color: #38bdf8 !important;
        }

        :global(:root.dark) .kpi-icon-net,
        :global(:root.dark) .kpi-icon-disbursed {
          background: rgba(34, 197, 94, 0.2) !important;
          color: #4ade80 !important;
        }

        :global(:root.dark) .kpi-icon-outstanding {
          background: rgba(249, 115, 22, 0.2) !important;
          color: #fb923c !important;
        }

        :global(:root.dark) .kpi-icon-gross,
        :global(:root.dark) .kpi-icon-ded {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .kpi-icon-att {
          background: rgba(239, 68, 68, 0.2) !important;
          color: #f87171 !important;
        }

        :global(:root.dark) .kpi-icon-adj {
          background: rgba(56, 189, 248, 0.2) !important;
          color: #38bdf8 !important;
        }

        /* Dark Mode Attendance Preflight Card */
        :global(:root.dark) .attendance-preflight-card {
          background-color: rgba(30, 41, 59, 0.95) !important;
          border-color: rgba(217, 119, 6, 0.4) !important;
        }

        :global(:root.dark) .preflight-icon-box-warn {
          background: rgba(217, 119, 6, 0.2) !important;
        }

        :global(:root.dark) .preflight-title-warn {
          color: #fbbf24 !important;
        }

        :global(:root.dark) .attendance-preflight-card p {
          color: #cbd5e1 !important;
        }
      `}</style>
    </div>
  );
}
