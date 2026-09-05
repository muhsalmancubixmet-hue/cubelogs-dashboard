'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  DollarIcon, 
  PlusIcon, 
  EditIcon, 
  CheckIcon, 
  WarningIcon, 
  CloseIcon 
} from '@/components/Icons';
import { formatCurrency } from '@/lib/currency';

export default function SalaryCompensationTab({ employeeId, employeeName, canManage = false }) {
  const [mounted, setMounted] = useState(false);
  const modalBodyRef = useRef(null);

  const [salaryData, setSalaryData] = useState(null);
  const [catalogComponents, setCatalogComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Assign/Revise Salary
  const [showModal, setShowModal] = useState(false);
  const [compensationType, setCompensationType] = useState('MONTHLY');
  const [dailyRate, setDailyRate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [componentsList, setComponentsList] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal State for New Catalog Component
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompCode, setNewCompCode] = useState('');
  const [newCompType, setNewCompType] = useState('Earning');
  const [newCompProratable, setNewCompProratable] = useState(true);
  const [newCompTaxable, setNewCompTaxable] = useState(true);
  const [newCompDesc, setNewCompDesc] = useState('');
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [catalogModalError, setCatalogModalError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSalaryDetails = async () => {
    if (!employeeId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [salRes, compRes] = await Promise.all([
        apiFetch(`/payroll/employees/${employeeId}/salary/`).catch((e) => {
          if (e.status === 404) return null;
          throw e;
        }),
        apiFetch('/payroll/components/').catch(() => [])
      ]);

      setSalaryData(salRes);
      setCatalogComponents(Array.isArray(compRes) ? compRes : (compRes?.results || []));
    } catch (err) {
      console.error('Error fetching salary details:', err);
      setErrorMsg(err.message || 'Failed to load salary details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryDetails();
  }, [employeeId]);

  // Reset modal body scroll position to top when modal opens
  useEffect(() => {
    if (showModal) {
      requestAnimationFrame(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = 0;
        }
      });
    }
  }, [showModal]);

  // Lock body scroll preserving exact scroll position, and handle Escape key
  useEffect(() => {
    if (!mounted) return;
    if (showModal || showCatalogModal) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (showCatalogModal && !catalogSubmitting) setShowCatalogModal(false);
          else if (showModal && !submitting) setShowModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showModal, showCatalogModal, mounted, submitting, catalogSubmitting]);

  // Helper to get first day of current or next month in YYYY-MM-01 format
  const getDefaultEffectiveDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const handleOpenAssignModal = () => {
    setModalError('');
    setEffectiveFrom(getDefaultEffectiveDate());
    setNotes('');

    const active = salaryData?.active_structure;
    if (active) {
      setCompensationType(active.compensation_type || 'MONTHLY');
      setDailyRate(active.daily_rate ? String(active.daily_rate) : '');
      setHourlyRate(active.hourly_rate ? String(active.hourly_rate) : '');
      if (active.components && active.components.length > 0) {
        setComponentsList(
          active.components.map(c => ({
            salary_component: String(c.salary_component_id || c.id),
            amount: String(c.amount || '0.00')
          }))
        );
      } else {
        setComponentsList([]);
      }
    } else {
      setCompensationType('MONTHLY');
      setDailyRate('');
      setHourlyRate('');
      if (catalogComponents.length > 0) {
        setComponentsList([{ salary_component: String(catalogComponents[0].id), amount: '0.00' }]);
      } else {
        setComponentsList([]);
      }
    }
    setShowModal(true);
  };

  const handleAddComponentRow = () => {
    if (catalogComponents.length === 0) {
      setModalError('Please add components to the organization catalog first.');
      return;
    }
    setComponentsList([
      ...componentsList,
      { salary_component: String(catalogComponents[0].id), amount: '0.00' }
    ]);
  };

  const handleRemoveComponentRow = (index) => {
    setComponentsList(componentsList.filter((_, idx) => idx !== index));
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...componentsList];
    updated[index][field] = value;
    setComponentsList(updated);
  };

  // Preview Totals Calculation in Modal
  const calculatePreviewTotals = () => {
    let gross = 0;
    let deductions = 0;

    componentsList.forEach(line => {
      const comp = catalogComponents.find(c => String(c.id) === String(line.salary_component));
      const val = parseFloat(line.amount) || 0;
      if (comp) {
        if (comp.component_type === 'Earning') {
          gross += val;
        } else if (comp.component_type === 'Deduction') {
          deductions += val;
        }
      }
    });

    const net = gross - deductions;
    return { gross, deductions, net };
  };

  const handleSaveSalaryStructure = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!effectiveFrom) {
      setModalError('Effective date is required.');
      return;
    }

    const parts = effectiveFrom.split('-');
    if (parts.length !== 3 || parts[2] !== '01') {
      setModalError('Salary effective date must be the first day of a month (e.g., YYYY-MM-01).');
      return;
    }

    if (compensationType === 'HOURLY') {
      const parsedRate = parseFloat(hourlyRate);
      if (isNaN(parsedRate) || parsedRate <= 0) {
        setModalError('Hourly Wage Rate must be greater than zero.');
        return;
      }
    } else if (compensationType === 'DAILY') {
      const parsedRate = parseFloat(dailyRate);
      if (isNaN(parsedRate) || parsedRate <= 0) {
        setModalError('Daily Wage Rate must be greater than zero.');
        return;
      }
    } else {
      if (componentsList.length === 0) {
        setModalError('At least one salary component is required for Monthly Salary.');
        return;
      }
    }

    // Check for duplicate components in same assignment
    if (componentsList.length > 0) {
      const compIds = componentsList.map(c => c.salary_component);
      if (new Set(compIds).size !== compIds.length) {
        setModalError('Duplicate salary components selected. Please ensure each component is listed once.');
        return;
      }

      // Validate amounts
      for (const line of componentsList) {
        const parsed = parseFloat(line.amount);
        if (isNaN(parsed) || parsed < 0) {
          setModalError('Salary component amounts cannot be negative.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        effective_from: effectiveFrom,
        compensation_type: compensationType,
        daily_rate: compensationType === 'DAILY' ? parseFloat(dailyRate).toFixed(2) : null,
        hourly_rate: compensationType === 'HOURLY' ? parseFloat(hourlyRate).toFixed(2) : null,
        components: componentsList.map(c => ({
          salary_component: parseInt(c.salary_component, 10),
          amount: parseFloat(c.amount).toFixed(2)
        })),
        notes: notes.trim()
      };

      await apiFetch(`/payroll/employees/${employeeId}/salary/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessMsg('Salary structure assigned successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setShowModal(false);
      fetchSalaryDetails();
    } catch (err) {
      console.error('Error saving salary structure:', err);
      setModalError(err.message || 'Failed to save salary structure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCatalogComponent = async (e) => {
    e.preventDefault();
    setCatalogModalError('');

    if (!newCompName.trim() || !newCompCode.trim()) {
      setCatalogModalError('Component Name and Code are required.');
      return;
    }

    setCatalogSubmitting(true);
    try {
      const saved = await apiFetch('/payroll/components/', {
        method: 'POST',
        body: JSON.stringify({
          name: newCompName.trim(),
          code: newCompCode.trim().toUpperCase(),
          component_type: newCompType,
          is_proratable: newCompType === 'Earning' ? newCompProratable : true,
          is_taxable: newCompTaxable,
          description: newCompDesc.trim(),
        })
      });

      setCatalogComponents(prev => [...prev, saved]);
      setShowCatalogModal(false);
      setNewCompName('');
      setNewCompCode('');
      setNewCompProratable(true);
      setNewCompDesc('');
      setSuccessMsg(`Component "${saved.name}" added to catalog.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error creating salary component:', err);
      setCatalogModalError(err.message || 'Failed to create component.');
    } finally {
      setCatalogSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ marginTop: '24px', padding: '32px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--primary-border, #e2e8f0)', borderTopColor: 'var(--primary, #3b82f6)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
        <span>Loading compensation profile...</span>
      </div>
    );
  }

  const active = salaryData?.active_structure;
  const history = salaryData?.history || [];
  const preview = calculatePreviewTotals();
  const currency = active?.currency || 'INR';

  return (
    <div className="panel salary-compensation-panel" style={{ marginTop: '24px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'flex', color: 'var(--primary, #3b82f6)', backgroundColor: 'var(--primary-light, #eff6ff)', padding: '8px', borderRadius: '8px' }}>
            <DollarIcon size={22} />
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Salary & Compensation Structure</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Contractual salary package, allowances, deductions, and revision timeline.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            href="/payroll/salaries"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>View Salary Directory →</span>
          </Link>
          {canManage && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCatalogModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusIcon size={14} />
                <span>New Component Catalog</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAssignModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <EditIcon size={14} />
                <span>{active ? 'Revise Salary' : 'Assign Salary Package'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="alert-box alert-box-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534' }}>
          <CheckIcon size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>
          <WarningIcon size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {!active ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--text-muted, #64748b)' }}>
            No active salary structure is assigned to this employee.
          </p>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAssignModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={16} />
              <span>Assign Initial Salary Structure</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active Structure KPI Grid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Pay Basis:</span>
            {active.compensation_type === 'HOURLY' ? (
              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                Hourly Wage
              </span>
            ) : active.compensation_type === 'DAILY' ? (
              <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                Daily Wage
              </span>
            ) : (
              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                Monthly Salary
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {active.compensation_type === 'HOURLY' ? (
              <>
                <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hourly Wage Rate</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#92400e', marginTop: '4px' }}>
                    {formatCurrency(active.hourly_rate || 0, currency)} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>/ hour</span>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Allowances</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                    {formatCurrency(active.gross_salary || 0, currency)}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Deductions</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                    -{formatCurrency(active.base_deductions || 0, currency)}
                  </div>
                </div>
              </>
            ) : active.compensation_type === 'DAILY' ? (
              <>
                <div style={{ padding: '16px 20px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Wage Rate</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0369a1', marginTop: '4px' }}>
                    {formatCurrency(active.daily_rate || 0, currency)} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>/ day</span>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Allowances</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                    {formatCurrency(active.gross_salary || 0, currency)}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Deductions</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                    -{formatCurrency(active.base_deductions || 0, currency)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Salary</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                    {formatCurrency(active.gross_salary || 0, currency)}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Deductions</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                    -{formatCurrency(active.base_deductions || 0, currency)}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Net Salary</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
                    {formatCurrency(active.base_net_salary || 0, currency)}
                  </div>
                </div>
              </>
            )}

            <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-card-nested, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effective From</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
                {active.effective_from}
              </div>
            </div>
          </div>

          {/* Component Breakdown Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            {/* Earnings Table */}
            <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                {active.compensation_type === 'HOURLY' || active.compensation_type === 'DAILY' ? 'Fixed Monthly Allowances' : 'Earnings Breakdown'}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Component</th>
                    <th style={{ padding: '10px 16px' }}>Code</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {(active.components || []).filter(c => c.component_type === 'Earning').length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                        {active.compensation_type === 'HOURLY' || active.compensation_type === 'DAILY' ? 'No additional fixed allowances' : 'No earnings components'}
                      </td>
                    </tr>
                  ) : (
                    (active.components || []).filter(c => c.component_type === 'Earning').map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: '600', color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}><code>{item.code}</code></td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                {active.compensation_type === 'HOURLY' || active.compensation_type === 'DAILY' ? 'Fixed Monthly Deductions' : 'Deductions Breakdown'}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Component</th>
                    <th style={{ padding: '10px 16px' }}>Code</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {(active.components || []).filter(c => c.component_type === 'Deduction').length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No fixed deductions configured</td>
                    </tr>
                  ) : (
                    (active.components || []).filter(c => c.component_type === 'Deduction').map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: '600', color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}><code>{item.code}</code></td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: '#b91c1c' }}>
                          - {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revision History Timeline */}
          {history.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '700' }}>Salary Revision History (Append-Only)</h4>
              <div className="table-container">
                <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Effective From</th>
                      <th>Pay Basis</th>
                      <th>Currency</th>
                      <th>Gross / Allowances</th>
                      <th>Deductions</th>
                      <th>Net / Rate</th>
                      <th>Notes / Reason</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((rev, idx) => {
                      const isCurrentRev = rev.id === active.id;
                      const isDaily = rev.compensation_type === 'DAILY';
                      const isHourly = rev.compensation_type === 'HOURLY';
                      return (
                        <tr key={idx} style={{ backgroundColor: isCurrentRev ? '#f8fafc' : 'transparent' }}>
                          <td>
                            <strong>{rev.effective_from}</strong>
                            {isCurrentRev && (
                              <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                                Active
                              </span>
                            )}
                          </td>
                          <td>
                            {isHourly ? (
                              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: '600' }}>
                                Hourly Wage ({formatCurrency(rev.hourly_rate || 0, rev.currency)}/hr)
                              </span>
                            ) : isDaily ? (
                              <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: '600' }}>
                                Daily Wage ({formatCurrency(rev.daily_rate || 0, rev.currency)}/d)
                              </span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '600' }}>
                                Monthly
                              </span>
                            )}
                          </td>
                          <td>{rev.currency}</td>
                          <td>{formatCurrency(rev.gross_salary, rev.currency)}</td>
                          <td style={{ color: '#b91c1c' }}>-{formatCurrency(rev.base_deductions, rev.currency)}</td>
                          <td style={{ fontWeight: '700', color: isHourly ? '#92400e' : isDaily ? '#0369a1' : '#15803d' }}>
                            {isHourly
                              ? `${formatCurrency(rev.hourly_rate || 0, rev.currency)}/hr`
                              : isDaily
                              ? `${formatCurrency(rev.daily_rate || 0, rev.currency)}/day`
                              : formatCurrency(rev.base_net_salary, rev.currency)}
                          </td>
                          <td>{rev.notes || '—'}</td>
                          <td>{rev.created_by_name || 'System Admin'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: Assign / Revise Salary via React Portal */}
      {mounted && showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="salary-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="salary-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowModal(false);
          }}
        >
          <div className="salary-modal-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveSalaryStructure} className="salary-modal-form">
              {/* Sticky Header */}
              <div className="salary-modal-header">
                <div className="salary-header-top">
                  <div>
                    <h3 id="salary-modal-title" className="salary-modal-title">
                      {active ? 'Revise Employee Salary Structure' : 'Assign Initial Salary Structure'}
                    </h3>
                    <p className="salary-modal-subtitle">
                      Configuring compensation for <strong style={{ color: '#1e293b' }}>{employeeName}</strong>. Revisions take effect from the 1st of the specified month and preserve historical records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="salary-modal-close-btn"
                    aria-label="Close modal"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body with Ref */}
              <div className="salary-modal-body" ref={modalBodyRef}>
                {modalError && (
                  <div className="salary-modal-alert">
                    <WarningIcon size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Pay Basis Selection */}
                <div className="salary-form-section">
                  <label className="salary-field-label">
                    Pay Basis *
                  </label>
                  <div className="salary-pay-basis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <button
                      type="button"
                      className={`btn salary-basis-btn ${compensationType === 'MONTHLY' ? 'btn-primary active' : 'btn-secondary'}`}
                      onClick={() => setCompensationType('MONTHLY')}
                    >
                      Monthly Salary
                    </button>
                    <button
                      type="button"
                      className={`btn salary-basis-btn ${compensationType === 'DAILY' ? 'btn-primary active' : 'btn-secondary'}`}
                      onClick={() => setCompensationType('DAILY')}
                    >
                      Daily Wage
                    </button>
                    <button
                      type="button"
                      className={`btn salary-basis-btn ${compensationType === 'HOURLY' ? 'btn-primary active' : 'btn-secondary'}`}
                      onClick={() => setCompensationType('HOURLY')}
                    >
                      Hourly Wage
                    </button>
                  </div>
                </div>

                {/* Hourly Rate Input for HOURLY compensation */}
                {compensationType === 'HOURLY' && (
                  <div className="salary-daily-rate-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                    <label className="salary-daily-rate-label" style={{ color: '#92400e' }}>
                      Hourly Wage Rate ({currency} / hour) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input salary-daily-rate-input"
                      placeholder="e.g. 250.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      required
                    />
                    <p className="salary-daily-rate-hint" style={{ color: '#b45309' }}>
                      Hourly wage earnings are calculated from finalized payable work hours.
                    </p>
                  </div>
                )}

                {/* Daily Rate Input for DAILY compensation */}
                {compensationType === 'DAILY' && (
                  <div className="salary-daily-rate-card">
                    <label className="salary-daily-rate-label">
                      Daily Wage Rate ({currency} / day) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input salary-daily-rate-input"
                      placeholder="e.g. 1500.00"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      required
                    />
                    <p className="salary-daily-rate-hint">
                      Daily wage earnings are calculated from finalized payable attendance days.
                    </p>
                  </div>
                )}

                {/* Effective Date */}
                <div className="salary-form-section">
                  <label className="salary-field-label">
                    Effective Date (Must be 1st of Month) *
                  </label>
                  <input
                    type="date"
                    className="form-input salary-date-input"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    required
                  />
                </div>

                {/* Components Dynamic Builder */}
                <div className="salary-form-section">
                  <div className="salary-components-header">
                    <label className="salary-field-label" style={{ margin: 0 }}>
                      {compensationType === 'HOURLY' || compensationType === 'DAILY' ? 'Fixed Monthly Allowances & Deductions (Optional)' : 'Salary Component Lines *'}
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddComponentRow}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PlusIcon size={14} />
                      <span>Add Component</span>
                    </button>
                  </div>

                  {componentsList.length === 0 ? (
                    <div className="salary-components-empty">
                      {compensationType === 'HOURLY' || compensationType === 'DAILY'
                        ? 'No fixed monthly allowances or deductions added.'
                        : 'No components added. Click "+ Add Component" to add Earnings or Deductions.'}
                    </div>
                  ) : (
                    <div className="salary-components-list">
                      {componentsList.map((row, idx) => {
                        const selectedComp = catalogComponents.find(c => String(c.id) === String(row.salary_component));
                        const isDeduction = selectedComp?.component_type === 'Deduction';
                        return (
                          <div key={idx} className="salary-component-row">
                            <select
                              className="form-input salary-component-select"
                              value={row.salary_component}
                              onChange={(e) => handleComponentChange(idx, 'salary_component', e.target.value)}
                            >
                              {catalogComponents.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.code}) - {c.component_type}
                                </option>
                              ))}
                            </select>

                            <div className="salary-component-amount-wrapper">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input salary-component-amount"
                                placeholder="0.00"
                                value={row.amount}
                                onChange={(e) => handleComponentChange(idx, 'amount', e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                required
                                style={{ color: isDeduction ? '#b91c1c' : '#0f172a' }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveComponentRow(idx)}
                              className="salary-component-remove-btn"
                              title="Remove Line"
                              aria-label={`Remove component line ${idx + 1}`}
                            >
                              <CloseIcon size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Real-time preview summary */}
                <div className="salary-form-section">
                  {compensationType === 'HOURLY' ? (
                    <div className="salary-preview-card daily" style={{ borderLeftColor: '#f59e0b' }}>
                      <div className="salary-preview-card-header">
                        <span className="salary-preview-title">Compensation Summary Preview</span>
                        <span className="salary-preview-badge daily" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Hourly Wage</span>
                      </div>
                      <div className="salary-preview-grid-daily">
                        <div className="salary-preview-item">
                          <span className="preview-label">Pay Basis:</span>
                          <span className="preview-value primary" style={{ color: '#92400e' }}>Hourly Wage</span>
                        </div>
                        <div className="salary-preview-item">
                          <span className="preview-label">Hourly Wage Rate:</span>
                          <span className="preview-value primary" style={{ color: '#92400e' }}>{currency} {parseFloat(hourlyRate || 0).toFixed(2)} / hour</span>
                        </div>
                        {preview.gross > 0 && (
                          <div className="salary-preview-item">
                            <span className="preview-label">Fixed Monthly Allowances:</span>
                            <span className="preview-value">{currency} {preview.gross.toFixed(2)}</span>
                          </div>
                        )}
                        {preview.deductions > 0 && (
                          <div className="salary-preview-item">
                            <span className="preview-label">Fixed Monthly Deductions:</span>
                            <span className="preview-value deduction">- {currency} {preview.deductions.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : compensationType === 'DAILY' ? (
                    <div className="salary-preview-card daily">
                      <div className="salary-preview-card-header">
                        <span className="salary-preview-title">Compensation Summary Preview</span>
                        <span className="salary-preview-badge daily">Daily Wage</span>
                      </div>
                      <div className="salary-preview-grid-daily">
                        <div className="salary-preview-item">
                          <span className="preview-label">Pay Basis:</span>
                          <span className="preview-value primary">Daily Wage</span>
                        </div>
                        <div className="salary-preview-item">
                          <span className="preview-label">Daily Wage Rate:</span>
                          <span className="preview-value primary">{currency} {parseFloat(dailyRate || 0).toFixed(2)} / day</span>
                        </div>
                        {preview.gross > 0 && (
                          <div className="salary-preview-item">
                            <span className="preview-label">Fixed Monthly Allowances:</span>
                            <span className="preview-value">{currency} {preview.gross.toFixed(2)}</span>
                          </div>
                        )}
                        {preview.deductions > 0 && (
                          <div className="salary-preview-item">
                            <span className="preview-label">Fixed Monthly Deductions:</span>
                            <span className="preview-value deduction">- {currency} {preview.deductions.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="salary-preview-card monthly">
                      <div className="salary-preview-card-header">
                        <span className="salary-preview-title">Compensation Summary Preview</span>
                        <span className="salary-preview-badge monthly">Monthly Salary</span>
                      </div>
                      <div className="salary-preview-grid-monthly">
                        <div className="salary-preview-item">
                          <span className="preview-label">Calculated Gross:</span>
                          <span className="preview-value">{currency} {preview.gross.toFixed(2)}</span>
                        </div>
                        <div className="salary-preview-item">
                          <span className="preview-label">Total Deductions:</span>
                          <span className="preview-value deduction">- {currency} {preview.deductions.toFixed(2)}</span>
                        </div>
                        <div className="salary-preview-item net-highlight">
                          <span className="preview-label net">Estimated Net Base:</span>
                          <span className="preview-value net">{formatCurrency(preview.net, currency)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="salary-form-section" style={{ marginBottom: 0 }}>
                  <label className="salary-field-label">
                    Revision Reason / Notes (Optional)
                  </label>
                  <textarea
                    className="form-input salary-notes-input"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Annual compensation review / Promotion package / Switched to Daily Wage"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="salary-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Structure...' : 'Confirm & Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: New Catalog Component via React Portal */}
      {mounted && showCatalogModal && typeof document !== 'undefined' && createPortal(
        <div
          className="salary-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !catalogSubmitting) setShowCatalogModal(false);
          }}
        >
          <div className="salary-modal-container catalog-modal-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateCatalogComponent} className="salary-modal-form">
              <div className="salary-modal-header">
                <div className="salary-header-top">
                  <h3 id="catalog-modal-title" className="salary-modal-title">Add Salary Component to Catalog</h3>
                  <button
                    type="button"
                    onClick={() => setShowCatalogModal(false)}
                    disabled={catalogSubmitting}
                    className="salary-modal-close-btn"
                    aria-label="Close modal"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>

              <div className="salary-modal-body">
                {catalogModalError && (
                  <div className="salary-modal-alert">
                    <WarningIcon size={16} />
                    <span>{catalogModalError}</span>
                  </div>
                )}

                <div className="salary-form-section">
                  <label className="salary-field-label">Component Name *</label>
                  <input
                    type="text"
                    className="form-input salary-date-input"
                    placeholder="e.g. Housing Allowance"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    required
                  />
                </div>

                <div className="salary-form-section">
                  <label className="salary-field-label">Unique Code *</label>
                  <input
                    type="text"
                    className="form-input salary-date-input"
                    placeholder="e.g. HOUSING"
                    value={newCompCode}
                    onChange={(e) => setNewCompCode(e.target.value.toUpperCase())}
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="salary-form-section">
                  <label className="salary-field-label">Component Type *</label>
                  <select
                    className="form-input salary-date-input"
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value)}
                  >
                    <option value="Earning">Earning (Gross Addition)</option>
                    <option value="Deduction">Deduction (Gross Reduction)</option>
                  </select>
                </div>

                {newCompType === 'Earning' && (
                  <div className="salary-form-section" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={newCompProratable}
                        onChange={(e) => setNewCompProratable(e.target.checked)}
                        style={{ accentColor: 'var(--primary, #0284c7)', width: '16px', height: '16px' }}
                      />
                      <span>Prorate for attendance / unpaid leave</span>
                    </label>
                    <p style={{ margin: '4px 0 0 24px', fontSize: '0.75rem', color: '#64748b' }}>
                      When enabled, unpaid absences and leaves reduce this earning proportionately. Fixed allowances (e.g. Housing) should leave this unchecked.
                    </p>
                  </div>
                )}

                <div className="salary-form-section" style={{ marginBottom: 0 }}>
                  <label className="salary-field-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="form-input salary-date-input"
                    placeholder="e.g. Monthly rent support"
                    value={newCompDesc}
                    onChange={(e) => setNewCompDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="salary-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCatalogModal(false)}
                  disabled={catalogSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={catalogSubmitting}
                >
                  {catalogSubmitting ? 'Saving...' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Responsive Scoped Modal Styles */}
      <style jsx global>{`
        .salary-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          min-height: 100vh !important;
          background-color: rgba(15, 23, 42, 0.7) !important;
          backdrop-filter: blur(4px) !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: clamp(8px, 2vw, 24px) !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        .salary-modal-container {
          background-color: #ffffff !important;
          border-radius: 14px !important;
          width: min(920px, calc(100vw - 48px)) !important;
          max-height: calc(100dvh - 48px) !important;
          display: flex !important;
          flex-direction: column !important;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35) !important;
          border: 1px solid #e2e8f0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          box-sizing: border-box !important;
        }

        @supports not (height: 100dvh) {
          .salary-modal-container {
            max-height: calc(100vh - 48px) !important;
          }
        }

        .catalog-modal-container {
          max-width: 520px !important;
        }

        .salary-modal-form {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          overflow: hidden !important;
          margin: 0 !important;
        }

        .salary-modal-header {
          flex: 0 0 auto !important;
          padding: 20px 24px 16px 24px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background-color: #ffffff !important;
        }

        .salary-header-top {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          gap: 16px !important;
        }

        .salary-modal-title {
          margin: 0 !important;
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #0f172a !important;
        }

        .salary-modal-subtitle {
          margin: 4px 0 0 0 !important;
          font-size: 0.85rem !important;
          color: #64748b !important;
          line-height: 1.4 !important;
        }

        .salary-modal-close-btn {
          background: #f1f5f9 !important;
          border: none !important;
          border-radius: 8px !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          color: #64748b !important;
          flex-shrink: 0 !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }

        .salary-modal-close-btn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }

        .salary-modal-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          padding: 20px 24px !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .salary-modal-alert {
          padding: 10px 14px !important;
          background-color: #fef2f2 !important;
          border: 1px solid #fecaca !important;
          border-radius: 8px !important;
          color: #991b1b !important;
          font-size: 0.85rem !important;
          margin-bottom: 16px !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .salary-form-section {
          margin-bottom: 18px !important;
        }

        .salary-field-label {
          display: block !important;
          font-weight: 600 !important;
          font-size: 0.85rem !important;
          color: #334155 !important;
          margin-bottom: 6px !important;
        }

        .salary-pay-basis-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 12px !important;
        }

        .salary-basis-btn {
          padding: 10px 16px !important;
          font-size: 0.88rem !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .salary-daily-rate-card {
          margin-bottom: 18px !important;
          padding: 14px 16px !important;
          background-color: #f0f9ff !important;
          border-radius: 8px !important;
          border: 1px solid #bae6fd !important;
        }

        .salary-daily-rate-label {
          display: block !important;
          font-weight: 700 !important;
          font-size: 0.9rem !important;
          color: #0369a1 !important;
          margin-bottom: 6px !important;
        }

        .salary-daily-rate-input {
          width: 100% !important;
          padding: 10px 14px !important;
          border-radius: 6px !important;
          border: 1px solid #7dd3fc !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          box-sizing: border-box !important;
        }

        .salary-daily-rate-hint {
          margin: 6px 0 0 0 !important;
          font-size: 0.78rem !important;
          color: #0284c7 !important;
        }

        .salary-date-input {
          width: 100% !important;
          padding: 9px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 0.88rem !important;
          box-sizing: border-box !important;
        }

        .salary-components-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 10px !important;
        }

        .salary-components-empty {
          font-size: 0.85rem !important;
          color: #94a3b8 !important;
          font-style: italic !important;
          padding: 12px 14px !important;
          background: #f8fafc !important;
          border-radius: 6px !important;
          border: 1px dashed #cbd5e1 !important;
        }

        .salary-components-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
        }

        .salary-component-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(140px, 190px) 40px !important;
          gap: 10px !important;
          align-items: center !important;
        }

        .salary-component-select {
          width: 100% !important;
          min-width: 0 !important;
          padding: 9px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 0.85rem !important;
          box-sizing: border-box !important;
        }

        .salary-component-amount-wrapper {
          width: 100% !important;
          min-width: 0 !important;
        }

        .salary-component-amount {
          width: 100% !important;
          min-width: 0 !important;
          padding: 9px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 0.88rem !important;
          font-weight: 600 !important;
          box-sizing: border-box !important;
        }

        .salary-component-remove-btn {
          background: #fee2e2 !important;
          border: none !important;
          color: #dc2626 !important;
          cursor: pointer !important;
          width: 40px !important;
          height: 38px !important;
          border-radius: 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: background-color 0.15s ease !important;
          flex-shrink: 0 !important;
        }

        .salary-component-remove-btn:hover {
          background: #fecaca !important;
        }

        .salary-preview-card {
          border-radius: 8px !important;
          padding: 14px 16px !important;
          font-size: 0.85rem !important;
          box-sizing: border-box !important;
        }

        .salary-preview-card.monthly {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }

        .salary-preview-card.daily {
          background-color: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
        }

        .salary-preview-card-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 12px !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
        }

        .salary-preview-title {
          font-weight: 700 !important;
          font-size: 0.82rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.03em !important;
          color: #64748b !important;
        }

        .salary-preview-badge {
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 2px 8px !important;
          border-radius: 4px !important;
        }

        .salary-preview-badge.monthly {
          background: #dcfce7 !important;
          color: #166534 !important;
        }

        .salary-preview-badge.daily {
          background: #e0f2fe !important;
          color: #0369a1 !important;
        }

        .salary-preview-grid-monthly {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 12px !important;
        }

        .salary-preview-grid-daily {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
          gap: 12px !important;
        }

        .salary-preview-item {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          background: #ffffff !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #f1f5f9 !important;
        }

        .salary-preview-item.net-highlight {
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
        }

        .preview-label {
          font-size: 0.78rem !important;
          color: #64748b !important;
        }

        .preview-label.net {
          color: #15803d !important;
          font-weight: 600 !important;
        }

        .preview-value {
          font-size: 0.95rem !important;
          font-weight: 700 !important;
          color: #0f172a !important;
        }

        .preview-value.primary {
          color: #0284c7 !important;
        }

        .preview-value.deduction {
          color: #b91c1c !important;
        }

        .preview-value.net {
          color: #15803d !important;
          font-size: 1.05rem !important;
        }

        .salary-notes-input {
          width: 100% !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 0.85rem !important;
          resize: vertical !important;
          box-sizing: border-box !important;
        }

        .salary-modal-footer {
          flex: 0 0 auto !important;
          padding: 16px 24px !important;
          border-top: 1px solid #f1f5f9 !important;
          background-color: #f8fafc !important;
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          gap: 10px !important;
        }

        /* Responsive Breakpoints */
        @media (max-width: 900px) {
          .salary-modal-overlay {
            padding: 16px !important;
          }
          .salary-modal-container {
            width: calc(100vw - 32px) !important;
          }
          .salary-component-row {
            grid-template-columns: minmax(0, 1fr) 160px 40px !important;
          }
          .salary-preview-grid-monthly {
            grid-template-columns: 1fr 1fr !important;
          }
          .salary-preview-item.net-highlight {
            grid-column: 1 / -1 !important;
          }
        }

        @media (max-width: 640px) {
          .salary-modal-overlay {
            padding: 8px !important;
          }
          .salary-modal-container {
            width: 100% !important;
            max-height: calc(100dvh - 16px) !important;
            border-radius: 12px !important;
          }
          .salary-modal-header {
            padding: 16px 16px 12px 16px !important;
          }
          .salary-modal-body {
            padding: 14px 16px !important;
          }
          .salary-modal-footer {
            padding: 12px 16px !important;
            flex-direction: column-reverse !important;
          }
          .salary-modal-footer button {
            width: 100% !important;
          }
          .salary-component-row {
            grid-template-columns: minmax(0, 1fr) 40px !important;
            gap: 6px !important;
            padding: 8px !important;
            background: #f8fafc !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .salary-component-select {
            grid-column: 1 / 3 !important;
          }
          .salary-component-amount-wrapper {
            grid-column: 1 / 2 !important;
          }
          .salary-component-remove-btn {
            grid-column: 2 / 3 !important;
          }
          .salary-preview-grid-monthly,
          .salary-preview-grid-daily {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .salary-modal-overlay {
            padding: 0 !important;
          }
          .salary-modal-container {
            width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .salary-pay-basis-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
