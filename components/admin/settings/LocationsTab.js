import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  LocationIcon, 
  EditIcon, 
  DeleteIcon 
} from '@/components/Icons';

export default function LocationsTab({
  editingLocId,
  locName,
  setLocName,
  locLat,
  setLocLat,
  locLon,
  setLocLon,
  locRadius,
  setLocRadius,
  fetchingGeo,
  locSuccess,
  locError,
  officeLocations,
  handleSaveLocation,
  handleEditLocation,
  handleDeleteLocation,
  handleCancelLocation,
  handleAutofillCoordinates
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
        handleCancelLocation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleCancelLocation]);

  const renderLocationForm = (isModal = false) => (
    <form
      onSubmit={(e) => {
        handleSaveLocation(e);
        if (isModal) setIsModalOpen(false);
      }}
      className="settings-form"
    >
      <div className="form-group">
        <label className="form-label" htmlFor={isModal ? "modal-loc-name" : "loc-name"}>Location / Branch Name</label>
        <input
          id={isModal ? "modal-loc-name" : "loc-name"}
          type="text"
          className="form-input"
          placeholder="e.g. Corporate Head Office"
          value={locName}
          onChange={(e) => setLocName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor={isModal ? "modal-loc-lat" : "loc-lat"}>Latitude (-90 to 90)</label>
          <input
            id={isModal ? "modal-loc-lat" : "loc-lat"}
            type="number"
            step="any"
            min="-90"
            max="90"
            className="form-input"
            placeholder="e.g. 25.204800"
            value={locLat}
            onChange={(e) => setLocLat(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={isModal ? "modal-loc-lon" : "loc-lon"}>Longitude (-180 to 180)</label>
          <input
            id={isModal ? "modal-loc-lon" : "loc-lon"}
            type="number"
            step="any"
            min="-180"
            max="180"
            className="form-input"
            placeholder="e.g. 55.270800"
            value={locLon}
            onChange={(e) => setLocLon(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={isModal ? "modal-loc-radius" : "loc-radius"}>Geofence Validation Radius (Meters)</label>
        <input
          id={isModal ? "modal-loc-radius" : "loc-radius"}
          type="number"
          min="5"
          max="50000"
          className="form-input"
          placeholder="100"
          value={locRadius}
          onChange={(e) => setLocRadius(parseInt(e.target.value) || '')}
          required
        />
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleAutofillCoordinates}
        disabled={fetchingGeo}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}
      >
        {fetchingGeo ? (
          <>
            <div className="btn-spinner"></div>
            <span>Acquiring Current Location...</span>
          </>
        ) : (
          <>
            <LocationIcon size={14} />
            <span>Use My Current Location</span>
          </>
        )}
      </button>

      {locSuccess && (
        <div className="tab-alert success" style={{ marginBottom: '14px' }}>
          <CheckIcon size={14} />
          <span>{locSuccess}</span>
        </div>
      )}

      {locError && (
        <div className="tab-alert danger" style={{ marginBottom: '14px' }}>
          <WarningIcon size={14} />
          <span>{locError}</span>
        </div>
      )}

      <div className="form-actions-row">
        <button type="submit" className="btn btn-primary">
          {editingLocId ? 'Save Coordinates' : 'Add Location'}
        </button>
        {(editingLocId || isModal) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (isModal) setIsModalOpen(false);
              handleCancelLocation();
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="settings-grid">
      {/* Form Panel (Desktop only) */}
      <div className="panel settings-panel-card desktop-form-panel">
        <h3 className="panel-heading">{editingLocId ? 'Edit Office Geofence' : 'Create Geofenced Location'}</h3>
        {renderLocationForm(false)}
      </div>

      {/* List Panel (Active Locations) */}
      <div className="panel settings-panel-card locations-list-panel">
        <div className="list-panel-header">
          <div className="list-header-left">
            <h3 className="panel-heading">Office Premises Directory</h3>
            <span className="locations-count-pill">{officeLocations.length} Active</span>
          </div>
          <button
            type="button"
            className="btn btn-primary new-loc-btn"
            onClick={() => {
              handleCancelLocation();
              setIsModalOpen(true);
            }}
          >
            <span>+ Add Location</span>
          </button>
        </div>

        <div className="locations-stack">
          {officeLocations.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <LocationIcon size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>No office locations configured yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Add your first geofenced premises boundary using the button above.</p>
            </div>
          ) : (
            officeLocations.map(loc => (
              <div className={`location-item-card ${editingLocId === loc.id ? 'active-edit' : ''}`} key={loc.id}>
                <div className="card-top">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem' }}>
                    <LocationIcon size={14} style={{ color: 'var(--primary)' }} />
                    <span>{loc.name}</span>
                  </h4>
                  <span className="badge badge-info">{loc.radius}m Radius</span>
                </div>
                
                <div className="coord-details-box">
                  <div><strong>Latitude:</strong> {typeof loc.lat === 'number' ? loc.lat.toFixed(6) : loc.lat}° N</div>
                  <div><strong>Longitude:</strong> {typeof loc.lon === 'number' ? loc.lon.toFixed(6) : loc.lon}° E</div>
                </div>

                <div className="card-actions-row">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      handleEditLocation(loc);
                      setIsModalOpen(true);
                    }}
                  >
                    <EditIcon size={12} />
                    <span>Edit</span>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLocation(loc.id)}>
                    <DeleteIcon size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pop-up Modal for Create / Edit Location */}
      {isModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => { setIsModalOpen(false); handleCancelLocation(); }}>
          <div className="custom-modal-card loc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title-group">
                <h3 className="modal-title">{editingLocId ? 'Edit Office Geofence' : 'Add Office Location'}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => { setIsModalOpen(false); handleCancelLocation(); }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body-scrollable">
              {renderLocationForm(true)}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .panel-heading {
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
          margin: 0 0 14px 0;
        }

        .list-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 10px;
          flex-wrap: wrap;
        }

        .list-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .locations-count-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          border: 1px solid var(--primary-border, #bfdbfe);
        }

        .new-loc-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }

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
          padding: 20px;
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

        .loc-modal-card {
          max-width: 540px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, #d2e0f5);
          background: var(--bg-card, #ffffff);
        }

        .header-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: var(--text-light, #64748b);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.15s ease;
          line-height: 1;
        }

        .modal-close-btn:hover {
          background: var(--bg-app, #f4f7fc);
          color: var(--text-main, #0c1e3d);
        }

        .modal-body-scrollable {
          padding: 18px 20px;
          overflow-y: auto;
          flex: 1;
          background: var(--bg-card, #ffffff);
        }

        @media (max-width: 992px) {
          .desktop-form-panel {
            display: none !important;
          }
          .custom-modal-backdrop {
            padding: 10px;
          }
          .custom-modal-card {
            max-height: 95vh;
          }
          .modal-header {
            padding: 14px 16px;
          }
          .modal-body-scrollable {
            padding: 14px 16px;
          }
          .location-item-card {
            padding: 12px 14px;
          }
        }

        @media (max-width: 480px) {
          .location-item-card {
            padding: 10px 10px !important;
          }
          .custom-modal-backdrop {
            padding: 6px !important;
          }
          .custom-modal-card {
            border-radius: 12px !important;
          }
        }

        :global(:root.dark) .settings-panel-card,
        :global(:root.dark) .location-item-card {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
        }

        :global(:root.dark) .panel-heading,
        :global(:root.dark) .location-item-card h4,
        :global(:root.dark) .modal-title {
          color: #f8fafc !important;
        }

        :global(:root.dark) .location-details {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .custom-modal-card {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-header,
        :global(:root.dark) .modal-footer {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-body-scrollable {
          background-color: #0f172a !important;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
