'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  EditIcon 
} from '@/components/Icons';

export const BankIcon = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 2 7 22 7 12 2" />
    <line x1="2" y1="21" x2="22" y2="21" />
    <line x1="6" y1="7" x2="6" y2="18" />
    <line x1="10" y1="7" x2="10" y2="18" />
    <line x1="14" y1="7" x2="14" y2="18" />
    <line x1="18" y1="7" x2="18" y2="18" />
  </svg>
);

const PRESET_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Other'
];

export default function BankPaymentTab({
  settings,
  onSave,
  loading = false,
  success = '',
  error = '',
  // Flexible fallback props matching other tabs
  bankConfig,
  setBankConfig,
  bankConfigLoading,
  bankConfigSuccess,
  bankConfigError,
  handleSaveBankConfig
}) {
  const currentSettings = settings || bankConfig || {};
  const isLoading = loading || bankConfigLoading || false;
  const successMsg = success || bankConfigSuccess || '';
  const errorMsg = error || bankConfigError || '';

  const [formData, setFormData] = useState({
    corporate_bank_name: currentSettings.corporate_bank_name || '',
    corporate_account_number: currentSettings.corporate_account_number || '',
    corporate_ifsc_code: currentSettings.corporate_ifsc_code || '',
    corporate_account_holder_name: currentSettings.corporate_account_holder_name || '',
    corporate_bank_branch: currentSettings.corporate_bank_branch || '',
    corporate_client_code: currentSettings.corporate_client_code || '',
  });

  const [selectedBankPreset, setSelectedBankPreset] = useState('HDFC Bank');
  const [customBankName, setCustomBankName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state when settings prop updates
  useEffect(() => {
    const rawBank = currentSettings.corporate_bank_name || '';
    const isPreset = PRESET_BANKS.slice(0, 5).includes(rawBank);
    
    if (isPreset) {
      setSelectedBankPreset(rawBank);
      setCustomBankName('');
    } else if (rawBank) {
      setSelectedBankPreset('Other');
      setCustomBankName(rawBank);
    } else {
      setSelectedBankPreset('HDFC Bank');
      setCustomBankName('');
    }

    setFormData({
      corporate_bank_name: rawBank,
      corporate_account_number: currentSettings.corporate_account_number || '',
      corporate_ifsc_code: currentSettings.corporate_ifsc_code || '',
      corporate_account_holder_name: currentSettings.corporate_account_holder_name || '',
      corporate_bank_branch: currentSettings.corporate_bank_branch || '',
      corporate_client_code: currentSettings.corporate_client_code || '',
    });
  }, [currentSettings.corporate_bank_name, currentSettings.corporate_account_number, currentSettings.corporate_ifsc_code, currentSettings.corporate_account_holder_name, currentSettings.corporate_bank_branch, currentSettings.corporate_client_code]);

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

  const handleBankPresetChange = (preset) => {
    setSelectedBankPreset(preset);
    if (preset === 'Other') {
      setFormData(prev => ({ ...prev, corporate_bank_name: customBankName }));
    } else {
      setFormData(prev => ({ ...prev, corporate_bank_name: preset }));
    }
  };

  const handleCustomBankChange = (name) => {
    setCustomBankName(name);
    setFormData(prev => ({ ...prev, corporate_bank_name: name }));
  };

  const handleAccountNumberChange = (val) => {
    // Sanitize: strip whitespace and hyphens
    const clean = val.replace(/[\s-]/g, '');
    setFormData(prev => ({ ...prev, corporate_account_number: clean }));
  };

  const handleIfscChange = (val) => {
    // Auto uppercase, strip whitespace, max 11 chars
    const clean = val.toUpperCase().replace(/\s/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, corporate_ifsc_code: clean }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      corporate_bank_name: formData.corporate_bank_name.trim(),
      corporate_account_number: formData.corporate_account_number.trim(),
      corporate_ifsc_code: formData.corporate_ifsc_code.trim().toUpperCase(),
      corporate_account_holder_name: formData.corporate_account_holder_name.trim(),
      corporate_bank_branch: formData.corporate_bank_branch.trim(),
      corporate_client_code: formData.corporate_client_code.trim(),
    };

    if (onSave) {
      await onSave(payload);
    } else if (handleSaveBankConfig) {
      await handleSaveBankConfig(payload);
    }

    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  const renderConfigForm = (isModal = false) => (
    <form onSubmit={handleSubmit} className="settings-form">
      {/* Row 1: Bank Name & Corporate Account Number */}
      <div className="form-grid-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-bank-name" : "corp-bank-name"}>
            Corporate Bank Name <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          {!isModal && (
            <p className="form-desc">
              Primary banking partner used for corporate salary disbursement.
            </p>
          )}
          <select
            id={isModal ? "modal-corp-bank-name" : "corp-bank-name"}
            className="form-input"
            value={selectedBankPreset}
            onChange={(e) => handleBankPresetChange(e.target.value)}
            disabled={isLoading}
          >
            {PRESET_BANKS.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>

          {selectedBankPreset === 'Other' && (
            <input
              type="text"
              className="form-input"
              style={{ marginTop: '8px' }}
              placeholder="Enter bank name"
              value={customBankName}
              onChange={(e) => handleCustomBankChange(e.target.value)}
              disabled={isLoading}
              required
            />
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-acc-num" : "corp-acc-num"}>
            Corporate Account Number <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          {!isModal && (
            <p className="form-desc">
              Source debit account for NEFT/RTGS batch files (numbers only).
            </p>
          )}
          <input
            id={isModal ? "modal-corp-acc-num" : "corp-acc-num"}
            type="text"
            className="form-input"
            placeholder="e.g. 50200012345678"
            value={formData.corporate_account_number}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Row 2: IFSC Code & Account Holder / Legal Entity Name */}
      <div className="form-grid-row" style={{ marginTop: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-ifsc" : "corp-ifsc"}>
            IFSC Code <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          {!isModal && (
            <p className="form-desc">
              11-character alphanumeric code (e.g., HDFC0001234).
            </p>
          )}
          <input
            id={isModal ? "modal-corp-ifsc" : "corp-ifsc"}
            type="text"
            className="form-input"
            placeholder="e.g. HDFC0001234"
            maxLength={11}
            value={formData.corporate_ifsc_code}
            onChange={(e) => handleIfscChange(e.target.value)}
            disabled={isLoading}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-holder" : "corp-holder"}>
            Account Holder / Legal Entity Name
          </label>
          {!isModal && (
            <p className="form-desc">
              Registered business entity name as per bank records.
            </p>
          )}
          <input
            id={isModal ? "modal-corp-holder" : "corp-holder"}
            type="text"
            className="form-input"
            placeholder="e.g. CubeLogs Technologies Pvt Ltd"
            value={formData.corporate_account_holder_name}
            onChange={(e) => setFormData(prev => ({ ...prev, corporate_account_holder_name: e.target.value }))}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Row 3: Bank Branch & CMS / Client Code */}
      <div className="form-grid-row" style={{ marginTop: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-branch" : "corp-branch"}>
            Bank Branch &amp; City
          </label>
          {!isModal && (
            <p className="form-desc">
              Operating bank branch (e.g., Nariman Point, Mumbai).
            </p>
          )}
          <input
            id={isModal ? "modal-corp-branch" : "corp-branch"}
            type="text"
            className="form-input"
            placeholder="e.g. Koramangala Branch, Bengaluru"
            value={formData.corporate_bank_branch}
            onChange={(e) => setFormData(prev => ({ ...prev, corporate_bank_branch: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-corp-client" : "corp-client"}>
            CMS Client Code / Utility Code
          </label>
          {!isModal && (
            <p className="form-desc">
              Optional identifier for automated ICICI CMS or HDFC Corporate banking portals.
            </p>
          )}
          <input
            id={isModal ? "modal-corp-client" : "corp-client"}
            type="text"
            className="form-input"
            placeholder="e.g. CMS998877"
            value={formData.corporate_client_code}
            onChange={(e) => setFormData(prev => ({ ...prev, corporate_client_code: e.target.value }))}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Guidance Box */}
      {!isModal && (
        <div className="desktop-guidance-box" style={{ marginTop: '18px' }}>
          <div className="guidance-title">
            Disbursement Information:
          </div>
          <p className="guidance-text" style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            These corporate disbursement details are used as the <strong>Debit Account</strong> and <strong>Sender Info</strong> when generating automated NEFT / RTGS salary payment files (HDFC, ICICI, SBI) during payroll finalization.
          </p>
        </div>
      )}

      {/* Alerts */}
      {successMsg && (
        <div className="tab-alert success" style={{ marginTop: '14px', marginBottom: '4px' }}>
          <CheckIcon size={14} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="tab-alert error" style={{ marginTop: '14px', marginBottom: '4px' }}>
          <WarningIcon size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="form-actions-row" style={{ marginTop: '18px' }}>
        <button
          type="submit"
          className="btn btn-primary submit-bank-btn"
          disabled={isLoading}
          style={{ minWidth: '180px' }}
        >
          {isLoading ? 'Saving Corporate Bank Details...' : 'Save Bank Details'}
        </button>
      </div>
    </form>
  );

  const maskedAccount = formData.corporate_account_number 
    ? `•••• ${formData.corporate_account_number.slice(-4)}` 
    : 'Not configured';

  return (
    <div className="bank-settings-root">
      {/* Mobile Summary Card (<= 992px) */}
      <div className="panel settings-panel-card mobile-summary-panel">
        <div className="payroll-header-row">
          <div className="payroll-header-title">
            <BankIcon size={18} style={{ color: 'var(--primary, #2563eb)' }} />
            <h3 className="panel-heading">Bank Configuration</h3>
            <span className="currency-pill">{formData.corporate_bank_name || 'Not Set'}</span>
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

        <div className="payroll-metrics-grid">
          <div className="metric-box">
            <span className="metric-title">Bank</span>
            <span className="metric-val">{formData.corporate_bank_name || 'Not configured'}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Debit Account</span>
            <span className="metric-val">{maskedAccount}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">IFSC Code</span>
            <span className="metric-val">{formData.corporate_ifsc_code || 'Not set'}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Branch</span>
            <span className="metric-val">{formData.corporate_bank_branch || 'Not set'}</span>
          </div>
        </div>

        <div className="payroll-footer-row">
          <span className="footer-note">Used as debit funding account for salary payment exports.</span>
        </div>
      </div>

      {/* Desktop View: Side-by-Side Grid */}
      <div className="settings-grid desktop-only-grid">
        {/* Left: Form Card */}
        <div className="panel settings-panel-card desktop-form-panel">
          <h3 className="desktop-card-title">
            <BankIcon size={18} style={{ color: 'var(--primary)' }} />
            <span>Corporate Bank &amp; Disbursement Details</span>
          </h3>
          {renderConfigForm(false)}
        </div>

        {/* Right: Informational Context Card */}
        <div className="panel settings-panel-card desktop-info-panel">
          <h3 className="desktop-card-title">Bank File Export Integration</h3>
          <div className="info-cards-col">
            <div className="info-card info-blue">
              <strong className="info-card-header">
                <span className="info-emoji">🏛️</span> Corporate Debit Account
              </strong>
              <p className="info-card-text">
                This corporate bank account serves as the source of funds in your company's salary payment exports. During finalization, bank templates automatically map this account as the primary debit source.
              </p>
            </div>

            <div className="info-card info-yellow">
              <strong className="info-card-header">
                <span className="info-emoji">📊</span> Multi-Bank Templates
              </strong>
              <p className="info-card-text">
                Supports automated exports for <strong>HDFC</strong>, <strong>ICICI CMS</strong>, <strong>State Bank of India CMP</strong>, and generic NEFT/RTGS batch upload sheets in Excel (.xlsx) and CSV formats.
              </p>
            </div>

            <div className="info-card info-purple">
              <strong className="info-card-header">
                <span className="info-emoji">🔒</span> Verification &amp; Security
              </strong>
              <p className="info-card-text">
                IFSC formats are validated against Reserve Bank of India conventions. Account numbers are preserved as raw character sequences to prevent leading zero truncation in spreadsheet viewers.
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
            aria-labelledby="modal-bank-title"
          >
            <div className="modal-header">
              <div className="header-title-group">
                <BankIcon size={17} style={{ color: 'var(--primary, #2563eb)' }} />
                <h3 id="modal-bank-title" className="modal-title">
                  Configure Bank Details
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
    </div>
  );
}
