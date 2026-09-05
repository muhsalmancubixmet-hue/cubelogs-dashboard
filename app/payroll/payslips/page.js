'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const response = await fetch(`/api/payroll/payslips/${payslipId}/pdf/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('PDF download failed');
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
      setErrorMsg(err.message || 'Failed to download PDF.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const response = await fetch(`/api/payroll/periods/${selectedYear}/${selectedMonth}/payslips/export-zip/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Payslips</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Admin payslip directory. Select a payroll period to view issued payslips.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href={`/payroll?year=${selectedYear}&month=${selectedMonth}`}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px', textDecoration: 'none' }}
          >
            ← Back to Monthly Payroll
          </Link>
          {/* Period selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="form-control"
            style={{ minWidth: '120px' }}
            aria-label="Select month"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="form-control"
            style={{ minWidth: '90px' }}
            aria-label="Select year"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* ZIP Export */}
          {canManage && hasIssuedPayslips && (
            <button
              className="btn btn-secondary"
              onClick={handleExportZip}
              disabled={isExportingZip}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              title="Download all issued payslips as ZIP"
            >
              <DownloadIcon size={16} />
              {isExportingZip ? 'Exporting…' : 'Export ZIP'}
            </button>
          )}
        </div>
      </div>

      {/* Search + status filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex' }}>
            <SearchIcon size={15} />
          </span>
          <input
            id="payslips-search"
            type="text"
            placeholder="Search by employee name or payslip number…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', width: '100%' }}
            className="form-control"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-control"
          style={{ minWidth: '130px' }}
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

      {/* Summary */}
      {!loading && payslips.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: payslips.length, color: 'var(--primary)' },
            { label: 'Issued', count: issuedPayslips.length, color: 'var(--success)' },
            { label: 'Superseded', count: payslips.filter(p => p.status === 'Superseded').length, color: 'var(--text-light)' },
          ].map(s => (
            <div key={s.label} className="panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Loading payslips for {MONTHS[selectedMonth - 1]} {selectedYear}…
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Employee','Payslip No.','Period','Net Payable','Currency','Revision','Status','Issued On','Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
                      {payslips.length === 0
                        ? `No payslips found for ${MONTHS[selectedMonth - 1]} ${selectedYear}.`
                        : 'No payslips match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const currency = p.currency || 'INR';
                    const isSuperseded = p.status === 'Superseded';
                    return (
                      <tr key={p.id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--surface-elevated)',
                        opacity: isSuperseded ? 0.6 : 1,
                      }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          <div>{p.employee_name || '—'}</div>
                          {p.designation && <div style={{ fontSize: '0.76rem', color: 'var(--text-light)', marginTop: '2px' }}>{p.designation}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-light)' }}>{p.payslip_number || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{MONTHS[p.month - 1]} {p.year}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatCurrency(Number(p.net_payable || 0), currency)}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-light)' }}>{currency}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-light)', textAlign: 'center' }}>r{p.revision || 1}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                            background: isSuperseded ? 'rgba(100,116,139,0.12)' : 'rgba(34,197,94,0.12)',
                            color: isSuperseded ? 'var(--text-light)' : 'var(--success)',
                          }}>
                            {p.status || 'Issued'}
                          </span>
                          {p.payment_status && (
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, marginLeft: '4px',
                              background: p.payment_status === 'Paid' ? 'rgba(22,101,52,0.12)' : 'rgba(180,83,9,0.12)',
                              color: p.payment_status === 'Paid' ? '#166534' : '#b45309',
                            }}>
                              {p.payment_status === 'Paid' ? '✓ Paid' : '● Unpaid'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{fmtDate(p.issued_at)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: '0.76rem', padding: '3px 10px' }}
                              onClick={() => handleViewPayslip(p.id)}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: '0.76rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleDownloadPdf(p.id)}
                              disabled={downloadingPdfId === p.id}
                            >
                              <DownloadIcon size={13} />
                              {downloadingPdfId === p.id ? '…' : 'PDF'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
              Showing {filtered.length} of {payslips.length} payslip{payslips.length !== 1 ? 's' : ''} for {MONTHS[selectedMonth - 1]} {selectedYear}
            </div>
          )}
        </div>
      )}

      {/* Payslip preview modal */}
      <PayslipModal
        isOpen={showPayslipModal}
        onClose={() => { setShowPayslipModal(false); setSelectedPayslipData(null); }}
        payslipData={selectedPayslipData}
        onDownloadPdf={() => selectedPayslipData && handleDownloadPdf(selectedPayslipData.id)}
        isDownloading={downloadingPdfId === selectedPayslipData?.id}
      />
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
