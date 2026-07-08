import React from 'react';
import { CloseIcon, CameraIcon } from '@/components/Icons';

export default function PhotoViewerModal({
  activePhotoModal,
  setActivePhotoModal,
  activePhotoLocation,
  setActivePhotoLocation
}) {
  if (!activePhotoModal) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={() => { setActivePhotoModal(null); setActivePhotoLocation(null); }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '400px', width: '95%', padding: '24px', position: 'relative' }}
      >
        <button 
          className="modal-close-btn" 
          onClick={() => { setActivePhotoModal(null); setActivePhotoLocation(null); }}
        >
          <CloseIcon size={24} />
        </button>

        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CameraIcon size={20} style={{ color: 'var(--primary)' }} />
          <span>Punch-In Photo Verification</span>
        </h3>

        <div style={{ 
          width: '100%', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden', 
          border: '1px solid var(--border)', 
          backgroundColor: '#0f172a', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          marginBottom: '16px', 
          height: '270px' 
        }}>
          <img 
            src={activePhotoModal} 
            alt="Verification Snapshot" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
          />
        </div>

        {activePhotoLocation && (
          <div style={{ fontSize: '0.82rem', padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Verified Location:</span>
              <strong style={{ color: 'var(--text-main)' }}>{activePhotoLocation.locationName || 'Unknown'}</strong>
            </div>
            {activePhotoLocation.lat && activePhotoLocation.lon && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Coordinates:</span>
                <strong style={{ color: 'var(--text-main)' }}>{activePhotoLocation.lat.toFixed(5)}° N, {activePhotoLocation.lon.toFixed(5)}° E</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={() => { setActivePhotoModal(null); setActivePhotoLocation(null); }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
