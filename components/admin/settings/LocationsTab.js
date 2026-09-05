import React from 'react';
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
  return (
    <div className="settings-grid">
      {/* Form Panel */}
      <div className="panel settings-panel-card">
        <h3>{editingLocId ? 'Edit Office Geofence' : 'Create Geofenced Location'}</h3>
        <p className="tab-desc">Add office premises coordinates to enable geofenced check-ins.</p>

        <form onSubmit={handleSaveLocation} className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="loc-name">Location / Branch Name</label>
            <input
              id="loc-name"
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
              <label className="form-label" htmlFor="loc-lat">Latitude (-90 to 90)</label>
              <input
                id="loc-lat"
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
              <label className="form-label" htmlFor="loc-lon">Longitude (-180 to 180)</label>
              <input
                id="loc-lon"
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
            <label className="form-label" htmlFor="loc-radius">Geofence Validation Radius (Meters)</label>
            <input
              id="loc-radius"
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
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}
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
            <div className="tab-alert success">
              <CheckIcon size={14} />
              <span>{locSuccess}</span>
            </div>
          )}

          {locError && (
            <div className="tab-alert danger">
              <WarningIcon size={14} />
              <span>{locError}</span>
            </div>
          )}

          <div className="form-actions-row">
            <button type="submit" className="btn btn-primary">
              {editingLocId ? 'Save Coordinates' : 'Add Location'}
            </button>
            {editingLocId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelLocation}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Panel */}
      <div className="panel settings-panel-card">
        <h3>Office Premises Directory</h3>
        <p className="tab-desc">Locations active in corporate geofence validations.</p>

        <div className="locations-stack">
          {officeLocations.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <LocationIcon size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>No office locations configured yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Use the form on the left to add your first geofenced premises boundary.</p>
            </div>
          ) : (
            officeLocations.map(loc => (
              <div className={`location-item-card ${editingLocId === loc.id ? 'active-edit' : ''}`} key={loc.id}>
                <div className="card-top">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEditLocation(loc)}>
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
    </div>
  );
}
