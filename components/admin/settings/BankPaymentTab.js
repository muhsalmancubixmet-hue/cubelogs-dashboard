'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  WarningIcon 
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
  }, [
    currentSettings.corporate_bank_name, 
    currentSettings.corporate_account_number, 
    currentSettings.corporate_ifsc_code, 
    currentSettings.corporate_account_holder_name, 
    currentSettings.corporate_bank_branch, 
    currentSettings.corporate_client_code
  ]);

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
    const clean = val.replace(/[\s-]/g, '');
    setFormData(prev => ({ ...prev, corporate_account_number: clean }));
  };

  const handleIfscChange = (val) => {
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
  };

  const isConfigured = Boolean(formData.corporate_account_number);
  const maskedAccount = formData.corporate_account_number 
    ? `•••• ${formData.corporate_account_number.slice(-4)}` 
    : '';

  return (
    <div className="bank-tab-wrapper">
      <div className="panel bank-form-card">
        {/* Header with Title and Status Chip */}
        <div className="bank-header-row">
          <div className="bank-title-group">
            <div className="bank-title-with-icon">
              <BankIcon size={20} className="bank-header-icon" />
              <h3 className="bank-heading">Corporate Bank &amp; Disbursement</h3>
            </div>
            <p className="bank-subheading">
              Configure debit account details for automated payroll disbursement and bank export files.
            </p>
          </div>

          <div className="bank-status-container">
            {isConfigured ? (
              <span className="status-chip active">
                <span className="status-dot green"></span>
                <span>{formData.corporate_bank_name || 'Configured'} ({maskedAccount})</span>
              </span>
            ) : (
              <span className="status-chip pending">
                <span className="status-dot amber"></span>
                <span>Not Configured</span>
              </span>
            )}
          </div>
        </div>

        {/* Clean Responsive Form */}
        <form onSubmit={handleSubmit} className="bank-clean-form">
          <div className="bank-fields-grid">
            {/* Field: Bank Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-bank-name">
                Corporate Bank Name <span className="req-star">*</span>
              </label>
              <select
                id="corp-bank-name"
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
                  placeholder="Enter Bank Name"
                  value={customBankName}
                  onChange={(e) => handleCustomBankChange(e.target.value)}
                  disabled={isLoading}
                  required
                />
              )}
            </div>

            {/* Field: Corporate Account Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-acc-num">
                Corporate Account Number <span className="req-star">*</span>
              </label>
              <input
                id="corp-acc-num"
                type="text"
                className="form-input"
                placeholder="e.g. 50200012345678"
                value={formData.corporate_account_number}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Field: IFSC Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-ifsc">
                IFSC Code <span className="req-star">*</span>
              </label>
              <input
                id="corp-ifsc"
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

            {/* Field: Account Holder Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-holder">
                Account Holder / Entity Name
              </label>
              <input
                id="corp-holder"
                type="text"
                className="form-input"
                placeholder="e.g. Registered Business Entity"
                value={formData.corporate_account_holder_name}
                onChange={(e) => setFormData(prev => ({ ...prev, corporate_account_holder_name: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Field: Branch & City */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-branch">
                Bank Branch &amp; City
              </label>
              <input
                id="corp-branch"
                type="text"
                className="form-input"
                placeholder="e.g. Koramangala, Bengaluru"
                value={formData.corporate_bank_branch}
                onChange={(e) => setFormData(prev => ({ ...prev, corporate_bank_branch: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Field: CMS Client Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="corp-client">
                CMS Client Code (Optional)
              </label>
              <input
                id="corp-client"
                type="text"
                className="form-input"
                placeholder="e.g. CMS998877"
                value={formData.corporate_client_code}
                onChange={(e) => setFormData(prev => ({ ...prev, corporate_client_code: e.target.value }))}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Feedback Alerts */}
          {successMsg && (
            <div className="tab-alert success" style={{ marginTop: '16px' }}>
              <CheckIcon size={15} />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="tab-alert error" style={{ marginTop: '16px' }}>
              <WarningIcon size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="bank-actions-row">
            <button
              type="submit"
              className="btn btn-primary bank-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Saving Bank Details...' : 'Save Bank Details'}
            </button>
          </div>
        </form>

        {/* Compact Integration Badges */}
        <div className="bank-integration-footer">
          <span className="footer-label">Supported Export Formats:</span>
          <div className="integration-pills">
            <span className="pill">HDFC</span>
            <span className="pill">ICICI CMS</span>
            <span className="pill">SBI CMP</span>
            <span className="pill">NEFT / RTGS (Excel &amp; CSV)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bank-tab-wrapper {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }

        .bank-form-card {
          padding: 24px 28px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .bank-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          flex-wrap: wrap;
        }

        .bank-title-group {
          flex: 1;
          min-width: 240px;
        }

        .bank-title-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bank-header-icon {
          color: var(--primary, #0284c7);
          flex-shrink: 0;
        }

        .bank-heading {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text, #0f172a);
          letter-spacing: -0.01em;
        }

        .bank-subheading {
          margin: 4px 0 0 0;
          font-size: 0.84rem;
          color: var(--text-muted, #64748b);
          line-height: 1.4;
        }

        .bank-status-container {
          display: flex;
          align-items: center;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .status-chip.active {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .status-chip.pending {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-dot.green {
          background: #10b981;
        }

        .status-dot.amber {
          background: #f59e0b;
        }

        .bank-clean-form {
          width: 100%;
        }

        .bank-fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px 20px;
        }

        .req-star {
          color: var(--danger, #ef4444);
        }

        .bank-actions-row {
          display: flex;
          justify-content: flex-start;
          margin-top: 22px;
        }

        .bank-submit-btn {
          min-width: 190px;
          padding: 10px 20px;
          font-weight: 600;
          font-size: 0.88rem;
        }

        .bank-integration-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed var(--border, #e2e8f0);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .footer-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .integration-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .pill {
          font-size: 0.75rem;
          padding: 3px 8px;
          background: var(--bg-app, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-sm, 6px);
          color: var(--text, #334155);
          font-weight: 500;
        }

        /* Responsive Mobile Adjustments */
        @media (max-width: 768px) {
          .bank-form-card {
            padding: 18px 16px;
            border-radius: var(--radius-md, 8px);
          }

          .bank-header-row {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 18px;
            padding-bottom: 14px;
          }

          .bank-heading {
            font-size: 1.05rem;
          }

          .bank-subheading {
            font-size: 0.8rem;
          }

          .bank-fields-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .bank-actions-row {
            margin-top: 18px;
          }

          .bank-submit-btn {
            width: 100%;
            justify-content: center;
          }

          .bank-integration-footer {
            margin-top: 18px;
            padding-top: 14px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
