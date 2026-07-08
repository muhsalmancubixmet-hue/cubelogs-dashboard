import React from 'react';
import { WarningIcon, CameraIcon, CloseIcon } from '@/components/Icons';

export default function VerifierModal({
  showVerifierModal,
  verifierStep,
  verifierLoading,
  verifierError,
  verifierLocation,
  verifierDistance,
  verifierPhoto,
  cameraStream,
  facingMode,
  closestLocation,
  videoRef,
  handleCloseVerifier,
  toggleFacingMode,
  startWebcam,
  handlePhotoFileChange,
  handleVerifyAndPunch
}) {
  if (!showVerifierModal) return null;

  return (
    <div className="modal-overlay" onClick={handleCloseVerifier}>
      <div 
        className="modal-content secure-verifier-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '420px', width: '95%', padding: '32px', position: 'relative' }}
      >
        <button className="modal-close-btn" onClick={handleCloseVerifier}>
          <CloseIcon size={24} />
        </button>

        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Pre-Clock Verification</span>
        </h3>

        {/* Step 1: Geolocation/Validation In Progress */}
        {verifierStep === 'checking' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', gap: '16px' }}>
            <div className="verifier-spinner"></div>
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)', textAlign: 'center' }}>
              Validating Location Boundary...
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', maxWidth: '280px' }}>
              We are verifying your device coordinates against authorized office zones. Please authorize GPS access if prompted.
            </div>
          </div>
        )}

        {/* Step 2: Verification Success */}
        {verifierStep === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', textAlign: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              border: '2px solid var(--success)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            
            <h3 style={{ margin: 0, color: 'var(--success)' }}>Clock Action Verified</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', maxWidth: '280px' }}>
              Your attendance status has been logged and the timestamp recorded.
            </p>
            {closestLocation && verifierDistance !== null && verifierDistance <= closestLocation.radius && (
              <div style={{ fontSize: '0.82rem', padding: '8px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-light)', marginTop: '8px' }}>
                Verified at <strong>{closestLocation.name}</strong> ({verifierDistance.toFixed(1)}m away)
              </div>
            )}
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleCloseVerifier}
              style={{ marginTop: '16px', width: '120px' }}
            >
              Done
            </button>
          </div>
        )}

        {/* Step 3: Failed Pop-up */}
        {verifierStep === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 10px', textAlign: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              border: '2px solid #fecaca',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
            }}>
              <WarningIcon size={32} />
            </div>
            
            <h3 style={{ margin: 0, color: '#dc2626' }}>Clock-In Unsuccessful</h3>
            
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              maxWidth: '100%',
              lineHeight: '1.45',
              textAlign: 'left'
            }}>
              <strong>Reason:</strong> {verifierError}
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', maxWidth: '340px' }}>
              If you are working on-site but location verification failed, you can override with a live photo capture.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  toggleFacingMode(); // toggle to 'user' mode initially
                  startWebcam('user');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                }}
              >
                <CameraIcon size={18} />
                <span>Open Live Camera</span>
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                Click camera icon to activate webcam fallback
              </span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handleCloseVerifier}
              style={{ marginTop: '12px' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 4: Camera Verification */}
        {verifierStep === 'camera' && (
          <div>
            {/* Webcam Stream Preview */}
            <div className="camera-feed-box" style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px',
              height: '270px',
              backgroundColor: '#0f172a',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid var(--border)'
            }}>
              {verifierPhoto ? (
                <img src={verifierPhoto} alt="Uploaded verification preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : cameraStream ? (
                <>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline muted />
                  
                  {/* Rotate Camera Button (Front/Back) */}
                  <button 
                    type="button" 
                    onClick={() => toggleFacingMode()} 
                    title="Switch Camera (Front/Back)" 
                    className="camera-rotate-btn"
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      transition: 'background 0.2s',
                      zIndex: 10
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6" />
                      <path d="M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => startWebcam(facingMode)} 
                    title="Restart Live Camera Feed" 
                    className="camera-refresh-btn"
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      transition: 'background 0.2s',
                      zIndex: 10
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', gap: '16px', padding: '20px', textAlign: 'center', width: '100%' }}>
                  {verifierLoading ? (
                    <>
                      <div className="verifier-spinner"></div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-light)' }}>Uploading photo...</div>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        onClick={() => startWebcam(facingMode)} 
                        className="camera-activation-btn"
                        style={{
                          background: 'var(--primary)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <CameraIcon size={28} />
                      </button>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>Click camera icon to activate live webcam feed</div>

                      <div style={{ margin: '12px 0 4px', width: '80%', height: '1px', borderTop: '1.5px dashed var(--border)' }} />

                      <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-light)' }}>Or upload/take a photo from your device:</div>
                      <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', padding: '8px 16px', margin: '4px 0 0' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Choose Photo File</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Verification Status Details */}
            <div className="verifier-status-info" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>
              {closestLocation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-light)' }}>Closest Location:</span>
                  <strong>{closestLocation.name}</strong>
                </div>
              )}
              {verifierDistance !== null && closestLocation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-light)' }}>Geofence Distance:</span>
                  <strong style={{ color: 'var(--danger)' }}>
                    {verifierDistance.toFixed(1)} meters (Outside Boundary)
                  </strong>
                </div>
              )}
            </div>

            {verifierError && (
              <div className="verifier-error-alert" style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                marginBottom: '20px',
                lineHeight: '1.4'
              }}>
                <strong>⚠️ Error:</strong> {verifierError}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleVerifyAndPunch}
                disabled={verifierLoading || (!cameraStream && !verifierPhoto)}
                style={{ flex: 1 }}
              >
                {verifierLoading ? 'Uploading photo...' : verifierPhoto ? 'Punch-In with Photo File' : 'Capture Photo & Punch-In'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  handleCloseVerifier();
                }}
                disabled={verifierLoading}
                style={{ flex: 0.4 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
