'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WarningIcon, CheckIcon } from './Icons';

export default function OnboardingDashboard() {
  const { completeOnboarding, logout } = useApp();
  const [companyName, setCompanyName] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [logoName, setLogoName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [weeklyHolidays, setWeeklyHolidays] = useState(['Sunday']);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleWeeklyHolidayToggle = (day) => {
    setWeeklyHolidays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const parseCoordinates = (url) => {
    if (!url) return null;
    
    // 1. Try matching direct comma-separated coordinates e.g. "12.9716, 77.5946"
    let directMatch = url.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (directMatch) {
      return { lat: parseFloat(directMatch[1]), lon: parseFloat(directMatch[2]) };
    }
    
    // 2. Try matching @latitude,longitude in Google Maps link
    let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    
    // 3. Try matching q=latitude,longitude or ll=latitude,longitude
    match = url.match(/[?&](q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[2]), lon: parseFloat(match[3]) };
    }
    
    // 4. Try matching latitude,longitude directly in the path
    match = url.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    
    return null;
  };

  const handleMapsUrlChange = (e) => {
    const value = e.target.value;
    setMapsUrl(value);
    const coords = parseCoordinates(value);
    setCoordinates(coords);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or WEBP).');
      return;
    }

    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    if (!logoBase64) {
      setError('Corporate Logo is required to brand your workspace.');
      return;
    }
    if (mapsUrl.trim() && !coordinates) {
      setError('Unable to parse coordinates (Latitude, Longitude) from the Google Maps link. Please verify it contains coordinate anchors (e.g. @12.97,77.59).');
      return;
    }

    const lat = coordinates ? coordinates.lat : 11.1143;
    const lon = coordinates ? coordinates.lon : 76.2274;

    setIsSubmitting(true);
    try {
      await completeOnboarding(
        companyName.trim(),
        logoBase64,
        lat,
        lon,
        weeklyHolidays
      );
    } catch (err) {
      setError(err.message || 'Failed to submit onboarding parameters. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboard-overlay">
      <div className="onboard-card">
        <header className="onboard-header">
          <span className="logo-badge">📦 CubeLogs</span>
          <h1>Setup Your Organization</h1>
          <p className="subtitle">
            Welcome to CubeLogs. To fully unlock workspace tracking, configure your organization identity parameters below.
          </p>
        </header>

        {error && (
          <div className="alert-message error">
            <WarningIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="onboard-form">
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              type="text"
              className="form-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Corporate Logo *</label>
            <div className="file-uploader-wrapper">
              <input
                type="file"
                id="logo-input"
                className="hidden-file-input"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <label htmlFor="logo-input" className="file-uploader-label">
                {logoBase64 ? (
                  <div className="logo-preview-box">
                    <img src={logoBase64} alt="Preview" className="logo-preview-img" />
                    <span className="logo-filename">{logoName || 'Logo Selected'}</span>
                  </div>
                ) : (
                  <div className="uploader-placeholder">
                    <span className="uploader-icon">📷</span>
                    <span className="uploader-text">Upload Corporate Logo</span>
                    <span className="uploader-subtext">Supports PNG, JPG, or WEBP formats</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Office Google Maps Link (Optional)</label>
            <input
              type="url"
              className="form-input"
              value={mapsUrl}
              onChange={handleMapsUrlChange}
              placeholder="e.g. https://www.google.com/maps/place/... or coordinates '12.97, 77.59'"
            />
            {coordinates ? (
              <div className="coords-success-message">
                <CheckIcon size={16} />
                <span>Anchors parsed: {coordinates.lat.toFixed(4)}° N, {coordinates.lon.toFixed(4)}° E</span>
              </div>
            ) : mapsUrl ? (
              <div className="coords-warning-message">
                <WarningIcon size={16} />
                <span>Awaiting coordinates parsing from URL...</span>
              </div>
            ) : (
              <span className="form-hint">
                Provide a Google Maps sharing link or comma-separated coordinates to define your primary check-in geofence.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Default Weekly Holidays *</label>
            <div className="weekly-holidays-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {DAYS_OF_WEEK.map(day => (
                <label key={day} className="checkbox-pill-label" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: weeklyHolidays.includes(day) ? 'rgba(96, 165, 250, 0.15)' : '#f1f5f9',
                  border: weeklyHolidays.includes(day) ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                  color: weeklyHolidays.includes(day) ? '#1d4ed8' : '#475569',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={weeklyHolidays.includes(day)}
                    onChange={() => handleWeeklyHolidayToggle(day)}
                    style={{ display: 'none' }}
                  />
                  {weeklyHolidays.includes(day) && '✓ '}
                  {day}
                </label>
              ))}
            </div>
            <span className="form-hint" style={{ marginTop: '6px', display: 'block' }}>
              Select recurring weekly off-days for your organization. Pre-populated with Sunday.
            </span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-logout" onClick={logout}>
              Sign Out
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Provisioning Workspace...' : 'Launch Workspace'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .onboard-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
          font-family: var(--font-sans);
          padding: 24px;
        }

        .onboard-card {
          width: 100%;
          max-width: 500px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px -15px rgba(37, 99, 235, 0.08);
        }

        .onboard-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-badge {
          display: inline-block;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 6px 14px;
          border-radius: 12px;
          margin-bottom: 16px;
          letter-spacing: 0.02em;
          border: 1px solid #dbeafe;
        }

        .onboard-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 10px 0;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }

        .alert-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          line-height: 1.4;
          margin-bottom: 24px;
        }

        .alert-message.error {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #ef4444;
        }

        .onboard-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .form-input {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .form-hint {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.4;
        }

        .file-uploader-wrapper {
          width: 100%;
        }

        .hidden-file-input {
          display: none;
        }

        .file-uploader-label {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 110px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 16px;
          text-align: center;
        }

        .file-uploader-label:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .uploader-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .uploader-icon {
          font-size: 1.75rem;
          margin-bottom: 2px;
        }

        .uploader-text {
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
        }

        .uploader-subtext {
          font-size: 0.72rem;
          color: #64748b;
        }

        .logo-preview-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .logo-preview-img {
          max-height: 60px;
          max-width: 180px;
          object-fit: contain;
          border-radius: 8px;
        }

        .logo-filename {
          font-size: 0.8rem;
          font-weight: 600;
          color: #2563eb;
        }

        .coords-success-message {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #10b981;
          font-weight: 550;
          margin-top: 4px;
        }

        .coords-warning-message {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #f59e0b;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          gap: 16px;
        }

        .btn {
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          background: #93c5fd;
          color: #ffffff;
          cursor: not-allowed;
          opacity: 0.7;
          box-shadow: none;
        }

        .btn-submit {
          flex: 1;
        }

        .btn-logout {
          background: transparent;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .btn-logout:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }
      `}</style>
    </div>
  );
}
