'use client';

import React from 'react';

const DEFAULT_WEEKDAYS = [
  { long: 'Sun', short: 'S' },
  { long: 'Mon', short: 'M' },
  { long: 'Tue', short: 'T' },
  { long: 'Wed', short: 'W' },
  { long: 'Thu', short: 'T' },
  { long: 'Fri', short: 'F' },
  { long: 'Sat', short: 'S' }
];

export default function CalendarGrid({
  year,
  month,
  gridCells,
  renderDay,
  onDayClick,
  weekdays = DEFAULT_WEEKDAYS,
  className = ''
}) {
  const formatDateISO = (y, m, d) => {
    if (!d) return '';
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayObj = new Date();
  const todayISO = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  return (
    <div className={`shared-calendar-grid-wrapper ${className}`}>
      {/* Weekday Titles Header */}
      <div className="shared-calendar-grid-header calendar-grid-header" role="row">
        {weekdays.map((w, idx) => (
          <div key={idx} role="columnheader" aria-label={w.long}>
            <span className="day-long">{w.long}</span>
            <span className="day-short">{w.short}</span>
          </div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="shared-calendar-grid calendar-grid" role="grid">
        {gridCells.map((dayNum, idx) => {
          const isBlank = !dayNum;
          const dateISO = isBlank ? '' : formatDateISO(year, month, dayNum);
          const isToday = !isBlank && dateISO === todayISO;

          const handleKeyDown = (e) => {
            if (isBlank || !onDayClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDayClick(dayNum, dateISO);
            }
          };

          return (
            <div
              key={idx}
              className={`shared-calendar-cell ${isBlank ? 'cell-blank' : ''} ${isToday ? 'cell-today' : ''}`}
              onClick={() => !isBlank && onDayClick && onDayClick(dayNum, dateISO)}
              onKeyDown={handleKeyDown}
              tabIndex={!isBlank && onDayClick ? 0 : -1}
              role={!isBlank && onDayClick ? 'button' : undefined}
            >
              {renderDay ? renderDay(dayNum, isToday, isBlank, dateISO) : (
                dayNum ? <span className="shared-calendar-cell-day-num">{dayNum}</span> : null
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
