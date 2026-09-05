'use client';

import React, { useState, useEffect } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';

export default function SharedCalendar({
  year: controlledYear,
  month: controlledMonth,
  onMonthChange,
  renderDay,
  title,
  subtitle,
  headerContent,
  legend,
  onDayClick,
  className = ''
}) {
  const [internalDate, setInternalDate] = useState(() => new Date());

  const year = controlledYear !== undefined ? controlledYear : internalDate.getFullYear();
  const month = controlledMonth !== undefined ? controlledMonth : internalDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const gridCells = [...blanks, ...days];

  const handlePrevMonth = () => {
    let nextY = year;
    let nextM = month - 1;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    }
    if (controlledYear === undefined) {
      setInternalDate(new Date(nextY, nextM, 1));
    }
    if (onMonthChange) {
      onMonthChange(nextY, nextM);
    }
  };

  const handleNextMonth = () => {
    let nextY = year;
    let nextM = month + 1;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    if (controlledYear === undefined) {
      setInternalDate(new Date(nextY, nextM, 1));
    }
    if (onMonthChange) {
      onMonthChange(nextY, nextM);
    }
  };

  return (
    <div className={`shared-calendar-container ${className}`}>
      <CalendarHeader
        year={year}
        month={month}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        title={title}
        subtitle={subtitle}
        headerContent={headerContent}
      />

      {legend && <div className="shared-calendar-legend-wrapper">{legend}</div>}

      <CalendarGrid
        year={year}
        month={month}
        gridCells={gridCells}
        renderDay={renderDay}
        onDayClick={onDayClick}
      />
    </div>
  );
}
