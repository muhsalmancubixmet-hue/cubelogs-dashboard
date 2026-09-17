'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckIcon, 
  WarningIcon, 
  EditIcon, 
  CloseIcon 
} from '@/components/Icons';

export default function AttendanceRulesTab({
  attendanceConfig,
  setAttendanceConfig,
  attendanceConfigLoading,
  attendanceConfigSuccess,
  attendanceConfigError,
  handleSaveAttendanceConfig,
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
    await handleSaveAttendanceConfig(e);
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  const renderConfigForm = (isModal = false) => (
    <form onSubmit={onFormSubmit} className="settings-form">
      {/* 2-col inputs */}
      <div className="form-grid-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-grace-period" : "grace-period"}>
            Grace Period (minutes)
          </label>
          {!isModal && (
            <p className="form-desc">
              Allowed clock-in delay after shift start without being marked Late.
            </p>
          )}
          <input
            id={isModal ? "modal-grace-period" : "grace-period"}
            type="number"
            className="form-input"
            min="0"
            max="180"
            value={attendanceConfig.grace_period_minutes}
            onChange={(e) => setAttendanceConfig(prev => ({ ...prev, grace_period_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-min-session" : "min-session"}>
            Min Session (minutes)
          </label>
          {!isModal && (
            <p className="form-desc">
              Minimum duration before Clock Out is permitted.
            </p>
          )}
          <input
            id={isModal ? "modal-min-session" : "min-session"}
            type="number"
            className="form-input"
            min="0"
            max="180"
            value={attendanceConfig.minimum_session_minutes}
            onChange={(e) => setAttendanceConfig(prev => ({ ...prev, minimum_session_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
            required
          />
        </div>
      </div>

      <div className="form-grid-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-break-duration" : "break-duration"}>
            Break Duration (minutes)
          </label>
          {!isModal && (
            <p className="form-desc">
              Standard shift break duration (e.g. 60 min for lunch).
            </p>
          )}
          <input
            id={isModal ? "modal-break-duration" : "break-duration"}
            type="number"
            className="form-input"
            min="0"
            max="180"
            value={attendanceConfig.break_duration_minutes}
            onChange={(e) => setAttendanceConfig(prev => ({ ...prev, break_duration_minutes: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-break-type" : "break-type"}>
            Break Type
          </label>
          {!isModal && (
            <p className="form-desc">
              Whether breaks are paid or deducted from required shift span.
            </p>
          )}
          <select
            id={isModal ? "modal-break-type" : "break-type"}
            className="form-input"
            value={attendanceConfig.break_type || 'Unpaid'}
            onChange={(e) => setAttendanceConfig(prev => ({ ...prev, break_type: e.target.value }))}
          >
            <option value="Unpaid">Unpaid Break</option>
            <option value="Paid">Paid Break</option>
          </select>
        </div>
      </div>

      <div className="form-grid-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-full-day-min" : "full-day-min"}>
            Full Day Min ({Math.floor(attendanceConfig.full_day_minimum_minutes / 60)}h {attendanceConfig.full_day_minimum_minutes % 60 ? (attendanceConfig.full_day_minimum_minutes % 60) + 'm' : ''} / {attendanceConfig.full_day_minimum_minutes}m)
          </label>
          {!isModal && (
            <p className="form-desc">
              Minimum worked time for 1.0 full day attendance credit.
            </p>
          )}
          <input
            id={isModal ? "modal-full-day-min" : "full-day-min"}
            type="number"
            className="form-input"
            min="60"
            max="720"
            value={attendanceConfig.full_day_minimum_minutes}
            onChange={(e) => setAttendanceConfig(prev => ({ ...prev, full_day_minimum_minutes: parseInt(e.target.value) || 480 }))}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor={isModal ? "modal-half-day-threshold" : "half-day-threshold"}>
            Half Day Min ({Math.floor(attendanceConfig.half_day_minimum_minutes / 60)}h {attendanceConfig.half_day_minimum_minutes % 60 ? (attendanceConfig.half_day_minimum_minutes % 60) + 'm' : ''} / {attendanceConfig.half_day_minimum_minutes}m)
          </label>
          {!isModal && (
            <p className="form-desc">
              Minimum worked time for Half Day (0.5 day credit).
            </p>
          )}
          <input
            id={isModal ? "modal-half-day-threshold" : "half-day-threshold"}
            type="number"
            className="form-input"
            min="30"
            max="480"
            value={attendanceConfig.half_day_minimum_minutes}
            onChange={(e) => setAttendanceConfig(prev => {
              const val = parseInt(e.target.value) || 240;
              return { ...prev, half_day_minimum_minutes: val, half_day_threshold_minutes: val };
            })}
            required
          />
        </div>
      </div>

      {/* Weekly Off Days */}
      <div className="form-group weekly-off-form-group" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: '700' }}>
            Weekly Off Days
          </label>
          <span style={{ fontSize: '0.72rem', fontWeight: '600', color: (attendanceConfig.default_weekly_holidays?.length || 0) > 0 ? '#2563eb' : '#64748b' }}>
            {(attendanceConfig.default_weekly_holidays?.length || 0) === 0
              ? 'None selected'
              : `${attendanceConfig.default_weekly_holidays.length} ${attendanceConfig.default_weekly_holidays.length === 1 ? 'day' : 'days'} off`}
          </span>
        </div>

        {!isModal && (
          <p className="form-desc" style={{ marginBottom: '8px' }}>
            Standard weekly recurring non-working days for staff.
          </p>
        )}

        {/* Quick Presets */}
        <div className="weekly-presets-row" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Sun only', days: ['Sunday'] },
            { label: 'Sat + Sun', days: ['Saturday', 'Sunday'] },
            { label: 'Fri + Sat', days: ['Friday', 'Saturday'] },
            { label: 'Clear all', days: [] }
          ].map((preset) => {
            const current = attendanceConfig.default_weekly_holidays || [];
            const isActive = preset.days.length > 0
              ? preset.days.length === current.length && preset.days.every(d => current.includes(d))
              : current.length === 0;
            return (
              <button
                key={preset.label}
                type="button"
                className={`preset-chip-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setAttendanceConfig(prev => ({
                    ...prev,
                    default_weekly_holidays: preset.days
                  }));
                }}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: isActive ? '700' : '500',
                  borderRadius: '12px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: isActive ? '#eff6ff' : '#f8fafc',
                  color: isActive ? '#2563eb' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* 7 Day Pill Row */}
        <div className="days-button-row" style={{ display: 'flex', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
            const isSelected = attendanceConfig.default_weekly_holidays?.includes(day);
            const shortName = day.slice(0, 3);
            return (
              <button
                key={day}
                type="button"
                title={day}
                aria-label={day}
                aria-pressed={isSelected}
                onClick={() => {
                  setAttendanceConfig(prev => {
                    const current = prev.default_weekly_holidays || [];
                    const next = current.includes(day)
                      ? current.filter(d => d !== day)
                      : [...current, day];
                    return { ...prev, default_weekly_holidays: next };
                  });
                }}
                className={`day-pill-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '36px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: isSelected ? '700' : '600',
                  border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {shortName}
              </button>
            );
          })}
        </div>

        {/* Selected Summary note */}
        <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#64748b' }}>
          {(attendanceConfig.default_weekly_holidays?.length || 0) > 0 ? (
            <span>Selected Off: <strong style={{ color: '#0f172a' }}>{attendanceConfig.default_weekly_holidays.join(', ')}</strong></span>
          ) : (
            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No weekly offs selected (7-day work week)</span>
          )}
        </div>
      </div>

      {/* Auto Approval Mode Toggle */}
      <div className="form-group" style={{ marginBottom: '18px' }}>
        <div className="auto-approve-card">
          <div className="auto-approve-info">
            <label className="form-label auto-approve-label" htmlFor={isModal ? "modal-auto-approve-toggle" : "auto-approve-toggle"}>
              Auto Approval Mode
            </label>
            <p className="auto-approve-desc">
              Automatically approve employee logs upon clock-in/out.
            </p>
          </div>

          <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0, cursor: 'pointer' }}>
            <input
              id={isModal ? "modal-auto-approve-toggle" : "auto-approve-toggle"}
              type="checkbox"
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              checked={attendanceConfig.auto_approve_attendance || false}
              onChange={(e) => setAttendanceConfig(prev => ({ ...prev, auto_approve_attendance: e.target.checked }))}
            />
            <span className="slider-round" style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: attendanceConfig.auto_approve_attendance ? 'var(--primary)' : '#cbd5e1',
              borderRadius: '34px',
              transition: 'background-color 0.25s ease',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <span style={{
                position: 'absolute',
                height: '18px',
                width: '18px',
                left: attendanceConfig.auto_approve_attendance ? '24px' : '4px',
                bottom: '4px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: 'all 0.25s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }} />
            </span>
          </label>
        </div>
      </div>

      {attendanceConfigSuccess && (
        <div className="tab-alert success" style={{ marginBottom: '14px' }}>
          <CheckIcon size={14} />
          <span>{attendanceConfigSuccess}</span>
        </div>
      )}
      {attendanceConfigError && (
        <div className="tab-alert error" style={{ marginBottom: '14px' }}>
          <WarningIcon size={14} />
          <span>{attendanceConfigError}</span>
        </div>
      )}

      <div className="form-actions-row" style={{ marginTop: '12px' }}>
        <button type="submit" className="btn btn-primary submit-policy-btn" disabled={attendanceConfigLoading}>
          {attendanceConfigLoading ? 'Saving Policy...' : 'Save Attendance Policy'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="attendance-rules-root">
      {/* Mobile-First Policy Summary Card (Visible on mobile, hides full desktop form) */}
      <div className="panel settings-panel-card mobile-summary-panel">
        <div className="rules-header-row">
          <div className="rules-header-title">
            <ClockIcon size={18} style={{ color: 'var(--primary, #2563eb)' }} />
            <h3 className="panel-heading">Attendance Rules</h3>
            <span className="active-badge">Active</span>
          </div>
          <button
            type="button"
            className="btn btn-primary edit-rules-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <EditIcon size={13} />
            <span>Configure</span>
          </button>
        </div>

        {/* Quick Metric Pills Grid (Shrunk for 300px mobile view) */}
        <div className="rules-metrics-grid">
          <div className="metric-box">
            <span className="metric-title">Grace Period</span>
            <span className="metric-val">{attendanceConfig.grace_period_minutes} min</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Min Session</span>
            <span className="metric-val">{attendanceConfig.minimum_session_minutes} min</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Full Day</span>
            <span className="metric-val">
              {Math.floor(attendanceConfig.full_day_minimum_minutes / 60)}h {attendanceConfig.full_day_minimum_minutes % 60 ? (attendanceConfig.full_day_minimum_minutes % 60) + 'm' : ''}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Half Day</span>
            <span className="metric-val">
              {Math.floor(attendanceConfig.half_day_minimum_minutes / 60)}h {attendanceConfig.half_day_minimum_minutes % 60 ? (attendanceConfig.half_day_minimum_minutes % 60) + 'm' : ''}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Break Span</span>
            <span className="metric-val">{attendanceConfig.break_duration_minutes}m ({attendanceConfig.break_type})</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Approval</span>
            <span className={`metric-badge ${attendanceConfig.auto_approve_attendance ? 'auto' : 'manual'}`}>
              {attendanceConfig.auto_approve_attendance ? 'Auto' : 'Manual'}
            </span>
          </div>
        </div>

        <div className="rules-weekly-offs-row">
          <span className="weekly-offs-label">Weekly Offs:</span>
          <div className="weekly-offs-tags">
            {attendanceConfig.default_weekly_holidays?.length > 0 ? (
              attendanceConfig.default_weekly_holidays.map(d => (
                <span key={d} className="off-tag">{d.slice(0, 3)}</span>
              ))
            ) : (
              <span className="off-tag-none">None configured</span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View: Side-by-Side Grid */}
      <div className="settings-grid desktop-only-grid">
        {/* Left: Form Card */}
        <div className="panel settings-panel-card desktop-form-panel">
          <h3 className="desktop-card-title">
            <ClockIcon size={18} style={{ color: 'var(--primary)' }} />
            <span>Attendance & Shift Policy</span>
          </h3>
          {renderConfigForm(false)}
        </div>

        {/* Right: Info Explanation Card */}
        <div className="panel settings-panel-card desktop-info-panel">
          <h3 className="desktop-card-title">How Attendance Rules Work</h3>
          <div className="info-cards-col">
            <div className="info-card info-yellow">
              <strong className="info-card-header">
                <span className="info-emoji">🕐</span> Grace Period
              </strong>
              <p className="info-card-text">
                Employees clocking in within the grace window are marked as on-time. Beyond it, they appear in the Late Comers tab.
              </p>
            </div>
            <div className="info-card info-blue">
              <strong className="info-card-header">
                <span className="info-emoji">📅</span> Half Day Threshold
              </strong>
              <p className="info-card-text">
                The minimum time worked for a session to count as a productive Half Day. Sessions below this may be classified as Absent by HR.
              </p>
            </div>
            <div className="info-card info-red">
              <strong className="info-card-header">
                <span className="info-emoji">🚫</span> Full-Day Absent Threshold
              </strong>
              <p className="info-card-text">
                The maximum delay allowed after shift start. Arrivals beyond this point without prior approved leave are considered fully absent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Modal Popup Dialog */}
      {isModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="custom-modal-card policy-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-policy-title"
          >
            <div className="modal-header">
              <div className="header-title-group">
                <ClockIcon size={17} style={{ color: 'var(--primary, #2563eb)' }} />
                <h3 id="modal-policy-title" className="modal-title">
                  Configure Attendance Rules
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
        .attendance-rules-root {
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

        .rules-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rules-header-title {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .active-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 9999px;
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
          line-height: 1.3;
        }

        .edit-rules-btn {
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

        .rules-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
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

        .metric-badge.auto {
          background: #dbeafe;
          color: #1e40af;
        }

        .metric-badge.manual {
          background: #f1f5f9;
          color: #475569;
        }

        .rules-weekly-offs-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px dashed var(--border, #e2e8f0);
          flex-wrap: wrap;
        }

        .weekly-offs-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-muted, #64748b);
        }

        .weekly-offs-tags {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .off-tag {
          font-size: 0.72rem;
          font-weight: 600;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          border: 1px solid var(--primary-border, #bfdbfe);
          padding: 2px 7px;
          border-radius: 12px;
        }

        .off-tag-none {
          font-size: 0.72rem;
          color: var(--text-muted, #94a3b8);
          font-style: italic;
        }

        /* Form styling */
        .form-grid-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .form-desc {
          font-size: 0.76rem;
          color: var(--text-muted);
          margin-bottom: 6px;
          opacity: 0.75;
          line-height: 1.35;
        }

        .weekly-presets-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .preset-chip-btn {
          padding: 3px 8px;
          font-size: 0.7rem;
          font-weight: 500;
          border-radius: 12px;
          border: 1px solid var(--border, #cbd5e1);
          background: var(--bg-app, #f8fafc);
          color: var(--text-muted, #475569);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-chip-btn:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        .preset-chip-btn.active {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
          font-weight: 700;
        }

        .days-button-row {
          display: flex;
          gap: 4px;
          width: 100%;
          box-sizing: border-box;
        }

        .day-pill-btn {
          flex: 1;
          min-width: 0;
          height: 36px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          border: 1px solid var(--border, #cbd5e1);
          background: #ffffff;
          color: var(--text-main, #334155);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .day-pill-btn:hover:not(.selected) {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }

        .day-pill-btn.selected {
          background: #2563eb !important;
          color: #ffffff !important;
          border-color: #2563eb !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }

        .auto-approve-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--primary-light, #eff6ff);
          border-radius: var(--radius-md, 8px);
          border: 1px solid var(--primary-border, #bfdbfe);
          gap: 10px;
        }

        .auto-approve-info {
          flex: 1;
          min-width: 0;
        }

        .auto-approve-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 2px;
          display: block;
          cursor: pointer;
        }

        .auto-approve-desc {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin: 0;
          opacity: 0.85;
          line-height: 1.3;
        }

        .submit-policy-btn {
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

        .info-yellow {
          background: rgba(234, 179, 8, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.2);
        }

        .info-blue {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .info-red {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
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

        .policy-modal-card {
          max-width: 520px;
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
          .rules-metrics-grid {
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
          .days-button-row {
            gap: 4px !important;
          }
          .day-pill-btn {
            padding: 3px 8px !important;
            font-size: 0.72rem !important;
          }
        }

        @media (max-width: 320px) {
          .rules-metrics-grid {
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
          .submit-policy-btn {
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

        :global(:root.dark) .settings-panel-card,
        :global(:root.dark) .mobile-summary-panel {
          background: #1e293b !important;
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
        :global(:root.dark) .metric-badge.auto {
          background: rgba(37, 99, 235, 0.25) !important;
          color: #60a5fa !important;
        }
        :global(:root.dark) .metric-badge.manual {
          background: #334155 !important;
          color: #cbd5e1 !important;
        }
        :global(:root.dark) .off-tag {
          background: rgba(37, 99, 235, 0.2) !important;
          color: #93c5fd !important;
          border-color: rgba(37, 99, 235, 0.4) !important;
        }
        :global(:root.dark) .auto-approve-card {
          background: #0f172a !important;
          border-color: #334155 !important;
        }
        :global(:root.dark) .desktop-guidance-box {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
        :global(:root.dark) .guidance-title {
          color: #f8fafc !important;
        }
        :global(:root.dark) .day-pill-btn:not(.selected) {
          background: #1e293b !important;
          border-color: #334155 !important;
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
        :global(:root.dark) .form-desc,
        :global(:root.dark) .auto-approve-desc {
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
}
