'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../Icons';

const DEFAULT_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarHeader({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  title,
  subtitle,
  headerContent,
  monthNames = DEFAULT_MONTH_NAMES,
  controlsSlot,
  className = ''
}) {
  const monthName = monthNames[month] || '';

  return (
    <header className={`shared-calendar-header calendar-header ${className}`} style={{ marginBottom: '12px' }}>
      {headerContent ? (
        headerContent
      ) : (
        <div className="shared-calendar-header-info calendar-header-info">
          {title && (
            <h3 className="shared-calendar-title calendar-title" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="shared-calendar-subtitle calendar-subtitle" style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="shared-calendar-header-actions calendar-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {controlsSlot}
        <div className="shared-calendar-nav calendar-nav" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={onPrevMonth}
            aria-label="Previous month"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <span
            className="shared-calendar-month-year calendar-month-year"
            aria-live="polite"
            style={{
              fontWeight: '700',
              fontSize: '16px',
              color: '#0f172a',
              minWidth: '130px',
              textAlign: 'center',
              userSelect: 'none'
            }}
          >
            {monthName} {year}
          </span>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={onNextMonth}
            aria-label="Next month"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
