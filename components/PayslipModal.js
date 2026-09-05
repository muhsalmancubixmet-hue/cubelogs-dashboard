'use client';

import React from 'react';
import { DownloadIcon, CloseIcon, WarningIcon } from './Icons';
import { formatCurrency } from '@/lib/currency';

export default function PayslipModal({
  isOpen,
  onClose,
  payslipData,
  onDownloadPdf,
  isDownloading = false,
}) {
  if (!isOpen || !payslipData) return null;

  const snap = payslipData.payroll_snapshot || payslipData;
  const companyDetails = payslipData.company_details_snapshot || {};
  const employeeDetails = payslipData.employee_details_snapshot || {};
  const isSuperseded = payslipData.status === 'Superseded';
  const currency = payslipData.currency || snap.currency || 'INR';

  // Demographic details
  const companyName = payslipData.company_name_snapshot || companyDetails.name || 'Company';
  const employeeName = payslipData.employee_name || employeeDetails.name || snap.employee_name || 'Employee';
  const employeeCode = employeeDetails.employee_code || `EMP-${payslipData.employee || snap.employee || '0000'}`;
  const designation = payslipData.designation || employeeDetails.designation || snap.designation || 'Staff';
  const department = employeeDetails.department || '-';
  const joiningDate = employeeDetails.joining_date || '-';

  // Attendance metrics
  const attSnap = snap.attendance_summary_snapshot || {};
  const workingDays = attSnap.working_days !== undefined ? attSnap.working_days : (snap.working_days || 0);
  const presentDays = attSnap.present_days !== undefined ? attSnap.present_days : 0;
  const paidLeaves = attSnap.paid_leave_days !== undefined ? attSnap.paid_leave_days : (snap.paid_leave_days || 0);
  const unpaidLeaves = attSnap.unpaid_leave_days !== undefined ? attSnap.unpaid_leave_days : (snap.unpaid_leave_days || 0);
  const absentDays = attSnap.absent_days !== undefined ? attSnap.absent_days : (snap.absent_days || 0);
  const payableUnits = attSnap.payable_attendance_units !== undefined ? attSnap.payable_attendance_units : (snap.payable_attendance_units || 0);

  // Financial components
  const components = snap.salary_components_snapshot || [];
  const earnings = components.filter(c => c.component_type === 'Earning');
  const deductions = components.filter(c => c.component_type === 'Deduction');

  const earnedGross = snap.earned_gross !== undefined ? Number(snap.earned_gross) : 0;
  const additionalEarnings = snap.additional_earnings !== undefined ? Number(snap.additional_earnings) : 0;
  const totalGrossEarned = (earnedGross + additionalEarnings).toFixed(2);

  const baseFixedDeductions = snap.base_fixed_deductions !== undefined ? Number(snap.base_fixed_deductions) : 0;
  const attendanceDeduction = snap.attendance_deduction !== undefined ? Number(snap.attendance_deduction) : 0;
  const additionalDeductions = snap.additional_deductions !== undefined ? Number(snap.additional_deductions) : 0;
  const totalDeductions = snap.total_deductions !== undefined ? Number(snap.total_deductions).toFixed(2) : '0.00';
  const netPayable = snap.net_payable !== undefined ? Number(snap.net_payable).toFixed(2) : '0.00';

  const formatMoney = (val) => {
    return formatCurrency(val, currency);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const periodMonth = payslipData.month || (payslipData.payroll_period && payslipData.payroll_period.month);
  const periodYear = payslipData.year || (payslipData.payroll_period && payslipData.payroll_period.year);
  const monthName = payslipData.month_name || (periodMonth && periodYear ? `${monthNames[periodMonth - 1]} ${periodYear}` : 'Payroll Period');

  const isDaily = snap.compensation_type === 'DAILY';
  const isHourly = snap.compensation_type === 'HOURLY';
  const dailyRate = snap.daily_rate !== undefined ? Number(snap.daily_rate) : 0;
  const hourlyRate = snap.hourly_rate !== undefined ? Number(snap.hourly_rate) : 0;
  const payableHours = snap.payable_hours !== undefined ? Number(snap.payable_hours) : (attSnap.payable_work_hours !== undefined ? Number(attSnap.payable_work_hours) : 0);
  const calcBreakdown = snap.calculation_breakdown || {};
  const wageEarnings = calcBreakdown.wage_earnings !== undefined
    ? Number(calcBreakdown.wage_earnings)
    : (isHourly ? (payableHours * hourlyRate) : isDaily ? (Number(payableUnits) * dailyRate) : 0);

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="payslip-modal-overlay">
      <div className="modal-container payslip-modal-container" onClick={(e) => e.stopPropagation()} data-testid="payslip-modal-content">
        
        {/* Header */}
        <div className="payslip-modal-header">
          <div>
            <span className="payslip-company-title">{companyName}</span>
            <h2 className="payslip-doc-title">Official Salary Payslip</h2>
            <p className="payslip-sub-info">
              <span><strong>Period:</strong> {monthName}</span>
              <span className="separator">•</span>
              <span><strong>No:</strong> {payslipData.payslip_number || '-'}</span>
              <span className="separator">•</span>
              <span><strong>Rev:</strong> {payslipData.revision || 1}</span>
            </p>
          </div>
          <div className="header-right-actions">
            <span className={`badge ${isSuperseded ? 'badge-danger' : 'badge-success'}`}>
              {payslipData.status || 'Issued'}
            </span>
            {payslipData.payment_status && (
              <span className={`badge ${payslipData.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: '6px' }}>
                {payslipData.payment_status === 'Paid' ? '✓ Paid' : '● Unpaid'}
              </span>
            )}
            <button className="btn-close-icon" onClick={onClose} aria-label="Close Modal">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Superseded Warning Banner */}
        {isSuperseded && (
          <div className="superseded-banner" data-testid="superseded-warning">
            <WarningIcon size={20} />
            <div>
              <strong>SUPERSEDED HISTORICAL PAYSLIP</strong>
              <p>This payslip was generated from a previous payroll run that has since been reopened. It is for audit and record purposes only.</p>
            </div>
          </div>
        )}

        <div className="payslip-modal-body">
          {/* Employee Demographic Grid */}
          <div className="payslip-section-panel">
            <h4 className="section-label">Employee Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-key">Employee Name:</span>
                <span className="detail-val font-semibold">{employeeName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-key">Employee Code:</span>
                <span className="detail-val font-semibold">{employeeCode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-key">Designation:</span>
                <span className="detail-val">{designation}</span>
              </div>
              <div className="detail-item">
                <span className="detail-key">Department:</span>
                <span className="detail-val">{department}</span>
              </div>
              <div className="detail-item">
                <span className="detail-key">Pay Basis:</span>
                <span className="detail-val font-semibold" style={{ color: isHourly ? '#92400e' : isDaily ? '#0369a1' : 'inherit' }}>
                  {isHourly
                    ? `Hourly Wage (${formatMoney(hourlyRate)}/hr)`
                    : isDaily
                    ? `Daily Wage (${formatMoney(dailyRate)}/day)`
                    : 'Monthly Salary'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-key">Currency:</span>
                <span className="detail-val font-semibold">{currency}</span>
              </div>
            </div>
          </div>

          {/* Attendance Metrics Ribbon */}
          <div className="payslip-attendance-ribbon">
            <div className="att-box">
              <span className="att-label">Working Days</span>
              <span className="att-val">{workingDays}</span>
            </div>
            <div className="att-box">
              <span className="att-label">Present Days</span>
              <span className="att-val">{presentDays}</span>
            </div>
            <div className="att-box">
              <span className="att-label">Paid Leaves</span>
              <span className="att-val">{paidLeaves}</span>
            </div>
            <div className="att-box">
              <span className="att-label">Unpaid Days</span>
              <span className="att-val">{unpaidLeaves}</span>
            </div>
            <div className="att-box">
              <span className="att-label">Absent Days</span>
              <span className="att-val">{absentDays}</span>
            </div>
            <div className="att-box highlight">
              <span className="att-label">{isHourly ? 'Payable Hours' : 'Payable Units'}</span>
              <span className="att-val">{isHourly ? `${payableHours} hrs` : payableUnits}</span>
            </div>
          </div>

          {/* Side by Side Financials */}
          <div className="financial-columns-grid">
            {/* Earnings Column */}
            <div className="financial-column earnings-column">
              <div className="column-header">
                <span>EARNINGS</span>
                <span>AMOUNT</span>
              </div>
              <div className="column-body">
                {isHourly ? (
                  <>
                    <div className="line-row">
                      <span>Hourly Wage Earnings ({payableHours} hrs @ {formatMoney(hourlyRate)}/hr)</span>
                      <span className="font-mono">{formatMoney(wageEarnings)}</span>
                    </div>
                    {earnings.map((c, i) => (
                      <div key={i} className="line-row">
                        <span>{c.name} <span className="tag-fixed">(Fixed)</span></span>
                        <span className="font-mono">{formatMoney(c.amount)}</span>
                      </div>
                    ))}
                  </>
                ) : isDaily ? (
                  <>
                    <div className="line-row">
                      <span>Daily Wage Earnings ({payableUnits} days @ {formatMoney(dailyRate)}/day)</span>
                      <span className="font-mono">{formatMoney(wageEarnings)}</span>
                    </div>
                    {earnings.map((c, i) => (
                      <div key={i} className="line-row">
                        <span>{c.name} <span className="tag-fixed">(Fixed)</span></span>
                        <span className="font-mono">{formatMoney(c.amount)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  earnings.length > 0 ? (
                    earnings.map((c, i) => (
                      <div key={i} className="line-row">
                        <span>{c.name} {c.is_proratable && <span className="tag-prorated">(Prorated)</span>}</span>
                        <span className="font-mono">{formatMoney(c.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="line-row muted">
                      <span>Basic Earnings</span>
                      <span className="font-mono">{formatMoney(earnedGross)}</span>
                    </div>
                  )
                )}

                {additionalEarnings > 0 && (
                  <div className="line-row">
                    <span>Additional Earnings / Bonuses</span>
                    <span className="font-mono">{formatMoney(additionalEarnings)}</span>
                  </div>
                )}
              </div>
              <div className="column-footer">
                <span>TOTAL EARNED GROSS</span>
                <span className="font-mono font-bold">{formatMoney(totalGrossEarned)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="financial-column deductions-column">
              <div className="column-header">
                <span>DEDUCTIONS</span>
                <span>AMOUNT</span>
              </div>
              <div className="column-body">
                {deductions.map((c, i) => (
                  <div key={i} className="line-row">
                    <span>{c.name}</span>
                    <span className="font-mono text-danger">-{formatMoney(c.amount)}</span>
                  </div>
                ))}

                {!isDaily && !isHourly && attendanceDeduction > 0 && (
                  <div className="line-row">
                    <span>Attendance Deductions</span>
                    <span className="font-mono text-danger">-{formatMoney(attendanceDeduction)}</span>
                  </div>
                )}

                {additionalDeductions > 0 && (
                  <div className="line-row">
                    <span>Additional Deductions</span>
                    <span className="font-mono text-danger">-{formatMoney(additionalDeductions)}</span>
                  </div>
                )}

                {deductions.length === 0 && (isDaily || isHourly || attendanceDeduction === 0) && additionalDeductions === 0 && (
                  <div className="line-row muted">
                    <span>No Deductions</span>
                    <span className="font-mono">{formatMoney(0)}</span>
                  </div>
                )}
              </div>
              <div className="column-footer">
                <span>TOTAL DEDUCTIONS</span>
                <span className="font-mono font-bold text-danger">-{formatMoney(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Payable Highlight */}
          <div className="net-payable-card">
            <div>
              <span className="net-card-subtitle">NET SALARY PAYABLE</span>
              <p className="net-card-note">Final disbursement calculated for this payroll cycle</p>
            </div>
            <div className="net-amount-display">
              <span className="net-currency">{currency}</span>
              <span className="net-figure">{Number(netPayable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="payslip-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {onDownloadPdf && (
            <button
              type="button"
              className="btn btn-primary download-btn"
              onClick={() => onDownloadPdf(payslipData)}
              disabled={isDownloading}
            >
              <DownloadIcon size={16} />
              <span>{isDownloading ? 'Generating PDF...' : 'Download Official PDF'}</span>
            </button>
          )}
        </div>

      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .payslip-modal-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
        }

        .payslip-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .payslip-company-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }

        .payslip-doc-title {
          margin: 0 0 4px 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .payslip-sub-info {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .separator {
          color: var(--border);
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-close-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .btn-close-icon:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }

        .superseded-banner {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #991b1b;
        }

        .superseded-banner strong {
          font-size: 0.85rem;
          display: block;
        }

        .superseded-banner p {
          margin: 2px 0 0 0;
          font-size: 0.8rem;
          color: #b91c1c;
        }

        .payslip-modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .payslip-section-panel {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 18px;
        }

        .section-label {
          margin: 0 0 10px 0;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px 20px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }

        .detail-key {
          color: var(--text-secondary);
        }

        .detail-val {
          color: var(--text-primary);
        }

        .font-semibold {
          font-weight: 600;
        }

        .font-bold {
          font-weight: 700;
        }

        .font-mono {
          font-family: monospace;
        }

        .text-danger {
          color: #dc2626;
        }

        .payslip-attendance-ribbon {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 8px;
        }

        .att-box {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .att-box.highlight {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .att-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
        }

        .att-box.highlight .att-label {
          color: #1d4ed8;
        }

        .att-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .att-box.highlight .att-val {
          color: #1d4ed8;
        }

        .financial-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .financial-columns-grid {
            grid-template-columns: 1fr;
          }
        }

        .financial-column {
          border: 1px solid var(--border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .column-header {
          background: var(--surface-hover);
          border-bottom: 1px solid var(--border);
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .column-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-height: 90px;
        }

        .line-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .line-row.muted {
          color: var(--text-muted);
        }

        .tag-prorated {
          font-size: 0.7rem;
          color: #d97706;
          margin-left: 4px;
        }

        .column-footer {
          border-top: 1px solid var(--border);
          background: var(--surface-hover);
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }

        .net-payable-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1.5px solid #86efac;
          border-radius: 10px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .net-card-subtitle {
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #166534;
          display: block;
        }

        .net-card-note {
          margin: 2px 0 0 0;
          font-size: 0.75rem;
          color: #15803d;
        }

        .net-amount-display {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .net-currency {
          font-size: 0.95rem;
          font-weight: 700;
          color: #166534;
        }

        .net-figure {
          font-size: 1.6rem;
          font-weight: 800;
          color: #166534;
          font-family: monospace;
        }

        .payslip-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .download-btn {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
