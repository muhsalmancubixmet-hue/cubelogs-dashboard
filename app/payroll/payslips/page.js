'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch, getApiBaseUrl, getAccessToken, refreshAccessToken } from '@/lib/api/apiClient';
import { formatCurrency } from '@/lib/currency';
import { SearchIcon, DownloadIcon } from '@/components/Icons';
import PayslipModal from '@/components/PayslipModal';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function AdminPayslipsContent() {
  const { currentUser, hasPermission } = useApp();

  const today = new Date();
  const defaultYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth();

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal / download
  const [selectedPayslipData, setSelectedPayslipData] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const canManage = currentUser?.isSuperAdmin || hasPermission('payroll:manage');

  const fetchPayslips = async () => {
    if (!canManage) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch(`/payroll/periods/${selectedYear}/${selectedMonth}/payslips/`);
      setPayslips(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load payslips for the selected period.');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear, selectedMonth]);

  const filtered = useMemo(() => {
    let list = payslips;
    if (statusFilter !== 'ALL') list = list.filter(p => p.status === statusFilter);
    const q = searchQuery.toLowerCase().trim();
    if (q) list = list.filter(p =>
      (p.employee_name || '').toLowerCase().includes(q) ||
      (p.payslip_number || '').toLowerCase().includes(q) ||
      (p.designation || '').toLowerCase().includes(q)
    );
    return list;
  }, [payslips, searchQuery, statusFilter]);

  const issuedPayslips = payslips.filter(p => p.status === 'Issued');
  const hasIssuedPayslips = issuedPayslips.length > 0;

  const handleViewPayslip = async (payslipId) => {
    try {
      const data = await apiFetch(`/payroll/payslips/${payslipId}/`);
      setSelectedPayslipData(data);
      setShowPayslipModal(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load payslip details.');
    }
  };

  const handleDownloadPdf = async (payslipId) => {
    if (!payslipId) return;
    setDownloadingPdfId(payslipId);
    try {
      const baseUrl = getApiBaseUrl();
      let token = getAccessToken();
      let response = await fetch(`${baseUrl}/payroll/payslips/${payslipId}/pdf/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getAccessToken();
          response = await fetch(`${baseUrl}/payroll/payslips/${payslipId}/pdf/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
        }
      }

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { detail: 'PDF download failed' };
        }
        throw new Error(errData.detail || 'PDF download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Failed to download PDF.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const baseUrl = getApiBaseUrl();
      let token = getAccessToken();
      let response = await fetch(`${baseUrl}/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getAccessToken();
          response = await fetch(`${baseUrl}/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'ZIP export failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslips_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP Export error:', err);
      setErrorMsg(err.message || 'ZIP export failed.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${MONTHS[dt.getMonth()].slice(0,3)} ${dt.getDate()}, ${dt.getFullYear()}`;
  };

  const yearOptions = [];
  for (let y = today.getFullYear() + 1; y >= 2022; y--) yearOptions.push(y);

  return (
    <div className="payroll-content-container">
      {/* Header */}
      <div className="payslips-header-row">
        <div className="payslips-title-wrap">
          <h2 className="payslips-main-title">Payslips</h2>
          <p className="payslips-header-caption">
            Admin payslip directory. Select a payroll period to view issued payslips.
          </p>
        </div>

        <div className="payslips-nav-controls">
          <Link
            href={`/payroll?year=${selectedYear}&month=${selectedMonth}`}
            className="btn btn-secondary payslips-back-btn"
          >
            ← Back to Monthly Payroll
          </Link>

          {/* Period selector */}
          <div className="payslips-period-bar">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="payslips-select"
              aria-label="Select month"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="payslips-select"
              aria-label="Select year"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* ZIP Export */}
          {canManage && hasIssuedPayslips && (
            <button
              type="button"
              className="btn btn-secondary payslips-export-btn"
              onClick={handleExportZip}
              disabled={isExportingZip}
              title="Download all issued payslips as ZIP"
            >
              <DownloadIcon size={14} />
              <span>{isExportingZip ? 'Exporting…' : 'Export ZIP'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search + status filter bar */}
      <div className="payslips-toolbar">
        <div className="payslips-search-wrap">
          <span className="payslips-search-icon">
            <SearchIcon size={15} />
          </span>
          <input
            id="payslips-search"
            type="text"
            placeholder="Search by employee name or payslip number…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-control payslips-search-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-control payslips-filter-select"
        >
          <option value="ALL">All Statuses</option>
          <option value="Issued">Issued</option>
          <option value="Superseded">Superseded</option>
        </select>
      </div>

      {errorMsg && (
        <div className="panel alert-box alert-box-danger" style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.88rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Summary KPI Cards */}
      {!loading && payslips.length > 0 && (
        <div className="payslips-summary-grid">
          {[
            { label: 'Total Payslips', count: payslips.length, cls: 'kpi-total' },
            { label: 'Issued', count: issuedPayslips.length, cls: 'kpi-issued' },
            { label: 'Superseded', count: payslips.filter(p => p.status === 'Superseded').length, cls: 'kpi-superseded' },
          ].map(s => (
            <div key={s.label} className={`payslip-summary-card ${s.cls}`}>
              <span className="summary-card-val">{s.count}</span>
              <span className="summary-card-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="panel payslips-loading-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <div style={{ width: '22px', height: '22px', border: '3px solid var(--primary-border, #bfdbfe)', borderTopColor: 'var(--primary, #2563eb)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span>Loading payslips for {MONTHS[selectedMonth - 1]} {selectedYear}…</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel payslips-empty-panel">
          <div className="payslips-empty-icon">📄</div>
          <p className="payslips-empty-title">
            {payslips.length === 0
              ? `No payslips found for ${MONTHS[selectedMonth - 1]} ${selectedYear}.`
              : 'No payslips match your filters.'}
          </p>
          <p className="payslips-empty-desc">
            {payslips.length === 0
              ? 'Finalize monthly payroll to generate and issue employee payslips.'
              : 'Try clearing the search query or changing status filters.'}
          </p>
          {payslips.length === 0 && (
            <Link
              href={`/payroll?year=${selectedYear}&month=${selectedMonth}`}
              className="btn btn-primary btn-sm payslips-empty-action-btn"
            >
              Go to Monthly Payroll →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (>768px) */}
          <div className="desktop-table-container panel">
            <div style={{ overflowX: 'auto' }}>
              <table className="payslips-table">
                <thead>
                  <tr>
                    {['Employee','Payslip No.','Period','Net Payable','Currency','Revision','Status','Issued On','Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => {
                    const currency = p.currency || 'INR';
                    const isSuperseded = p.status === 'Superseded';
                    return (
                      <tr key={p.id} className={idx % 2 === 0 ? '' : 'table-row-alt'} style={{ opacity: isSuperseded ? 0.6 : 1 }}>
                        <td>
                          <div className="emp-name">{p.employee_name || '—'}</div>
                          {p.designation && <div className="emp-desig">{p.designation}</div>}
                        </td>
                        <td className="payslip-num">{p.payslip_number || '—'}</td>
                        <td className="payslip-period">{MONTHS[p.month - 1]} {p.year}</td>
                        <td className="payslip-net">
                          {formatCurrency(Number(p.net_payable || 0), currency)}
                        </td>
                        <td className="payslip-currency">{currency}</td>
                        <td className="payslip-rev">r{p.revision || 1}</td>
                        <td>
                          <span className={`payslip-status-pill ${isSuperseded ? 'status-pill-superseded' : 'status-pill-issued'}`}>
                            {p.status || 'Issued'}
                          </span>
                          {p.payment_status && (
                            <span className={`payslip-pay-pill ${p.payment_status === 'Paid' ? 'pay-paid' : 'pay-unpaid'}`}>
                              {p.payment_status === 'Paid' ? '✓ Paid' : '● Unpaid'}
                            </span>
                          )}
                        </td>
                        <td className="payslip-issued-date">{fmtDate(p.issued_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleViewPayslip(p.id)}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDownloadPdf(p.id)}
                              disabled={downloadingPdfId === p.id}
                            >
                              <DownloadIcon size={12} />
                              <span>{downloadingPdfId === p.id ? '…' : 'PDF'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer-info">
              Showing {filtered.length} of {payslips.length} payslip{payslips.length !== 1 ? 's' : ''} for {MONTHS[selectedMonth - 1]} {selectedYear}
            </div>
          </div>

          {/* Mobile Cards View (<= 768px down to 300px) */}
          <div className="mobile-payslips-container">
            {filtered.map(p => {
              const currency = p.currency || 'INR';
              const isSuperseded = p.status === 'Superseded';
              return (
                <div key={p.id} className="mobile-payslip-card" style={{ opacity: isSuperseded ? 0.65 : 1 }}>
                  <div className="mp-header">
                    <div>
                      <div className="mp-emp-name">{p.employee_name || '—'}</div>
                      <div className="mp-emp-sub">
                        {p.designation ? `${p.designation} • ` : ''}Rev {p.revision || 1}
                      </div>
                    </div>
                    <div className="mp-status-wrap">
                      <span className={`payslip-status-pill ${isSuperseded ? 'status-pill-superseded' : 'status-pill-issued'}`}>
                        {p.status || 'Issued'}
                      </span>
                      {p.payment_status && (
                        <span className={`payslip-pay-pill ${p.payment_status === 'Paid' ? 'pay-paid' : 'pay-unpaid'}`}>
                          {p.payment_status === 'Paid' ? '✓ Paid' : '● Unpaid'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mp-amount-box">
                    <span className="mp-amount-lbl">Net Payable</span>
                    <span className="mp-amount-val">{formatCurrency(Number(p.net_payable || 0), currency)}</span>
                  </div>

                  <div className="mp-grid">
                    <div className="mp-grid-item">
                      <span className="mp-grid-lbl">Payslip #</span>
                      <span className="mp-grid-val">{p.payslip_number || '—'}</span>
                    </div>
                    <div className="mp-grid-item">
                      <span className="mp-grid-lbl">Issued On</span>
                      <span className="mp-grid-val">{fmtDate(p.issued_at)}</span>
                    </div>
                  </div>

                  <div className="mp-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mp-btn"
                      onClick={() => handleViewPayslip(p.id)}
                    >
                      View Payslip
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm mp-btn"
                      onClick={() => handleDownloadPdf(p.id)}
                      disabled={downloadingPdfId === p.id}
                    >
                      <DownloadIcon size={13} />
                      <span>{downloadingPdfId === p.id ? 'Downloading…' : 'Download PDF'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="mobile-footer-count">
              Showing {filtered.length} of {payslips.length} payslip{payslips.length !== 1 ? 's' : ''}
            </div>
          </div>
        </>
      )}

      {/* Payslip preview modal */}
      <PayslipModal
        isOpen={showPayslipModal}
        onClose={() => { setShowPayslipModal(false); setSelectedPayslipData(null); }}
        payslipData={selectedPayslipData}
        onDownloadPdf={() => selectedPayslipData && handleDownloadPdf(selectedPayslipData.id)}
        isDownloading={downloadingPdfId === selectedPayslipData?.id}
      />

      <style jsx>{`
        .payroll-content-container {
          padding: 20px 24px;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .payslips-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;
        }

        .payslips-title-wrap {
          flex: 1;
          min-width: 200px;
        }

        .payslips-main-title {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.02em;
        }

        .payslips-header-caption {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: var(--text-light, #64748b);
          line-height: 1.4;
        }

        .payslips-nav-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .payslips-back-btn {
          font-size: 0.82rem;
          padding: 6px 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .payslips-period-bar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 3px;
        }

        .payslips-select {
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid var(--border, #cbd5e1);
          background-color: var(--bg-card-nested, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 0.84rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .payslips-export-btn {
          font-size: 0.82rem;
          padding: 6px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        /* Toolbar */
        .payslips-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .payslips-search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .payslips-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light, #64748b);
          display: flex;
          pointer-events: none;
        }

        .payslips-search-input {
          padding-left: 32px;
          height: 38px;
          width: 100%;
          border-radius: 8px;
          font-size: 0.84rem;
        }

        .payslips-filter-select {
          height: 38px;
          min-width: 130px;
          border-radius: 8px;
          font-size: 0.84rem;
        }

        /* Summary Cards */
        .payslips-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .payslip-summary-card {
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-card-val {
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .summary-card-lbl {
          font-size: 0.74rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-light, #64748b);
        }

        .kpi-total .summary-card-val {
          color: var(--primary, #2563eb);
        }

        .kpi-issued .summary-card-val {
          color: #15803d;
        }

        .kpi-superseded .summary-card-val {
          color: #64748b;
        }

        /* Loading & Empty Panels */
        .payslips-loading-panel {
          padding: 40px 16px;
          text-align: center;
          color: var(--text-light, #64748b);
          font-size: 0.88rem;
          font-weight: 600;
          border-radius: 10px;
        }

        .payslips-empty-panel {
          text-align: center;
          padding: 36px 16px;
          background-color: var(--bg-card, #ffffff);
          border: 1px dashed var(--border, #cbd5e1);
          border-radius: 10px;
          box-sizing: border-box;
        }

        .payslips-empty-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .payslips-empty-title {
          margin: 0 0 6px;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
        }

        .payslips-empty-desc {
          margin: 0 0 14px;
          font-size: 0.82rem;
          color: var(--text-light, #64748b);
        }

        .payslips-empty-action-btn {
          font-size: 0.82rem;
          padding: 6px 14px;
          display: inline-flex;
          align-items: center;
          font-weight: 600;
        }

        /* Desktop Table */
        .desktop-table-container {
          display: block;
          border-radius: 10px;
          border: 1px solid var(--border, #e2e8f0);
          overflow: hidden;
          background-color: var(--bg-card, #ffffff);
        }

        .payslips-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
          text-align: left;
        }

        .payslips-table thead tr {
          background-color: var(--bg-card-nested, #f8fafc);
          border-bottom: 2px solid var(--border, #e2e8f0);
        }

        .payslips-table th {
          padding: 12px 14px;
          font-weight: 700;
          color: var(--text-light, #64748b);
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .payslips-table tbody tr {
          border-bottom: 1px solid var(--border, #f1f5f9);
          transition: background-color 0.15s ease;
        }

        .payslips-table tbody tr:hover {
          background-color: var(--bg-active, #f8fafc);
        }

        .table-row-alt {
          background-color: rgba(0, 0, 0, 0.015);
        }

        .payslips-table td {
          padding: 12px 14px;
          vertical-align: middle;
        }

        .emp-name {
          font-weight: 700;
          color: var(--text-primary, #0f172a);
        }

        .emp-desig {
          font-size: 0.74rem;
          color: var(--text-light, #64748b);
          margin-top: 2px;
        }

        .payslip-num {
          font-family: monospace;
          font-size: 0.82rem;
          color: var(--text-light, #64748b);
        }

        .payslip-period {
          white-space: nowrap;
          color: var(--text-light, #64748b);
        }

        .payslip-net {
          font-weight: 800;
          color: #15803d;
          font-size: 0.92rem;
        }

        .payslip-currency, .payslip-rev, .payslip-issued-date {
          color: var(--text-light, #64748b);
        }

        .payslip-status-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .status-pill-issued {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .status-pill-superseded {
          background-color: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .payslip-pay-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          margin-left: 4px;
          line-height: 1.2;
        }

        .pay-paid {
          background-color: rgba(22, 163, 74, 0.12);
          color: #166534;
          border: 1px solid rgba(22, 163, 74, 0.25);
        }

        .pay-unpaid {
          background-color: rgba(217, 119, 6, 0.12);
          color: #b45309;
          border: 1px solid rgba(217, 119, 6, 0.25);
        }

        .table-footer-info {
          padding: 10px 14px;
          font-size: 0.8rem;
          color: var(--text-light, #64748b);
          border-top: 1px solid var(--border, #e2e8f0);
          background-color: var(--bg-card-nested, #f8fafc);
        }

        /* Mobile Cards (<= 768px) */
        .mobile-payslips-container {
          display: none;
          flex-direction: column;
          gap: 10px;
        }

        .mobile-payslip-card {
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 14px 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .mp-emp-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          word-break: break-word;
        }

        .mp-emp-sub {
          font-size: 0.74rem;
          color: var(--text-light, #64748b);
          margin-top: 1px;
        }

        .mp-status-wrap {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .mp-amount-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: var(--bg-card-nested, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
        }

        .mp-amount-lbl {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-light, #64748b);
        }

        .mp-amount-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: #15803d;
        }

        .mp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          font-size: 0.78rem;
        }

        .mp-grid-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .mp-grid-lbl {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-light, #64748b);
        }

        .mp-grid-val {
          font-weight: 600;
          color: var(--text-primary, #0f172a);
          font-family: monospace;
          word-break: break-all;
        }

        .mp-actions {
          display: flex;
          gap: 8px;
          margin-top: 2px;
        }

        .mp-btn {
          flex: 1;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.82rem;
          font-weight: 600;
          border-radius: 8px;
        }

        .mobile-footer-count {
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-light, #64748b);
          padding: 6px 0;
        }

        /* ---------------------------------------------------- */
        /* Tablet & Mobile Breakpoints                          */
        /* ---------------------------------------------------- */
        @media (max-width: 768px) {
          .desktop-table-container {
            display: none !important;
          }
          .mobile-payslips-container {
            display: flex !important;
          }
          .payroll-content-container {
            padding: 14px 12px;
          }
        }

        @media (max-width: 640px) {
          .payslips-header-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .payslips-nav-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            width: 100%;
          }
          .payslips-back-btn {
            width: 100%;
            justify-content: center;
            height: 36px;
          }
          .payslips-period-bar {
            width: 100%;
            display: flex;
            box-sizing: border-box;
          }
          .payslips-select {
            flex: 1;
            min-width: 0;
          }
          .payslips-export-btn {
            width: 100%;
            justify-content: center;
            height: 36px;
          }
          .payslips-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .payslips-search-wrap,
          .payslips-filter-select {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .payroll-content-container {
            padding: 10px 8px !important;
          }
          .payslips-main-title {
            font-size: 1.15rem !important;
          }
          /* Omit verbose captions on mobile as requested */
          .payslips-header-caption {
            display: none !important;
          }
          .payslips-summary-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }
          .payslip-summary-card {
            padding: 8px 10px !important;
          }
          .summary-card-val {
            font-size: 1.15rem !important;
          }
          .mobile-payslip-card {
            padding: 12px 10px !important;
            gap: 8px !important;
          }
          .mp-amount-val {
            font-size: 1.05rem !important;
          }
          .payslips-empty-panel {
            padding: 24px 12px !important;
          }
        }

        /* 300px base screen */
        @media (max-width: 360px) {
          .payroll-content-container {
            padding: 6px 4px !important;
          }
          .payslips-main-title {
            font-size: 1.05rem !important;
          }
          .payslips-summary-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
          .mobile-payslip-card {
            padding: 10px 8px !important;
            border-radius: 8px !important;
          }
          .mp-actions {
            flex-direction: column;
            gap: 6px;
          }
          .mp-btn {
            width: 100%;
          }
          .payslips-empty-panel {
            padding: 18px 8px !important;
          }
        }

        /* ---------------------------------------------------- */
        /* Dark Mode Theming (Night Mode)                       */
        /* ---------------------------------------------------- */
        :global(:root.dark) .payslip-summary-card,
        :global(:root.dark) .desktop-table-container,
        :global(:root.dark) .mobile-payslip-card,
        :global(:root.dark) .payslips-empty-panel,
        :global(:root.dark) .payslips-loading-panel {
          background-color: var(--bg-card, #1e293b) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payslips-main-title {
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payslips-header-caption {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .payslips-period-bar {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-color: var(--border, #334155) !important;
        }

        :global(:root.dark) .payslips-select,
        :global(:root.dark) .payslips-search-input,
        :global(:root.dark) .payslips-filter-select {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payslips-empty-title {
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .payslips-empty-desc {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .kpi-issued .summary-card-val {
          color: #4ade80 !important;
        }

        :global(:root.dark) .kpi-total .summary-card-val {
          color: #60a5fa !important;
        }

        :global(:root.dark) .kpi-superseded .summary-card-val {
          color: #94a3b8 !important;
        }

        /* Desktop table dark mode */
        :global(:root.dark) .payslips-table thead tr {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-bottom-color: var(--border, #334155) !important;
        }

        :global(:root.dark) .payslips-table th {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .payslips-table tbody tr {
          border-bottom-color: var(--border, #334155) !important;
        }

        :global(:root.dark) .payslips-table tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
        }

        :global(:root.dark) .table-row-alt {
          background-color: rgba(0, 0, 0, 0.2) !important;
        }

        :global(:root.dark) .emp-name {
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .emp-desig {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .payslip-net {
          color: #4ade80 !important;
        }

        :global(:root.dark) .table-footer-info {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-top-color: var(--border, #334155) !important;
          color: var(--text-muted, #94a3b8) !important;
        }

        /* Mobile cards dark mode */
        :global(:root.dark) .mp-emp-name {
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .mp-emp-sub {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .mp-amount-box {
          background-color: rgba(15, 23, 42, 0.8) !important;
          border-color: var(--border, #334155) !important;
        }

        :global(:root.dark) .mp-amount-val {
          color: #4ade80 !important;
        }

        :global(:root.dark) .mp-grid-val {
          color: var(--text-main, #f8fafc) !important;
        }

        :global(:root.dark) .mp-grid-lbl {
          color: var(--text-muted, #94a3b8) !important;
        }

        :global(:root.dark) .status-pill-issued {
          background-color: rgba(22, 163, 74, 0.2) !important;
          color: #4ade80 !important;
          border-color: rgba(74, 222, 128, 0.35) !important;
        }

        :global(:root.dark) .status-pill-superseded {
          background-color: rgba(51, 65, 85, 0.5) !important;
          color: #cbd5e1 !important;
          border-color: #475569 !important;
        }

        :global(:root.dark) .pay-paid {
          background-color: rgba(22, 163, 74, 0.2) !important;
          color: #4ade80 !important;
          border-color: rgba(74, 222, 128, 0.35) !important;
        }

        :global(:root.dark) .pay-unpaid {
          background-color: rgba(217, 119, 6, 0.2) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.35) !important;
        }
      `}</style>
    </div>
  );
}

export default function AdminPayslipsPage() {
  return (
    <PageWrapper
      title="Payslips"
      requiredPermission={['payroll:view', 'payroll:manage']}
    >
      <AdminPayslipsContent />
    </PageWrapper>
  );
}
