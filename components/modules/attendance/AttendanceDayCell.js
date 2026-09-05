'use client';

import React from 'react';
import {
  getAttendanceStatusConfig,
  formatWorkedDuration,
  VERIFICATION_ICONS
} from './attendanceStatusConfig';

function AttendanceDayCell({
  dayNum,
  isToday,
  isSelected,
  isBlank,
  dateISO,
  summary,
  log,
  onClick
}) {
  if (isBlank || !dayNum) {
    return <div className="attendance-cell-blank" style={{ minHeight: '88px' }} />;
  }

  // Resolve daily status without defaulting to "Absent"
  let statusKey = 'Upcoming';
  if (summary && summary.daily_status) {
    statusKey = summary.daily_status;
  } else if (log) {
    statusKey = log.status || 'Present';
  }

  const isUpcoming = statusKey === 'Upcoming' || statusKey === 'Not Employed';

  const statusCfg = getAttendanceStatusConfig(statusKey);
  const StatusIcon = statusCfg.icon;

  // Resolve worked duration in minutes/seconds
  let workedMinutes = 0;
  if (summary && summary.worked_minutes !== undefined) {
    workedMinutes = summary.worked_minutes;
  } else if (log && log.totalDuration) {
    workedMinutes = log.totalDuration;
  }
  const formattedDuration = formatWorkedDuration(workedMinutes);

  // Determine secondary detail text according to status rules (Only render when meaningful)
  let durationDetailText = null;
  let isLongText = false;
  if (!isUpcoming) {
    if (statusKey === 'Present' || statusKey === 'Late' || statusKey === 'Half Day') {
      durationDetailText = formattedDuration !== '—' ? formattedDuration : null;
    } else if (statusKey === 'Leave') {
      durationDetailText = summary?.leave_type || summary?.leave_type_name || null;
      isLongText = true;
    } else if (statusKey === 'Holiday') {
      durationDetailText = summary?.holiday_name || null;
      isLongText = true;
    }
  }

  // Verification indicators (only if present in records)
  const hasGPSVerification = Boolean(
    !isUpcoming && (
      (summary && summary.verification_location) ||
      (log && log.verificationLocation && Object.keys(log.verificationLocation).length > 0)
    )
  );

  const hasPhotoVerification = Boolean(
    !isUpcoming && (
      (summary && summary.verification_photo) ||
      (log && log.verificationPhoto)
    )
  );

  const hasLateMetadata = Boolean(!isUpcoming && summary?.is_late && summary?.minutes_late > 0);
  const hasFooterMetadata = hasGPSVerification || hasPhotoVerification || hasLateMetadata;

  const LocationIcon = VERIFICATION_ICONS.Location;
  const CameraIcon = VERIFICATION_ICONS.Camera;

  // Accessible ARIA text and hover tooltips
  const ariaText = isUpcoming
    ? `${dateISO}`
    : `${dateISO}: ${statusCfg.label}${durationDetailText ? `, ${durationDetailText}` : ''}${hasGPSVerification ? ', Location Verified' : ''}${hasPhotoVerification ? ', Photo Available' : ''}`;
  const tooltipText = isUpcoming ? `${dateISO}` : `${dateISO} - ${statusCfg.label}${durationDetailText ? ` (${durationDetailText})` : ''}`;

  // Explicit individual side borders (prevents React style conflict warning between border & borderTop)
  let borderTopStyle = (!isUpcoming && statusCfg.accent && statusCfg.accent !== 'transparent')
    ? `2px solid ${statusCfg.accent}`
    : '1px solid #e2e8f0';
  let borderRightStyle = '1px solid #e2e8f0';
  let borderBottomStyle = '1px solid #e2e8f0';
  let borderLeftStyle = '1px solid #e2e8f0';
  let bgStyle = !isUpcoming && statusCfg.bg ? statusCfg.bg : '#ffffff';
  let boxShadowStyle = 'none';

  if (isSelected) {
    bgStyle = '#f8fbff';
    borderTopStyle = '2px solid #3b82f6';
    borderRightStyle = '1px solid #93c5fd';
    borderBottomStyle = '1px solid #93c5fd';
    borderLeftStyle = '1px solid #93c5fd';
    boxShadowStyle = '0 0 0 1px #3b82f6';
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick && onClick(dayNum, dateISO, summary, log);
    }
  };

  return (
    <div
      className={`attendance-day-cell status-${statusKey.toLowerCase().replace(/\s+/g, '-')} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onClick && onClick(dayNum, dateISO, summary, log)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={ariaText}
      title={tooltipText}
      style={{
        minHeight: '88px',
        padding: '9px 10px',
        borderRadius: '6px',
        borderTop: borderTopStyle,
        borderRight: borderRightStyle,
        borderBottom: borderBottomStyle,
        borderLeft: borderLeftStyle,
        background: bgStyle,
        boxShadow: boxShadowStyle,
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 1st Row: Left-Aligned Day Number / Today Circular Badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
        {isToday ? (
          <span
            className="day-num today-badge"
            data-active-blue="true"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              lineHeight: '1'
            }}
          >
            {dayNum}
          </span>
        ) : (
          <span
            className="day-num"
            style={{
              fontSize: '13px',
              fontWeight: '700',
              lineHeight: '1.2',
              color: '#0f172a'
            }}
          >
            {dayNum}
          </span>
        )}
      </div>

      {/* 2nd Row: Inline Icon + Status Label (Rendered for ALL active statuses EXCEPT Upcoming/Not Employed) */}
      {!isUpcoming && (
        <div
          className="status-inline-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: '600',
            fontSize: '11.5px',
            color: '#334155',
            margin: '2px 0',
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={statusCfg.label}
        >
          <StatusIcon size={14} style={{ color: statusCfg.color, flexShrink: 0 }} />
          <span className="status-label-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {statusCfg.label}
          </span>
        </div>
      )}

      {/* 3rd Row: Duration or 2-Line Clamped Holiday/Leave Name */}
      {!isUpcoming && durationDetailText ? (
        <div
          className="cell-duration-row"
          style={{
            fontSize: isLongText ? '10px' : '10.5px',
            color: '#64748b',
            fontWeight: '500',
            paddingLeft: '19px',
            minHeight: '16px',
            lineHeight: '1.25',
            ...(isLongText ? {
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            } : {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            })
          }}
        >
          <span>{durationDetailText}</span>
        </div>
      ) : (
        <div style={{ minHeight: '16px' }} />
      )}

      {/* 4th Row (Footer): Verification Indicators ONLY when present */}
      {hasFooterMetadata && (
        <div
          className="cell-footer-icons"
          style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            justify: 'flex-start',
            paddingLeft: '19px',
            marginTop: 'auto'
          }}
        >
          {hasGPSVerification && (
            <span title="Location Verified" style={{ color: 'var(--primary)', display: 'flex' }}>
              <LocationIcon size={12} />
            </span>
          )}
          {hasPhotoVerification && (
            <span title="Photo Verification Available" style={{ color: 'var(--primary)', display: 'flex' }}>
              <CameraIcon size={12} />
            </span>
          )}
          {hasLateMetadata && (
            <span title={`Late by ${summary.minutes_late} minutes`} style={{ color: '#b45309', fontSize: '0.66rem', fontWeight: '700' }}>
              +{summary.minutes_late}m
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(AttendanceDayCell);
