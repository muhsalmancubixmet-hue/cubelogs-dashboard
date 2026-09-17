'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarIcon, 
  CheckIcon, 
  WarningIcon, 
  EditIcon, 
  CloseIcon 
} from '@/components/Icons';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  AED: 'AED',
  SAR: 'SAR',
  EUR: '€',
  GBP: '£'
};

const PRORATION_LABELS = {
  WORKING_DAYS: 'Working Days',
  CALENDAR_DAYS: 'Calendar Days',
  FIXED_30: 'Fixed 30 Days'
};

export default function PayrollSettingsTab({
  payrollConfig,
  setPayrollConfig,
  payrollConfigLoading,
  payrollConfigSuccess,
  payrollConfigError,
  handleSavePayrollConfig,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const onFormSubmit = async (e) => {
    await handleSavePayrollConfig(e);
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  const renderConfigForm = (isModal = false) => (
    <form onSubmit={onFormSubmit} className="settings-form">
      <div className="form-grid-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-payroll-currency" : "payroll-currency"}>
            Payroll Currency
          </label>
          {!isModal && (
            <p className="form-desc">
              Source of truth currency for newly created salary structures and payroll cycles.
            </p>
          )}
          <select
            id={isModal ? "modal-payroll-currency" : "payroll-currency"}
            className="form-input"
            value={payrollConfig.payroll_currency}
            onChange={(e) => setPayrollConfig(prev => ({ ...prev, payroll_currency: e.target.value }))}
            disabled={payrollConfigLoading}
          >
            <option value="INR">INR — Indian Rupee (₹)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="AED">AED — UAE Dirham (AED)</option>
            <option value="SAR">SAR — Saudi Riyal (SAR)</option>
            <option value="EUR">EUR — Euro (€)</option>
            <option value="GBP">GBP — British Pound (£)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-proration-basis" : "proration-basis"}>
            Proration Basis (Monthly Salary)
          </label>
          {!isModal && (
            <p className="form-desc">
              Divisor used to calculate daily rate from contractual basic salary.
            </p>
          )}
          <select
            id={isModal ? "modal-proration-basis" : "proration-basis"}
            className="form-input"
            value={payrollConfig.payroll_proration_basis}
            onChange={(e) => setPayrollConfig(prev => ({ ...prev, payroll_proration_basis: e.target.value }))}
            disabled={payrollConfigLoading}
          >
            <option value="WORKING_DAYS">Working Days (Dynamic working days)</option>
            <option value="CALENDAR_DAYS">Calendar Days (All days: 28-31)</option>
            <option value="FIXED_30">Fixed 30 Days (Standard 30-day divisor)</option>
          </select>
        </div>
      </div>

      {/* Checkbox toggles row */}
      <div className="toggle-group-row">
        <div className="toggle-card">
          <label className="toggle-card-label" htmlFor={isModal ? "modal-daily-wage-paid-leave" : "daily-wage-paid-leave"}>
            <input
              type="checkbox"
              id={isModal ? "modal-daily-wage-paid-leave" : "daily-wage-paid-leave"}
              checked={payrollConfig.daily_wage_paid_leave_eligible}
              onChange={(e) => setPayrollConfig(prev => ({ ...prev, daily_wage_paid_leave_eligible: e.target.checked }))}
              disabled={payrollConfigLoading}
              className="toggle-checkbox"
            />
            <div className="toggle-text-block">
              <span className="toggle-main-title">Daily Wage Paid Leave</span>
              {!isModal && (
                <span className="toggle-sub-desc">
                  Approved paid leave is paid at daily wage rate.
                </span>
              )}
            </div>
          </label>
        </div>

        <div className="toggle-card">
          <label className="toggle-card-label" htmlFor={isModal ? "modal-hourly-wage-paid-leave" : "hourly-wage-paid-leave"}>
            <input
              type="checkbox"
              id={isModal ? "modal-hourly-wage-paid-leave" : "hourly-wage-paid-leave"}
              checked={payrollConfig.hourly_wage_paid_leave_eligible}
              onChange={(e) => setPayrollConfig(prev => ({ ...prev, hourly_wage_paid_leave_eligible: e.target.checked }))}
              disabled={payrollConfigLoading}
              className="toggle-checkbox"
            />
            <div className="toggle-text-block">
              <span className="toggle-main-title">Hourly Wage Paid Leave</span>
              {!isModal && (
                <span className="toggle-sub-desc">
                  Scheduled paid leave hours are included in payable work hours.
                </span>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Desktop Contextual Guidance Box */}
      {!isModal && (
        <div className="desktop-guidance-box">
          <div className="guidance-title">
            Policy Reference & Examples:
          </div>
          <ul className="guidance-list">
            <li>
              <strong>Working Days:</strong> Monthly salary divided by actual working days (e.g. ₹30,000 / 22 = ₹1,363.64/day).
            </li>
            <li>
              <strong>Calendar Days:</strong> Monthly salary divided by total calendar days (e.g. ₹30,000 / 31 = ₹967.74/day).
            </li>
            <li>
              <strong>Fixed 30 Days:</strong> Monthly salary always divided by 30 (e.g. ₹30,000 / 30 = ₹1,000.00/day).
            </li>
          </ul>
        </div>
      )}

      {payrollConfigSuccess && (
        <div className="tab-alert success" style={{ marginBottom: '14px' }}>
          <CheckIcon size={14} />
          <span>{payrollConfigSuccess}</span>
        </div>
      )}
      {payrollConfigError && (
        <div className="tab-alert error" style={{ marginBottom: '14px' }}>
          <WarningIcon size={14} />
          <span>{payrollConfigError}</span>
        </div>
      )}

      <div className="form-actions-row" style={{ marginTop: '12px' }}>
        <button type="submit" className="btn btn-primary submit-payroll-btn" disabled={payrollConfigLoading}>
          {payrollConfigLoading ? 'Saving Settings...' : 'Save Payroll Settings'}
        </button>
      </div>
    </form>
  );

  const currSymbol = CURRENCY_SYMBOLS[payrollConfig.payroll_currency] || payrollConfig.payroll_currency;
  const prorationLabel = PRORATION_LABELS[payrollConfig.payroll_proration_basis] || payrollConfig.payroll_proration_basis;

  return (
    <div className="payroll-settings-root">
      {/* Mobile-First Policy Summary Card (Visible on mobile <= 992px) */}
      <div className="panel settings-panel-card mobile-summary-panel">
        <div className="payroll-header-row">
          <div className="payroll-header-title">
            <DollarIcon size={18} style={{ color: 'var(--primary, #2563eb)' }} />
            <h3 className="panel-heading">Payroll Settings</h3>
            <span className="currency-pill">{payrollConfig.payroll_currency} ({currSymbol})</span>
          </div>
          <button
            type="button"
            className="btn btn-primary edit-payroll-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <EditIcon size={13} />
            <span>Configure</span>
          </button>
        </div>

        {/* Quick Metric Pills Grid (Shrunk for 300px mobile view) */}
        <div className="payroll-metrics-grid">
          <div className="metric-box">
            <span className="metric-title">Currency</span>
            <span className="metric-val">{payrollConfig.payroll_currency} ({currSymbol})</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Proration Basis</span>
            <span className="metric-val">{prorationLabel}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Daily Wage Leave</span>
            <span className={`metric-badge ${payrollConfig.daily_wage_paid_leave_eligible ? 'active' : 'inactive'}`}>
              {payrollConfig.daily_wage_paid_leave_eligible ? 'Paid' : 'Unpaid'}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Hourly Wage Leave</span>
            <span className={`metric-badge ${payrollConfig.hourly_wage_paid_leave_eligible ? 'active' : 'inactive'}`}>
              {payrollConfig.hourly_wage_paid_leave_eligible ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        <div className="payroll-footer-row">
          <span className="footer-note">Applies to newly computed pay cycles & salary structures.</span>
        </div>
      </div>

      {/* Desktop View: Side-by-Side Grid */}
      <div className="settings-grid desktop-only-grid">
        {/* Left: Form Card */}
        <div className="panel settings-panel-card desktop-form-panel">
          <h3 className="desktop-card-title">
            <DollarIcon size={18} style={{ color: 'var(--primary)' }} />
            <span>Payroll & Currency Settings</span>
          </h3>
          {renderConfigForm(false)}
        </div>

        {/* Right: Info Explanation Card */}
        <div className="panel settings-panel-card desktop-info-panel">
          <h3 className="desktop-card-title">How Payroll Policies Work</h3>
          <div className="info-cards-col">
            <div className="info-card info-blue">
              <strong className="info-card-header">
                <span className="info-emoji">₹</span> Organization Payroll Currency
              </strong>
              <p className="info-card-text">
                Controls the default currency for the entire organization. Historical finalized payroll periods and issued payslips remain frozen in their original currency.
              </p>
            </div>
            <div className="info-card info-yellow">
              <strong className="info-card-header">
                <span className="info-emoji">➗</span> Proration Basis
              </strong>
              <p className="info-card-text">
                Working Days calculates daily rate as Proratable Gross divided by working days (excluding weekly offs and holidays). Calendar Days divides by total days in the month.
              </p>
            </div>
            <div className="info-card info-purple">
              <strong className="info-card-header">
                <span className="info-emoji">⏱️</span> Wage-Based Paid Leaves
              </strong>
              <p className="info-card-text">
                Determines whether non-contractual (Daily/Hourly) workers receive compensation during approved leave days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Modal Popup Dialog */}
      {isModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="custom-modal-card payroll-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-payroll-title"
          >
            <div className="modal-header">
              <div className="header-title-group">
                <DollarIcon size={17} style={{ color: 'var(--primary, #2563eb)' }} />
                <h3 id="modal-payroll-title" className="modal-title">
                  Configure Payroll Settings
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body-scrollable">
              {renderConfigForm(true)}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .payroll-settings-root {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .panel-heading {
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
          margin: 0;
        }

        .payroll-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 8px;
          flex-wrap: wrap;
        }

        .payroll-header-title {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .currency-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 9999px;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          border: 1px solid var(--primary-border, #bfdbfe);
          line-height: 1.3;
        }

        .edit-payroll-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }

        .payroll-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .metric-box {
          background: var(--bg-app, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .metric-title {
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric-val {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main, #0f172a);
          white-space: nowrap;
        }

        .metric-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }

        .metric-badge.active {
          background: #dcfce7;
          color: #15803d;
        }

        .metric-badge.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .payroll-footer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px dashed var(--border, #e2e8f0);
        }

        .footer-note {
          font-size: 0.72rem;
          color: var(--text-muted, #64748b);
          font-style: italic;
        }

        /* Form styling */
        .form-grid-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .form-desc {
          font-size: 0.76rem;
          color: var(--text-muted);
          margin-bottom: 6px;
          opacity: 0.75;
          line-height: 1.35;
        }

        .toggle-group-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .toggle-card {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 10px 12px;
          background: var(--bg-app, #f8fafc);
        }

        .toggle-card-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          margin: 0;
        }

        .toggle-checkbox {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .toggle-text-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .toggle-main-title {
          font-size: 0.82rem;
          font-weight: 650;
          color: var(--text-main);
          line-height: 1.3;
        }

        .toggle-sub-desc {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.3;
          opacity: 0.8;
        }

        .desktop-guidance-box {
          background-color: var(--bg-app, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .guidance-title {
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text-main);
        }

        .guidance-list {
          margin: 0;
          padding-left: 18px;
          line-height: 1.5;
        }

        .submit-payroll-btn {
          width: 100%;
          padding: 8px 16px;
          font-size: 0.84rem;
          font-weight: 600;
          border-radius: 6px;
        }

        /* Desktop Card Layout */
        .desktop-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.96rem;
          font-weight: 700;
          margin: 0 0 14px 0;
        }

        .info-cards-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .info-card {
          padding: 12px;
          border-radius: 8px;
        }

        .info-blue {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .info-yellow {
          background: rgba(234, 179, 8, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.2);
        }

        .info-purple {
          background: rgba(147, 51, 234, 0.08);
          border: 1px solid rgba(147, 51, 234, 0.2);
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          font-size: 0.82rem;
        }

        .info-emoji {
          font-size: 0.95rem;
        }

        .info-card-text {
          font-size: 0.76rem;
          line-height: 1.45;
          margin: 0;
          color: var(--text-main);
        }

        /* Modal Dialog */
        .custom-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(7, 15, 35, 0.72);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          animation: modalFadeIn 0.18s ease;
        }

        .custom-modal-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #d2e0f5);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 20px 30px rgba(0, 0, 0, 0.25);
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: modalScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .payroll-modal-card {
          max-width: 500px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, #d2e0f5);
          background: var(--bg-card, #ffffff);
        }

        .header-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-title {
          margin: 0;
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.15rem;
          color: var(--text-light, #64748b);
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.15s ease;
          line-height: 1;
        }

        .modal-close-btn:hover {
          background: var(--bg-app, #f4f7fc);
          color: var(--text-main, #0c1e3d);
        }

        .modal-body-scrollable {
          padding: 14px 16px;
          overflow-y: auto;
          flex: 1;
          background: var(--bg-card, #ffffff);
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (min-width: 993px) {
          .mobile-summary-panel {
            display: none !important;
          }
        }

        @media (max-width: 992px) {
          .desktop-only-grid {
            display: none !important;
          }
          .mobile-summary-panel {
            display: block !important;
          }
        }

        @media (max-width: 480px) {
          .mobile-summary-panel {
            padding: 10px 10px !important;
          }
          .payroll-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
          .metric-box {
            padding: 6px 8px !important;
          }
          .metric-title {
            font-size: 0.64rem !important;
          }
          .metric-val {
            font-size: 0.8rem !important;
          }
          .custom-modal-backdrop {
            padding: 6px !important;
          }
          .modal-header {
            padding: 10px 12px !important;
          }
          .modal-body-scrollable {
            padding: 12px 10px !important;
          }
          .form-grid-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .toggle-group-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .toggle-card {
            padding: 8px 10px !important;
          }
        }

        @media (max-width: 320px) {
          .payroll-metrics-grid {
            grid-template-columns: 1fr !important;
          }
          .custom-modal-backdrop {
            padding: 4px !important;
          }
          .modal-header {
            padding: 8px 10px !important;
          }
          .modal-title {
            font-size: 0.88rem !important;
          }
          .modal-body-scrollable {
            padding: 10px 8px !important;
          }
          .submit-payroll-btn {
            font-size: 0.78rem !important;
            padding: 7px 12px !important;
          }
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        :global(:root.dark) .settings-panel-card {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        :global(:root.dark) .metric-box {
          background: #0f172a !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .metric-title {
          color: #94a3b8 !important;
        }

        :global(:root.dark) .metric-val {
          color: #f8fafc !important;
        }

        :global(:root.dark) .metric-badge.active {
          background: rgba(34, 197, 94, 0.2) !important;
          color: #4ade80 !important;
        }

        :global(:root.dark) .metric-badge.inactive {
          background: #334155 !important;
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .custom-modal-card {
          background: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-header {
          background: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-body-scrollable {
          background: #0f172a !important;
        }

        :global(:root.dark) .modal-title {
          color: #f8fafc !important;
        }

        :global(:root.dark) .toggle-card {
          background: #0f172a !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .toggle-title {
          color: #f8fafc !important;
        }

        :global(:root.dark) .desktop-guidance-box {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .guidance-title {
          color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
