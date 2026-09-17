import React from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  CameraIcon 
} from '@/components/Icons';

export default function BrandingTab({
  brandLogo,
  logoInputRef,
  newCompanyName,
  setNewCompanyName,
  companyNameSuccess,
  companyNameError,
  isSavingCompanyName,
  logoCropOpen,
  tempLogo,
  handleSaveCompanyNameSubmit,
  handleLogoChange,
  confirmLogoCrop,
  handleCancelLogoCrop,
  handleRemoveLogo
}) {
  return (
    <div className="settings-grid">
      <div className="panel settings-panel-card">
        <h3 className="panel-heading">Company Logo</h3>
        <div className="logo-edit-section" style={{ marginTop: '16px', marginBottom: '16px' }}>
          <div className="logo-preview-circle" style={{ cursor: 'pointer' }} onClick={() => logoInputRef.current?.click()}>
            {brandLogo ? (
              <img src={brandLogo} alt="Company logo" className="logo-preview-img" />
            ) : (
              <div className="logo-placeholder">
                <CameraIcon size={28} />
                <span>Upload Logo</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => logoInputRef.current?.click()}>
              Edit
            </button>
            {brandLogo && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleRemoveLogo}>
                Remove
              </button>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
        </div>
      </div>

      <div className="panel settings-panel-card">
        <h3 className="panel-heading">Company Name</h3>
        
        <form onSubmit={handleSaveCompanyNameSubmit} className="settings-form" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="company-name-input">Organization Name</label>
            <input
              id="company-name-input"
              type="text"
              className="form-input"
              placeholder="e.g. Acme Corporation"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              required
            />
          </div>

          {companyNameSuccess && (
            <div className="tab-alert success" style={{ marginTop: '12px' }}>
              <CheckIcon size={14} />
              <span>{companyNameSuccess}</span>
            </div>
          )}

          {companyNameError && (
            <div className="tab-alert error" style={{ marginTop: '12px' }}>
              <WarningIcon size={14} />
              <span>{companyNameError}</span>
            </div>
          )}

          <div className="form-actions-row" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={isSavingCompanyName}>
              {isSavingCompanyName ? 'Saving...' : 'Update Name'}
            </button>
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      {logoCropOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content custom-modal-card" style={{
            background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700' }}>Crop Company Logo</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
              Adjust and crop the logo inside the circular boundary.
            </p>
            
            {/* Circular Cropping Border Wrapper */}
            <div className="crop-preview-container" style={{
              width: '180px', height: '180px', borderRadius: '50%',
              border: '2px dashed var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center',
              overflow: 'hidden', marginBottom: '20px', backgroundColor: 'var(--surface-elevated, #f8fafc)'
            }}>
              {tempLogo && (
                <img src={tempLogo} alt="Crop preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button type="button" className="btn btn-primary" onClick={confirmLogoCrop} style={{ flex: 1, padding: '10px 16px' }}>
                Save
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelLogoCrop} style={{ flex: 1, padding: '10px 16px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .panel-heading {
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
          margin: 0;
        }

        :global(:root.dark) .settings-panel-card {
          background: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        :global(:root.dark) .custom-modal-card {
          background: #1e293b !important;
          border: 1px solid #334155 !important;
          color: #f8fafc !important;
        }

        @media (max-width: 480px) {
          .settings-panel-card {
            padding: 14px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
