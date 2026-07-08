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
              <label className="form-label" htmlFor="loc-lat">Latitude</label>
              <input
                id="loc-lat"
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 11.114300"
                value={locLat}
                onChange={(e) => setLocLat(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="loc-lon">Longitude</label>
              <input
                id="loc-lon"
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 76.227400"
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
                <span>Acquiring Coordinates...</span>
              </>
            ) : (
              <>
                <LocationIcon size={14} />
                <span>Autofill Browser Coordinates</span>
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
          {officeLocations.map(loc => (
            <div className={`location-item-card ${editingLocId === loc.id ? 'active-edit' : ''}`} key={loc.id}>
              <div className="card-top">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LocationIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>{loc.name}</span>
                </h4>
                <span className="badge badge-info">{loc.radius}m Radius</span>
              </div>
              
              <div className="coord-details-box">
                <div><strong>Latitude:</strong> {loc.lat.toFixed(6)}° N</div>
                <div><strong>Longitude:</strong> {loc.lon.toFixed(6)}° E</div>
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
          ))}
        </div>
      </div>
    </div>
  );
}
