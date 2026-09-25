'use client';

import React, { useState, useCallback, useMemo } from 'react';
import SharedCalendar from '../../shared/calendar/SharedCalendar';
import AttendanceDayCell from './AttendanceDayCell';
import AttendanceDayDrawer from './AttendanceDayDrawer';
import {
  CheckIcon,
  DeclineIcon,
  ClockIcon,
  LeavesIcon,
  HolidaysIcon,
  CalendarIcon,
  WarningIcon
} from '../../Icons';

export default function AttendanceCalendar({
  employeeId,
  employeeName,
  year,
  month,
  dailySummaries = [],
  attendanceLogs = [],
  onMonthChange,
  onDaySelect,
  className = ''
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDateISO, setSelectedDateISO] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Compute monthly metrics for summary cards strip
  const metrics = useMemo(() => {
    let present = 0;
    let halfDays = 0;
    let leaves = 0;
    let late = 0;
    let absent = 0;
    let needsReview = 0;
    let payableUnits = 0;

    if (dailySummaries && dailySummaries.length > 0) {
      dailySummaries.forEach(s => {
        const st = s.daily_status;
        if (st === 'Present') {
          present++;
          payableUnits += 1.0;
        } else if (st === 'Late') {
          late++;
          present++;
          payableUnits += 1.0;
        } else if (st === 'Half Day') {
          halfDays++;
          payableUnits += 0.5;
        } else if (st === 'Leave') {
          leaves++;
          payableUnits += 1.0;
        } else if (st === 'Absent') {
          absent++;
        } else if (st === 'Incomplete') {
          needsReview++;
        } else if (st === 'Weekly Off' || st === 'Holiday') {
          payableUnits += 1.0;
        }
        if (s.is_late && st !== 'Late') {
          late++;
        }
      });
    } else if (attendanceLogs && attendanceLogs.length > 0) {
      attendanceLogs.forEach(l => {
        if (l.status === 'Present' || l.status === 'Late') present++;
        if (l.status === 'Half Day') halfDays++;
        if (l.status === 'Leave') leaves++;
        if (l.status === 'Late') late++;
        if (l.status === 'Absent') absent++;
        if (l.status === 'Incomplete') needsReview++;
      });
      payableUnits = present + (halfDays * 0.5) + leaves;
    }

    return { present, halfDays, leaves, late, absent, needsReview, payableUnits };
  }, [dailySummaries, attendanceLogs]);

  const handleCellClick = useCallback((dayNum, dateISO, summary, log) => {
    setSelectedDateISO(dateISO);
    setSelectedSummary(summary);
    setSelectedLog(log);
    setDrawerOpen(true);

    if (onDaySelect) {
      onDaySelect(dayNum, dateISO, summary, log);
    }
  }, [onDaySelect]);

  const renderDay = (dayNum, isToday, isBlank, dateISO) => {
    if (isBlank || !dayNum) {
      return <div className="attendance-cell-blank" style={{ minHeight: '96px' }} />;
    }

    const summary = dailySummaries.find(s => s.date === dateISO);
    const dayLogs = attendanceLogs.filter(l => l.date === dateISO);
    const log = dayLogs[0] || null;

    const isSelected = selectedDateISO === dateISO;

    return (
      <AttendanceDayCell
        dayNum={dayNum}
        isToday={isToday}
        isSelected={isSelected}
        isBlank={isBlank}
        dateISO={dateISO}
        summary={summary}
        log={log}
        onClick={handleCellClick}
      />
    );
  };

  return (
    <div className={`attendance-calendar-wrapper ${className}`}>
      {/* Monthly Summary Metric Strip */}
      <div className="attendance-summary-cards">
        <div className="summary-card metric-present">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><CheckIcon size={14} /></span>
            <span className="summary-label">Present</span>
          </div>
          <span className="summary-value">{metrics.present}</span>
        </div>
        <div className="summary-card metric-half">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><ClockIcon size={14} /></span>
            <span className="summary-label">Half Days</span>
          </div>
          <span className="summary-value">{metrics.halfDays}</span>
        </div>
        <div className="summary-card metric-leave">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><LeavesIcon size={14} /></span>
            <span className="summary-label">Approved Leave</span>
          </div>
          <span className="summary-value">{metrics.leaves}</span>
        </div>
        <div className="summary-card metric-late">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><ClockIcon size={14} /></span>
            <span className="summary-label">Late Arrivals</span>
          </div>
          <span className="summary-value">{metrics.late}</span>
        </div>
        <div className="summary-card metric-absent">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><DeclineIcon size={14} /></span>
            <span className="summary-label">Absences</span>
          </div>
          <span className="summary-value">{metrics.absent}</span>
        </div>
        {metrics.needsReview > 0 && (
          <div className="summary-card metric-review">
            <div className="summary-card-header">
              <span className="summary-icon-badge"><WarningIcon size={14} /></span>
              <span className="summary-label">Needs Review</span>
            </div>
            <span className="summary-value">{metrics.needsReview}</span>
          </div>
        )}
        <div className="summary-card metric-payable">
          <div className="summary-card-header">
            <span className="summary-icon-badge"><CalendarIcon size={14} /></span>
            <span className="summary-label">Payable Units</span>
          </div>
          <span className="summary-value">{metrics.payableUnits}</span>
        </div>
      </div>

      {/* Enterprise Visual Status Legend with Colorful Chips */}
      <div className="attendance-calendar-legend">
        <div className="legend-item legend-present">
          <CheckIcon size={13} style={{ color: '#16a34a' }} />
          <span className="legend-label">Present</span>
        </div>
        <div className="legend-item legend-absent">
          <DeclineIcon size={13} style={{ color: '#dc2626' }} />
          <span className="legend-label">Absent</span>
        </div>
        <div className="legend-item legend-late">
          <ClockIcon size={13} style={{ color: '#d97706' }} />
          <span className="legend-label">Late</span>
        </div>
        <div className="legend-item legend-half">
          <ClockIcon size={13} style={{ color: '#4f46e5' }} />
          <span className="legend-label">Half Day</span>
        </div>
        <div className="legend-item legend-leave">
          <LeavesIcon size={13} style={{ color: '#9333ea' }} />
          <span className="legend-label">Leave</span>
        </div>
        <div className="legend-item legend-holiday">
          <HolidaysIcon size={13} style={{ color: '#d97706' }} />
          <span className="legend-label">Holiday</span>
        </div>
        <div className="legend-item legend-off">
          <CalendarIcon size={13} style={{ color: '#64748b' }} />
          <span className="legend-label">Weekly Off</span>
        </div>
        <div className="legend-item legend-pending">
          <ClockIcon size={13} style={{ color: '#475569' }} />
          <span className="legend-label">Pending</span>
        </div>
        {metrics.needsReview > 0 && (
          <div className="legend-item legend-review">
            <WarningIcon size={13} style={{ color: '#ea580c' }} />
            <span className="legend-label">Needs Review</span>
          </div>
        )}
      </div>

      <SharedCalendar
        year={year}
        month={month}
        onMonthChange={onMonthChange}
        renderDay={renderDay}
      />

      <AttendanceDayDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        dateISO={selectedDateISO}
        summary={selectedSummary}
        log={selectedLog}
        employeeId={employeeId}
        employeeName={employeeName}
      />
    </div>
  );
}
