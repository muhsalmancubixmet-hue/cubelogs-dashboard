'use client';

import React, { useEffect, useState } from 'react';
import {
  getAttendanceStatusConfig,
  formatWorkedDuration,
  VERIFICATION_ICONS
} from './attendanceStatusConfig';
import { CloseIcon, ClockIcon, LocationIcon, CameraIcon, ShieldIcon } from '../../Icons';
import { apiFetch } from '../../../lib/api';

export default function AttendanceDayDrawer({
  isOpen,
  onClose,
  dateISO,
  summary,
  log: propLog,
  employeeId,
  employeeName
}) {
  const [lazyLog, setLazyLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);

  // Lazy-fetch raw attendance log with Base64 photo when drawer opens
  useEffect(() => {
    if (!isOpen || !dateISO || !employeeId) {
      setLazyLog(null);
      return;
    }

    if (propLog) {
      setLazyLog(propLog);
      return;
    }

    let isMounted = true;
    setLoadingLog(true);

    apiFetch(`/attendance/?employee=${employeeId}&date=${dateISO}`)
      ? apiFetch(`/attendance/?employee=${employeeId}&date=${dateISO}`)
          .then(data => {
            if (!isMounted) return;
            const list = Array.isArray(data) ? data : (data?.results || []);
            if (list.length > 0) {
              setLazyLog(list[0]);
            } else {
              setLazyLog(null);
            }
          })
          .catch(() => {
            if (isMounted) setLazyLog(null);
          })
          .finally(() => {
            if (isMounted) setLoadingLog(false);
          })
      : setLoadingLog(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, dateISO, employeeId, propLog]);

  // Handle ESC key press to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const logData = lazyLog || propLog;

  const statusKey = summary?.daily_status || logData?.status || 'Absent';
  const statusCfg = getAttendanceStatusConfig(statusKey);
  const StatusIcon = statusCfg.icon;

  const dateObj = dateISO ? new Date(dateISO + 'T12:00:00') : new Date();
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const workedMinutes = summary?.worked_minutes !== undefined ? summary.worked_minutes : (logData?.totalDuration || 0);
  const durationText = formatWorkedDuration(workedMinutes);

  const formatTime = (isoOrTime) => {
    if (!isoOrTime) return '—';
    try {
      if (isoOrTime.includes('T')) {
        return new Date(isoOrTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return isoOrTime;
    } catch {
      return isoOrTime;
    }
  };

  const firstClockIn = summary?.first_clock_in || logData?.clockIn;
  const lastClockOut = summary?.last_clock_out || logData?.clockOut;

  const verificationCoords = logData?.verificationLocation || summary?.verification_location;
  const verificationPhoto = logData?.verificationPhoto || summary?.verification_photo;

  return (
    <div
      className="attendance-drawer-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        className="attendance-drawer-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Attendance Details for ${dateFormatted}`}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '24px',
          borderLeft: '1px solid var(--border)'
        }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
              Attendance Day Details
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              {dateFormatted} {employeeName ? `• ${employeeName}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close drawer"
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Primary Status Banner */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex' }}>
              <StatusIcon size={20} />
            </span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '1rem' }}>{statusCfg.label}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                Worked Duration: <strong>{durationText}</strong>
              </div>
            </div>
          </div>
          {summary?.is_late && (
            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: '700', fontSize: '0.75rem' }}>
              +{summary.minutes_late}m Late
            </span>
          )}
        </div>

        {/* Detailed Metrics List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          
          {/* Shift Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Scheduled Shift</span>
            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
              {summary?.shift_start || '09:00'} - {summary?.shift_end || '17:00'}
            </span>
          </div>

          {/* Clock In */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Clock In</span>
            <span style={{ fontWeight: '700', color: firstClockIn ? 'var(--success)' : 'var(--text-muted)' }}>
              {firstClockIn ? `↓ ${formatTime(firstClockIn)}` : '—'}
            </span>
          </div>

          {/* Clock Out */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Clock Out</span>
            <span style={{ fontWeight: '700', color: lastClockOut ? 'var(--primary)' : 'var(--text-muted)' }}>
              {summary?.is_open_session ? 'Active Shift (Ticking)' : (lastClockOut ? `↑ ${formatTime(lastClockOut)}` : '—')}
            </span>
          </div>

          {/* Leave / Holiday Details if any */}
          {summary?.leave_type && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: '#f3e8ff', border: '1px solid #e9d5ff', fontSize: '0.86rem', color: '#6b21a8' }}>
              <span style={{ fontWeight: '600' }}>Applied Leave</span>
              <span style={{ fontWeight: '700' }}>{summary.leave_type} ({summary.leave_fraction === 0.5 ? 'Half Day' : 'Full Day'})</span>
            </div>
          )}

          {summary?.holiday_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.86rem', color: '#d97706' }}>
              <span style={{ fontWeight: '600' }}>Holiday</span>
              <span style={{ fontWeight: '700' }}>{summary.holiday_name}</span>
            </div>
          )}

          {summary?.payable_attendance_unit !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.86rem', color: '#166534' }}>
              <span style={{ fontWeight: '600' }}>Payable Unit</span>
              <span style={{ fontWeight: '800' }}>{summary.payable_attendance_unit} Day</span>
            </div>
          )}

        </div>

        {/* Verification Section */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldIcon size={16} style={{ color: 'var(--primary)' }} />
            <span>Verification Audit</span>
          </h4>

          {loadingLog ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Loading verification media...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Location Verification Info */}
              {verificationCoords ? (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', fontSize: '0.82rem', color: 'var(--primary-dark)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
                    <LocationIcon size={14} />
                    <span>Location Verified</span>
                  </div>
                  <div>
                    {verificationCoords.locationName ? `Office: ${verificationCoords.locationName}` : 'Coordinates recorded'}
                    {verificationCoords.distance !== undefined && ` (${verificationCoords.distance.toFixed(0)}m away)`}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                  No GPS location recorded for this date.
                </div>
              )}

              {/* Photo Verification Preview */}
              {verificationPhoto ? (
                <div style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
                  <div style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border)' }}>
                    <CameraIcon size={14} style={{ color: 'var(--primary)' }} />
                    <span>Verification Photo Snapshot</span>
                  </div>
                  <div style={{ padding: '12px', textAlign: 'center' }}>
                    <img
                      src={verificationPhoto}
                      alt="Clock-in verification snapshot"
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                  No photo snapshot recorded for this date.
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
