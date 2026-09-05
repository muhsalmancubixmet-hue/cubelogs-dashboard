'use client';

import React, { useState } from 'react';
import SharedCalendar from './shared/calendar/SharedCalendar';
import { HolidaysIcon } from './Icons';

export default function DashboardCalendar({
  holidays = [],
  attendanceSummaries = [],
  onMonthChange,
  initialDate,
  year: propYear,
  month: propMonth
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (propYear !== undefined && propMonth !== undefined) {
      return new Date(propYear, propMonth, 1);
    }
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date();
  });
  const [hoveredHoliday, setHoveredHoliday] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleMonthChange = (newYear, newMonth) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    }
  };

  const formatDateISO = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getAttendanceTint = (statusKey) => {
    if (!statusKey) return null;
    const key = String(statusKey).trim();
    if (key === 'Present') return '#f0fdf4';
    if (key === 'Absent') return '#fff1f2';
    if (key === 'Late') return '#fffbeb';
    if (key === 'Half Day') return '#eef2ff';
    if (key === 'Leave') return '#faf5ff';
    if (key === 'Not Started' || key === 'Pending') return '#f8fafc';
    if (key === 'Needs Review' || key === 'Incomplete') return '#fff7ed';
    return null;
  };

  const getHolidayData = (d) => {
    if (!d || !holidays) return null;
    const dateStr = formatDateISO(year, month, d);
    const matches = holidays.filter(h => h.date === dateStr);
    if (matches.length === 0) return null;

    const primary = matches.find(h => !h.name.includes('Weekly Off')) || matches[0];
    
    let type = 'custom';
    if (primary.name.includes('Weekly Off')) {
      type = 'weekly';
    } else if (primary.name.includes('of Month')) {
      type = 'monthly';
    } else if (primary.id && Number(primary.id) < 0) {
      type = 'yearly';
    }

    return {
      primary,
      matches,
      type
    };
  };

  const getCellTooltipData = (d) => {
    if (!d) return null;
    const dateStr = formatDateISO(year, month, d);
    const holidayData = getHolidayData(d);
    const attSummary = (attendanceSummaries || []).find(s => s.date === dateStr);
    const dateObj = new Date(year, month, d);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFutureDay = dateObj > todayStart;

    const hasAtt = !isFutureDay && attSummary && attSummary.status && attSummary.status !== 'Upcoming';

    if (!holidayData && !hasAtt) return null;

    let title = '';
    let desc = '';
    let matches = [];

    if (holidayData) {
      title = holidayData.primary.name;
      desc = holidayData.primary.description || 'Corporate Holiday Closure.';
      matches = holidayData.matches;
    } else {
      const dateFormatted = new Date(year, month, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      title = dateFormatted;
    }

    const attStatusLabel = hasAtt ? (attSummary.status === 'Not Started' ? 'Pending' : attSummary.status) : null;

    return {
      primary: { name: title, description: desc },
      matches,
      type: holidayData?.type || 'custom',
      attendanceStatus: attStatusLabel
    };
  };

  const handleMouseEnter = (e, tooltipData) => {
    const target = e.currentTarget;
    setHoveredHoliday(tooltipData);
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        if (!target) return;
        const rect = target.getBoundingClientRect();
        setTooltipPos({
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY - 10
        });
      });
    } else {
      const rect = target.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.top + window.scrollY - 10
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredHoliday(null);
  };

  const headerTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <HolidaysIcon style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
      <span className="title-long">Workspace Corporate </span>Calendar
    </span>
  );

  const legendElement = (
    <div className="calendar-legend">
      <div className="calendar-legend-item">
        <span className="legend-dot weekly-dot"></span>
        <span className="legend-text weekly-text">Weekly Off<span className="legend-detail">-Days</span></span>
      </div>
      <div className="calendar-legend-item">
        <span className="legend-dot monthly-dot"></span>
        <span className="legend-text monthly-text">Monthly<span className="legend-detail"> Recurring</span></span>
      </div>
      <div className="calendar-legend-item">
        <span className="legend-dot yearly-dot"></span>
        <span className="legend-text yearly-text">Yearly<span className="legend-detail"> Recurring</span></span>
      </div>
      <div className="calendar-legend-item">
        <span className="legend-dot custom-dot"></span>
        <span className="legend-text custom-text">Custom<span className="legend-detail"> Static Closures</span></span>
      </div>
    </div>
  );

  const renderDay = (dayNum, isToday, isBlank) => {
    if (isBlank || !dayNum) return null;
    const holidayData = getHolidayData(dayNum);
    const dateStr = formatDateISO(year, month, dayNum);
    const attSummary = (attendanceSummaries || []).find(s => s.date === dateStr);

    const dateObj = new Date(year, month, dayNum);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFutureDay = dateObj > todayStart;

    let cellStyle = {
      borderRadius: 'var(--radius-sm)',
      border: '1px solid #e2e8f0',
      background: 'rgba(255, 255, 255, 0.5)',
    };

    let dotBg = '';
    let dotBorder = '';

    if (holidayData) {
      if (holidayData.type === 'weekly') {
        cellStyle.background = 'linear-gradient(145deg, #fef2f2, #fee2e2)';
        cellStyle.border = '1px solid #fecaca';
        dotBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
        dotBorder = '#ef4444';
      } else if (holidayData.type === 'monthly') {
        cellStyle.background = 'linear-gradient(145deg, #fffbeb, #fef3c7)';
        cellStyle.border = '1px solid #fde68a';
        dotBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
        dotBorder = '#f59e0b';
      } else if (holidayData.type === 'yearly') {
        cellStyle.background = 'linear-gradient(145deg, #f5f3ff, #ede9fe)';
        cellStyle.border = '1px solid #ddd6fe';
        dotBg = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        dotBorder = '#8b5cf6';
      } else {
        cellStyle.background = 'linear-gradient(145deg, #eff6ff, #dbeafe)';
        cellStyle.border = '1px solid #bfdbfe';
        dotBg = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        dotBorder = '#3b82f6';
      }
    } else if (!isFutureDay && attSummary && attSummary.status) {
      const tint = getAttendanceTint(attSummary.status);
      if (tint) {
        cellStyle.background = tint;
      }
    }

    if (isToday) {
      cellStyle.border = '2px solid var(--primary)';
      if (!holidayData) {
        const tint = (!isFutureDay && attSummary?.status) ? getAttendanceTint(attSummary.status) : null;
        cellStyle.background = tint || 'rgba(96, 165, 250, 0.05)';
      }
    }

    const tooltipData = getCellTooltipData(dayNum);

    const cellAriaLabel = (() => {
      const dateFormatted = new Date(year, month, dayNum).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let label = dateFormatted;
      if (holidayData) {
        label += `. ${holidayData.primary.name}`;
      }
      if (!isFutureDay && attSummary && attSummary.status && attSummary.status !== 'Upcoming') {
        const displayStatus = attSummary.status === 'Not Started' ? 'Pending' : attSummary.status;
        label += `. Attendance: ${displayStatus}`;
      }
      return label;
    })();

    return (
      <div
        style={{ ...cellStyle, width: '100%', height: '100%', minHeight: '80px', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        onMouseEnter={(e) => tooltipData && handleMouseEnter(e, tooltipData)}
        onMouseLeave={handleMouseLeave}
        className={`calendar-cell ${holidayData ? 'calendar-cell-holiday' : ''} ${holidayData ? `cell-${holidayData.type}` : ''}`}
        aria-label={cellAriaLabel}
        title={cellAriaLabel}
      >
        <span className="calendar-cell-day-num" style={{ fontSize: '0.88rem', fontWeight: '700', color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>
          {dayNum}
        </span>
        {holidayData && (
          <div className="calendar-cell-holiday-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', width: '100%', overflow: 'hidden' }}>
            <span className="calendar-cell-holiday-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotBg, border: `1px solid ${dotBorder}`, display: 'block' }}></span>
            <span className={`calendar-cell-holiday-name holiday-text-${holidayData.type}`} style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'block' }}>
              {holidayData.primary.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel calendar-panel" style={{ width: '100%', margin: 0, position: 'relative' }}>
      <SharedCalendar
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
        title={headerTitle}
        subtitle="Dynamic view of weekly offs, recurring monthly rules, and annual festive closures."
        legend={legendElement}
        renderDay={renderDay}
      />

      {/* Tooltip Overlay */}
      {hoveredHoliday && (
        <div 
          className="calendar-tooltip"
          style={{
            position: 'absolute',
            top: tooltipPos.y,
            left: tooltipPos.x,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '220px',
            maxWidth: '300px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div 
            className="calendar-tooltip-title"
            style={{ 
              margin: '0 0 4px 0', 
              fontSize: '0.9rem', 
              fontWeight: '700', 
              borderBottom: '1px solid rgba(255,255,255,0.15)', 
              paddingBottom: '4px', 
              color: '#60a5fa' 
            }}
          >
            {hoveredHoliday.primary.name}
          </div>
          {hoveredHoliday.primary.description && (
            <div 
              className="calendar-tooltip-desc"
              style={{ 
                fontSize: '0.78rem', 
                color: 'rgba(255, 255, 255, 0.85)', 
                lineHeight: 1.4 
              }}
            >
              {hoveredHoliday.primary.description}
            </div>
          )}
          {hoveredHoliday.attendanceStatus && (
            <div
              style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: hoveredHoliday.primary.description ? '1px dashed rgba(255,255,255,0.15)' : 'none',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#38bdf8'
              }}
            >
              Attendance: {hoveredHoliday.attendanceStatus}
            </div>
          )}
          {hoveredHoliday.matches && hoveredHoliday.matches.length > 1 && (
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.72rem', color: '#94a3b8' }}>
              Also on this day:
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '12px' }}>
                {hoveredHoliday.matches.slice(1).map((m, i) => (
                  <li key={i}>{m.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .calendar-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .calendar-subtitle {
          margin: 4px 0 0 0;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .calendar-nav {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .calendar-nav button {
          padding: 6px 12px;
        }
        .calendar-month-year {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-main);
          min-width: 130px;
          text-align: center;
        }
        .calendar-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
        }
        .calendar-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .weekly-dot {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: 1px solid #ef4444;
        }
        .monthly-dot {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: 1px solid #f59e0b;
        }
        .yearly-dot {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: 1px solid #8b5cf6;
        }
        .custom-dot {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: 1px solid #3b82f6;
        }
        .weekly-text { color: #991b1b; }
        .monthly-text { color: #92400e; }
        .yearly-text { color: #5b21b6; }
        .custom-text { color: #1e40af; }
        
        .calendar-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          text-align: center;
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .calendar-cell {
          min-height: 80px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }
        
        .calendar-tooltip {
          background: rgba(15, 23, 42, 0.98) !important;
          color: #ffffff !important;
        }
        .calendar-tooltip-title {
          color: #60a5fa !important;
          font-weight: 700 !important;
        }
        .calendar-tooltip-desc {
          color: rgba(255, 255, 255, 0.9) !important;
        }
        
        .day-short {
          display: none;
        }
        @media (max-width: 640px) {
          .calendar-panel {
            padding: 12px 8px !important;
          }
          .calendar-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 12px;
          }
          .calendar-title {
            font-size: 0.95rem;
            font-weight: 700;
          }
          .title-long {
            display: none;
          }
          .calendar-subtitle {
            display: none;
          }
          .calendar-nav {
            gap: 4px;
          }
          .calendar-nav button {
            padding: 4px 8px;
            font-size: 0.75rem;
          }
          .calendar-month-year {
            font-size: 0.85rem;
            min-width: 80px;
          }
          .calendar-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px 10px;
            padding: 6px;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .calendar-legend-item {
            font-size: 0.65rem;
            gap: 4px;
          }
          .legend-dot {
            width: 8px;
            height: 8px;
          }
          .legend-detail {
            display: none;
          }
          .day-long {
            display: none;
          }
          .day-short {
            display: inline;
          }
          .calendar-grid-header {
            font-size: 0.7rem !important;
            margin-bottom: 4px;
            gap: 4px;
          }
          .calendar-grid {
            gap: 4px;
          }
          .calendar-cell {
            min-height: 38px;
            padding: 4px 2px;
            justify-content: center;
            align-items: center;
            gap: 2px;
          }
          .calendar-cell-day-num {
            font-size: 0.75rem !important;
            line-height: 1;
          }
          .calendar-cell-holiday-container {
            align-items: center !important;
            justify-content: center;
            gap: 0 !important;
            margin-top: 1px;
          }
          .calendar-cell-holiday-dot {
            width: 5px !important;
            height: 5px !important;
          }
          .calendar-cell-holiday-name {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
