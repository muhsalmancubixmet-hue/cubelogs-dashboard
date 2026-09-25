'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloseIcon, 
  DownloadIcon, 
  WarningIcon, 
  CheckIcon, 
  BankIcon,
  ChevronIcon
} from '@/components/Icons';
import { apiFetch, getApiBaseUrl, getAccessToken, refreshAccessToken } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TEMPLATES = [
  { key: 'GENERIC_NEFT', name: 'Generic NEFT / Bulk Upload (Excel/CSV)', desc: 'Universal columns: Emp Code, Name, Account, IFSC, Net Amount, Mode, Remarks' },
  { key: 'HDFC', name: 'HDFC Bank NEFT/RTGS', desc: 'Standard HDFC corporate upload format' },
  { key: 'ICICI', name: 'ICICI Bank CMS/NEFT', desc: 'Corporate CMS upload with debit account & narration' },
  { key: 'SBI', name: 'State Bank of India CMP/NEFT', desc: 'SBI Cash Management Portal salary upload' },
];

export default function BankExportModal({
  isOpen,
  onClose,
  year,
  month,
  defaultDebitAccount = '',
  defaultBankTemplate = 'GENERIC_NEFT',
}) {
  const monthName = month && month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : '';
  const defaultRemarks = `Salary ${monthName} ${year}`;

  const [template, setTemplate] = useState(defaultBankTemplate || 'GENERIC_NEFT');
  const [format, setFormat] = useState('XLSX');
  const [debitAccount, setDebitAccount] = useState(defaultDebitAccount || '');
  const [remarks, setRemarks] = useState(defaultRemarks);

  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [precheckData, setPrecheckData] = useState(null);
  const [precheckError, setPrecheckError] = useState('');
  const [showUnpayableList, setShowUnpayableList] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  // Fetch pre-flight check when opened
  useEffect(() => {
    if (!isOpen || !year || !month) return;

    setExportError('');
    setExportSuccess('');
    setShowUnpayableList(false);

    const fetchPrecheck = async () => {
      setPrecheckLoading(true);
      setPrecheckError('');
      try {
        const data = await apiFetch(`/payroll/periods/${year}/${month}/export-bank-file/?precheck=true`);
        setPrecheckData(data);
        if (data.debit_account && !debitAccount) {
          setDebitAccount(data.debit_account);
        }
      } catch (err) {
        console.error('Failed to load bank export precheck:', err);
        setPrecheckError(err.message || 'Failed to validate period for bank export.');
      } finally {
        setPrecheckLoading(false);
      }
    };

    fetchPrecheck();
  }, [isOpen, year, month]);

  // Sync default remarks when year/month changes
  useEffect(() => {
    if (monthName && year) {
      setRemarks(`Salary ${monthName} ${year}`);
    }
  }, [year, monthName]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    if (isExporting) return;

    setIsExporting(true);
    setExportError('');
    setExportSuccess('');

    try {
      const baseUrl = getApiBaseUrl();
      let token = getAccessToken();
      const endpoint = `${baseUrl}/payroll/periods/${year}/${month}/export-bank-file/`;

      const payload = {
        template,
        format,
        debit_account: debitAccount.trim(),
        remarks: remarks.trim() || defaultRemarks,
      };

      let res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getAccessToken();
          res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { error: 'Failed to generate bank payment file.' };
        }
        throw new Error(errData.error || errData.detail || 'Export failed.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format.toLowerCase() === 'csv' ? 'csv' : 'xlsx';
      const padMonth = String(month).padStart(2, '0');
      const filename = `Bank_Payment_${template}_${year}_${padMonth}.${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(`Successfully downloaded ${filename}`);
      setTimeout(() => {
        setExportSuccess('');
      }, 4000);
    } catch (err) {
      console.error('Bank Export error:', err);
      setExportError(err.message || 'Failed to export bank payment file.');
    } finally {
      setIsExporting(false);
    }
  };

  const currency = precheckData?.currency || 'INR';
  const payableCount = precheckData?.total_payable_count ?? 0;
  const payableAmount = precheckData?.total_payable_amount ?? '0.00';
  const unpayableCount = precheckData?.unpayable_count ?? 0;
  const unpayableList = precheckData?.unpayable_employees || [];

  return (
    <div className="modal-overlay" onClick={isExporting ? undefined : onClose} data-testid="bank-export-modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '620px', width: '92%', padding: '24px', boxSizing: 'border-box' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-export-modal-title"
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #2563eb)' }}>
              <BankIcon size={22} />
            </div>
            <div>
              <h2 id="bank-export-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                Generate Bank Payment File
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {monthName} {year} Payroll Disbursement (NEFT / RTGS)
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            disabled={isExporting}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Pre-Check Summary Strip */}
        <div style={{ marginBottom: '18px' }}>
          {precheckLoading ? (
            <div style={{ padding: '16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Validating period and employee bank details...
            </div>
          ) : precheckError ? (
            <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', fontSize: '0.85rem' }}>
              <WarningIcon size={16} />
              <span>{precheckError}</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Payable Staff
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: '#15803d' }}>
                    {payableCount}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Net Disbursement
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                    {formatCurrency(payableAmount, currency)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Missing Bank Info
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: unpayableCount > 0 ? '#b45309' : 'var(--text-muted)' }}>
                    {unpayableCount}
                  </strong>
                </div>
              </div>

              {/* Expandable Unpayable Warning Banner */}
              {unpayableCount > 0 && (
                <div style={{ marginTop: '10px', border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#9a3412' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <WarningIcon size={15} style={{ color: '#ea580c' }} />
                      <span>
                        <strong>{unpayableCount} employee{unpayableCount > 1 ? 's' : ''}</strong> will be excluded from payout file due to missing bank account details.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUnpayableList(!showUnpayableList)}
                      style={{ background: 'transparent', border: 'none', color: '#c2410c', fontWeight: '600', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                    >
                      {showUnpayableList ? 'Hide details' : 'View list'}
                    </button>
                  </div>

                  {showUnpayableList && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fdba74' }}>
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        {unpayableList.map((emp, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            <strong>{emp.employee_name || emp.employee_code}</strong>: Missing{' '}
                            <span style={{ fontStyle: 'italic' }}>
                              {(emp.missing_fields || []).join(', ').replace(/_/g, ' ')}
                            </span>{' '}
                            (Net: {formatCurrency(emp.net_payable, currency)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback Alerts */}
        {exportSuccess && (
          <div className="alert-box alert-box-success" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '0.85rem' }}>
            <CheckIcon size={16} />
            <span>{exportSuccess}</span>
          </div>
        )}
        {exportError && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '0.85rem' }}>
            <WarningIcon size={16} />
            <span>{exportError}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleDownload}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Bank Template Selection */}
            <div>
              <label className="form-label" htmlFor="bank-template-select" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Bank Template / Format Specification
              </label>
              <select
                id="bank-template-select"
                className="form-input"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                disabled={isExporting}
                style={{ width: '100%' }}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                {TEMPLATES.find(t => t.key === template)?.desc}
              </span>
            </div>

            {/* File Format & Debit Account Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" htmlFor="file-format-select" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  File Format
                </label>
                <select
                  id="file-format-select"
                  className="form-input"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={isExporting}
                  style={{ width: '100%' }}
                >
                  <option value="XLSX">Excel Workbook (.xlsx) — Recommended</option>
                  <option value="CSV">Comma Separated Values (.csv)</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="debit-account-input" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Corporate Debit Account
                </label>
                <input
                  id="debit-account-input"
                  type="text"
                  className="form-input"
                  placeholder="Optional override"
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value.replace(/[\s-]/g, ''))}
                  disabled={isExporting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Payment Remarks */}
            <div>
              <label className="form-label" htmlFor="payment-remarks-input" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Payment Narration / Remarks
              </label>
              <input
                id="payment-remarks-input"
                type="text"
                className="form-input"
                placeholder={defaultRemarks}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={isExporting}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isExporting || precheckLoading || payableCount === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '170px', justifyContent: 'center' }}
            >
              <DownloadIcon size={15} />
              <span>{isExporting ? 'Generating Bank File...' : 'Download Payment File'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
