'use client';
import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HolidaysIcon } from './Icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HolidaySlider = () => {
  const { holidays } = useApp();

  // Group holidays by "YYYY-MM" key, sorted ascending
  const grouped = useMemo(() => {
    if (!holidays || holidays.length === 0) return [];
    const groups = {};
    holidays.forEach((h) => {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { key, year: d.getFullYear(), month: d.getMonth(), items: [] };
      groups[key].items.push(h);
    });
    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  }, [holidays]);

  // Find the index of the current month, default to 0
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  const initialIdx = Math.max(0, grouped.findIndex((g) => g.key >= currentKey));

  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const [activeHoliday, setActiveHoliday] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [modalSelectedHoliday, setModalSelectedHoliday] = useState(null);

  if (!holidays || holidays.length === 0) return null;
  if (grouped.length === 0) return null;

  const safeIdx = Math.min(activeIdx, grouped.length - 1);
  const activeGroup = grouped[safeIdx];
  const label = `${MONTH_NAMES[activeGroup.month]} ${activeGroup.year}`;

  const goPrev = () => {
    setActiveIdx((prev) => {
      const nextIdx = Math.max(0, prev - 1);
      const nextGroup = grouped[nextIdx];
      if (showCalendarModal && nextGroup && nextGroup.items && nextGroup.items.length > 0) {
        setModalSelectedHoliday(nextGroup.items[0]);
      } else {
        setModalSelectedHoliday(null);
      }
      return nextIdx;
    });
  };

  const goNext = () => {
    setActiveIdx((prev) => {
      const nextIdx = Math.min(grouped.length - 1, prev + 1);
      const nextGroup = grouped[nextIdx];
      if (nextGroup && nextGroup.items && nextGroup.items.length > 0) {
        setModalSelectedHoliday(nextGroup.items[0]);
      } else {
        setModalSelectedHoliday(null);
      }
      return nextIdx;
    });
  };

  return (
    <section className="panel hs-root" aria-label="Upcoming holidays" style={{ marginBottom: 0, maxWidth: '650px', width: '100%', margin: '0 auto' }}>
      {/* Redesigned Header: month label displayed in the title */}
      <div className="panel-header-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 className="hs-title-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
          <HolidaysIcon size={20} style={{ color: 'var(--primary)' }} />
          <span>Scheduled Holidays &mdash; {label}</span>
        </h3>
        <button
          className="btn btn-secondary btn-sm hs-view-all-btn"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          onClick={() => {
            if (activeGroup.items && activeGroup.items.length > 0) {
              setModalSelectedHoliday(activeGroup.items[0]);
            } else {
              setModalSelectedHoliday(null);
            }
            setShowCalendarModal(true);
          }}
        >
          View All
        </button>
      </div>

      {/* Main slider with arrows on both sides */}
      <div className="hs-slider-outer" style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'center', width: '100%' }}>
        {/* Left Navigation Arrow */}
        <button
          className="hs-side-nav-arrow"
          onClick={goPrev}
          disabled={safeIdx === 0}
          style={{
            background: 'var(--surface, #ffffff)',
            border: '1.5px solid var(--border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: safeIdx === 0 ? 'not-allowed' : 'pointer',
            opacity: safeIdx === 0 ? 0.35 : 1,
            color: 'var(--text-main)',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (safeIdx !== 0) e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          aria-label="Previous month"
        >
          ‹
        </button>

        {/* Horizontally scrollable holiday cards */}
        <div className="hs-track" style={{ flex: 1, display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', justifyContent: activeGroup.items.length < 3 ? 'center' : 'flex-start' }}>
          {activeGroup.items
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((h) => {
              return (
                <div
                  key={h.id}
                  className="hs-card"
                  tabIndex="0"
                  aria-label={h.name}
                  onClick={() => setActiveHoliday(h)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveHoliday(h);
                    }
                  }}
                >
                  {h.banner ? (
                    <img className="hs-card-bg" src={h.banner} alt={h.name} />
                  ) : (
                    <div
                      className="hs-card-bg hs-card-bg-fallback"
                      style={{
                        background: `linear-gradient(135deg, ${h.color || 'var(--primary)'}88, ${h.color || 'var(--primary)'})`,
                      }}
                    />
                  )}
                  <div className="hs-card-date">
                    {new Date(h.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="hs-card-name">{h.name}</div>
                  {/* Hover overlay */}
                  <div className="hs-card-overlay">
                    <strong>{h.name}</strong>
                    <span className="hs-card-overlay-date">
                      {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    {h.description && <p>{h.description}</p>}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Right Navigation Arrow */}
        <button
          className="hs-side-nav-arrow"
          onClick={goNext}
          disabled={safeIdx === grouped.length - 1}
          style={{
            background: 'var(--surface, #ffffff)',
            border: '1.5px solid var(--border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: safeIdx === grouped.length - 1 ? 'not-allowed' : 'pointer',
            opacity: safeIdx === grouped.length - 1 ? 0.35 : 1,
            color: 'var(--text-main)',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (safeIdx !== grouped.length - 1) e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Dot indicators */}
      {grouped.length > 1 && (
        <div className="hs-dots">
          {grouped.map((g, i) => (
            <button
              key={g.key}
              className={`hs-dot${i === safeIdx ? ' active' : ''}`}
              onClick={() => {
                setActiveIdx(i);
                if (showCalendarModal && g.items && g.items.length > 0) {
                  setModalSelectedHoliday(g.items[0]);
                } else {
                  setModalSelectedHoliday(null);
                }
              }}
              aria-label={`${MONTH_NAMES[g.month]} ${g.year}`}
            />
          ))}
        </div>
      )}

      {/* Holiday Details Modal */}
      {activeHoliday && (
        <div
          className="holiday-modal-overlay"
          onClick={() => setActiveHoliday(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="holiday-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="holiday-modal-close"
              onClick={() => setActiveHoliday(null)}
              aria-label="Close modal"
            >
              &times;
            </button>

            {activeHoliday.banner ? (
              <div className="holiday-modal-banner-container">
                <img
                  className="holiday-modal-banner"
                  src={activeHoliday.banner}
                  alt={activeHoliday.name}
                />
                <div className="holiday-modal-banner-gradient" />
              </div>
            ) : (
              <div
                className="holiday-modal-banner-container fallback-gradient"
                style={{
                  background: `linear-gradient(135deg, ${activeHoliday.color || 'var(--primary)'}88, ${activeHoliday.color || 'var(--primary)'})`,
                }}
              >
                <div className="holiday-modal-banner-gradient" />
              </div>
            )}

            <div className="holiday-modal-body">
              <div className="holiday-modal-header">
                <span
                  className="holiday-modal-date-badge"
                  style={{
                    backgroundColor: `${activeHoliday.color || 'var(--primary)'}15`,
                    color: activeHoliday.color || 'var(--primary)',
                  }}
                >
                  {new Date(activeHoliday.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <h2 className="holiday-modal-title">{activeHoliday.name}</h2>
              </div>

              <div className="holiday-modal-desc">
                {activeHoliday.description ? (
                  <p>{activeHoliday.description}</p>
                ) : (
                  <p className="no-desc">No description available for this holiday.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Month Calendar Modal (triggered by View All) */}
      {showCalendarModal && (
        <div
          className="holiday-modal-overlay"
          onClick={() => setShowCalendarModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="calendar-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-modal-header-row">
              <h3 className="calendar-modal-title-text">
                <HolidaysIcon size={20} style={{ color: 'var(--primary)', marginRight: '6px' }} />
                <span>Monthly Calendar - {label}</span>
              </h3>
              <button
                className="calendar-modal-close-btn"
                onClick={() => setShowCalendarModal(false)}
                aria-label="Close calendar"
              >
                &times;
              </button>
            </div>

            <div className="calendar-modal-layout-grid">
              {/* Left Side: Calendar Grid */}
              <div className="calendar-grid-container">
                {/* Month navigation controls within modal */}
                <div className="calendar-modal-month-nav">
                  <button
                    className="hs-arrow"
                    onClick={goPrev}
                    disabled={safeIdx === 0}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <span className="calendar-modal-month-label">{label}</span>
                  <button
                    className="hs-arrow"
                    onClick={goNext}
                    disabled={safeIdx === grouped.length - 1}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>

                <div className="calendar-weekdays">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                <div className="calendar-days-grid">
                  {/* Empty cells before the 1st of the month */}
                  {Array.from({ length: new Date(activeGroup.year, activeGroup.month, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day-cell empty"></div>
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: new Date(activeGroup.year, activeGroup.month + 1, 0).getDate() }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayHolidays = activeGroup.items.filter((h) => {
                      const d = new Date(h.date);
                      return d.getDate() === dayNum;
                    });
                    
                    const isHoliday = dayHolidays.length > 0;
                    const primaryHoliday = dayHolidays[0];
                    const isSelected = modalSelectedHoliday && dayHolidays.some(h => h.id === modalSelectedHoliday.id);

                    return (
                      <button
                        key={`day-${dayNum}`}
                        className={`calendar-day-cell day${isHoliday ? ' holiday' : ''}${isSelected ? ' selected' : ''}`}
                        onClick={() => {
                          if (isHoliday) {
                            setModalSelectedHoliday(primaryHoliday);
                          }
                        }}
                        style={isHoliday ? {
                          '--holiday-color': primaryHoliday.color || 'var(--primary)',
                          borderColor: primaryHoliday.color || 'var(--primary)',
                        } : {}}
                        disabled={!isHoliday}
                      >
                        <span className="day-number">{dayNum}</span>
                        {isHoliday && (
                          <span 
                            className="holiday-indicator-dot" 
                            style={{ backgroundColor: primaryHoliday.color || 'var(--primary)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Month Holidays List & Detail Card */}
              <div className="calendar-holidays-sidebar">
                <h4 className="sidebar-section-title">Holidays in {MONTH_NAMES[activeGroup.month]}</h4>
                
                {activeGroup.items.length === 0 ? (
                  <p className="no-holidays-msg">No holidays scheduled for this month.</p>
                ) : (
                  <div className="sidebar-holidays-list">
                    {activeGroup.items
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((h) => {
                        const isSelected = modalSelectedHoliday && modalSelectedHoliday.id === h.id;
                        return (
                          <div
                            key={`list-${h.id}`}
                            className={`sidebar-holiday-item${isSelected ? ' active' : ''}`}
                            onClick={() => setModalSelectedHoliday(h)}
                            style={isSelected ? { borderLeft: `4px solid ${h.color || 'var(--primary)'}` } : {}}
                          >
                            <div className="sidebar-holiday-meta">
                              <span className="sidebar-holiday-day-num" style={{ color: h.color || 'var(--primary)' }}>
                                {new Date(h.date).getDate()}
                              </span>
                              <div className="sidebar-holiday-info">
                                <span className="sidebar-holiday-name">{h.name}</span>
                                <span className="sidebar-holiday-weekday">
                                  {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Holiday Details Area inside Calendar Modal */}
                <div className="selected-holiday-detail-panel">
                  {modalSelectedHoliday ? (
                    <div className="modal-detail-card">
                      {modalSelectedHoliday.banner && (
                        <img 
                          className="modal-detail-banner" 
                          src={modalSelectedHoliday.banner} 
                          alt={modalSelectedHoliday.name} 
                        />
                      )}
                      <div className="modal-detail-content">
                        <span 
                          className="modal-detail-badge"
                          style={{
                            backgroundColor: `${modalSelectedHoliday.color || 'var(--primary)'}15`,
                            color: modalSelectedHoliday.color || 'var(--primary)',
                          }}
                        >
                          {new Date(modalSelectedHoliday.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        <h5 className="modal-detail-title">{modalSelectedHoliday.name}</h5>
                        <p className="modal-detail-desc">
                          {modalSelectedHoliday.description || 'No additional policy details listed.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="no-selected-detail">
                      <p>Select a holiday date on the calendar grid to view description details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hs-root {
          padding: 24px;
          margin-top: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Header ── */
        .panel-header-custom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.05));
          padding-bottom: 12px;
        }

        .hs-title-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-family: var(--font-heading, inherit);
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-main, #0a1931);
        }

        .hs-header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hs-nav-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hs-month-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-light, #4c6a92);
          min-width: 110px;
          text-align: center;
          user-select: none;
        }

        .hs-arrow {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border, rgba(255,255,255,0.12));
          background: var(--surface-elevated, rgba(255,255,255,0.05));
          color: var(--text-main, #e2e2e2);
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s, transform 0.15s;
          padding: 0;
          line-height: 1;
        }
        .hs-arrow:hover:not(:disabled) {
          background: var(--primary, #7c3aed);
          color: #fff;
          transform: scale(1.1);
        }
        .hs-arrow:disabled {
          opacity: 0.25;
          cursor: default;
        }

        /* ── Track ── */
        .hs-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 8px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .hs-track::-webkit-scrollbar {
          height: 5px;
        }
        .hs-track::-webkit-scrollbar-track {
          background: transparent;
        }
        .hs-track::-webkit-scrollbar-thumb {
          background: var(--primary, #7c3aed);
          border-radius: 10px;
        }

        /* ── Card ── */
        .hs-card {
          position: relative;
          flex: 0 0 190px;
          height: 115px;
          border-radius: var(--radius-md, 12px);
          overflow: hidden;
          cursor: pointer;
          scroll-snap-align: start;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hs-card:hover,
        .hs-card:focus-visible {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 6px 20px rgba(124,58,237,0.3);
        }
        .hs-card-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hs-card-bg-fallback {
          background: linear-gradient(135deg, var(--primary-light, #a78bfa), var(--primary, #7c3aed));
        }
        .hs-card-date {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          color: #fff;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .hs-card-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 6px 10px;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Hover overlay ── */
        .hs-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 20, 35, 0.88);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 12px;
          opacity: 0;
          transition: opacity 0.25s;
          color: #fff;
        }
        .hs-card:hover .hs-card-overlay,
        .hs-card:focus-visible .hs-card-overlay {
          opacity: 1;
        }
        .hs-card-overlay strong {
          font-size: 0.85rem;
          margin-bottom: 3px;
        }
        .hs-card-overlay-date {
          font-size: 0.72rem;
          opacity: 0.75;
          margin-bottom: 4px;
        }
        .hs-card-overlay p {
          font-size: 0.72rem;
          margin: 0;
          opacity: 0.85;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Dots ── */
        .hs-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
        }
        .hs-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: var(--text-muted, rgba(255,255,255,0.2));
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          padding: 0;
        }
        .hs-dot.active {
          background: var(--primary, #7c3aed);
          transform: scale(1.3);
        }
        .hs-dot:hover:not(.active) {
          background: var(--text-main, rgba(255,255,255,0.5));
        }

        /* ── Holiday Details Modal ── */
        .holiday-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(10, 25, 49, 0.6);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.25s ease-out;
        }

        .holiday-modal-content {
          background: var(--surface, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--border, #d2e0f5);
          width: 100%;
          max-width: 480px;
          overflow: hidden;
          box-shadow: var(--shadow-premium, 0 20px 25px -5px rgba(15, 23, 42, 0.1));
          position: relative;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .holiday-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: background 0.2s, transform 0.2s;
        }

        .holiday-modal-close:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.1);
        }

        .holiday-modal-banner-container {
          position: relative;
          width: 100%;
          height: 200px;
          background-color: var(--primary-light);
        }

        .holiday-modal-banner-container.fallback-gradient {
          background: linear-gradient(135deg, var(--primary-light, #a78bfa), var(--primary, #7c3aed));
        }

        .holiday-modal-banner {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .holiday-modal-banner-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4));
        }

        .holiday-modal-body {
          padding: 24px;
        }

        .holiday-modal-header {
          margin-bottom: 16px;
        }

        .holiday-modal-date-badge {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: var(--radius-full, 9999px);
          margin-bottom: 10px;
        }

        .holiday-modal-title {
          font-family: var(--font-heading, inherit);
          font-size: 1.5rem;
          font-weight: 750;
          color: var(--text-main, #0a1931);
          margin: 0;
          line-height: 1.25;
        }

        .holiday-modal-desc {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-muted, #1e365c);
        }

        .holiday-modal-desc p {
          margin: 0;
        }

        .holiday-modal-desc p.no-desc {
          color: var(--text-light);
          font-style: italic;
        }

        /* ── Calendar Modal Layout ── */
        .calendar-modal-content {
          background: var(--surface, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--border, #d2e0f5);
          width: 100%;
          max-width: 780px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-premium, 0 20px 25px -5px rgba(15, 23, 42, 0.1));
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 24px;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .calendar-modal-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.08));
          padding-bottom: 14px;
        }

        .calendar-modal-title-text {
          font-family: var(--font-heading, inherit);
          font-size: 1.25rem;
          font-weight: 750;
          color: var(--text-main, #0a1931);
        }

        .calendar-modal-close-btn {
          background: transparent;
          border: none;
          font-size: 1.75rem;
          color: var(--text-light, #4c6a92);
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s, transform 0.2s;
        }

        .calendar-modal-close-btn:hover {
          color: var(--primary);
          transform: scale(1.1);
        }

        .calendar-modal-layout-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }

        /* Left Side: Calendar Grid container */
        .calendar-grid-container {
          background: var(--bg-app, #f4f7fc);
          border-radius: var(--radius-md, 12px);
          padding: 16px;
          border: 1px solid var(--border, #d2e0f5);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calendar-modal-month-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .calendar-modal-month-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main, #0a1931);
          min-width: 140px;
          text-align: center;
          user-select: none;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-light, #4c6a92);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.05));
          padding-bottom: 8px;
        }

        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .calendar-day-cell {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm, 8px);
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-muted, #1e365c);
          background: transparent;
          border: 1px solid transparent;
          position: relative;
          cursor: default;
          padding: 0;
        }

        .calendar-day-cell.empty {
          opacity: 0;
          pointer-events: none;
        }

        .calendar-day-cell.day {
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }

        .calendar-day-cell.holiday {
          background: var(--surface, #ffffff);
          cursor: pointer;
          font-weight: 700;
          border-width: 2px;
          box-shadow: var(--shadow-sm);
        }

        .calendar-day-cell.holiday:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          background: var(--primary-light, #f0f7ff);
        }

        .calendar-day-cell.holiday.selected {
          background: var(--holiday-color, var(--primary)) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .calendar-day-cell.holiday.selected .holiday-indicator-dot {
          background-color: #ffffff !important;
        }

        .holiday-indicator-dot {
          position: absolute;
          bottom: 4px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        /* Right Side: Sidebar Holidays list */
        .calendar-holidays-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .sidebar-section-title {
          font-family: var(--font-heading, inherit);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main, #0a1931);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .no-holidays-msg {
          font-size: 0.88rem;
          color: var(--text-light, #4c6a92);
          font-style: italic;
          margin: 10px 0;
        }

        .sidebar-holidays-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .sidebar-holidays-list::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-holidays-list::-webkit-scrollbar-thumb {
          background: var(--border, #d2e0f5);
          border-radius: 2px;
        }

        .sidebar-holiday-item {
          background: var(--bg-app, #f4f7fc);
          border: 1px solid var(--border, #d2e0f5);
          border-radius: var(--radius-md, 10px);
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          border-left: 4px solid transparent;
        }

        .sidebar-holiday-item:hover {
          background: var(--primary-light, #f0f7ff);
          border-color: var(--primary-border, #bfdbfe);
        }

        .sidebar-holiday-item.active {
          background: var(--surface, #ffffff);
          border-color: var(--border, #d2e0f5);
          box-shadow: var(--shadow-sm);
        }

        .sidebar-holiday-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-holiday-day-num {
          font-family: var(--font-heading, inherit);
          font-size: 1.4rem;
          font-weight: 800;
          line-height: 1;
          min-width: 24px;
        }

        .sidebar-holiday-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .sidebar-holiday-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main, #0a1931);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-holiday-weekday {
          font-size: 0.72rem;
          color: var(--text-light, #4c6a92);
          text-transform: uppercase;
          font-weight: 500;
        }

        /* Detail panel of selected holiday */
        .selected-holiday-detail-panel {
          border-top: 1px solid var(--border, rgba(0, 0, 0, 0.08));
          padding-top: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .no-selected-detail {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          border: 1px dashed var(--border, #d2e0f5);
          border-radius: var(--radius-md, 10px);
          padding: 20px;
          color: var(--text-light, #4c6a92);
          font-size: 0.85rem;
          text-align: center;
          min-height: 120px;
        }

        .modal-detail-card {
          border: 1px solid var(--border, #d2e0f5);
          border-radius: var(--radius-md, 10px);
          overflow: hidden;
          background: var(--surface, #ffffff);
          box-shadow: var(--shadow-sm);
        }

        .modal-detail-banner {
          width: 100%;
          height: 100px;
          object-fit: cover;
        }

        .modal-detail-content {
          padding: 16px;
        }

        .modal-detail-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-full, 9999px);
          margin-bottom: 6px;
        }

        .modal-detail-title {
          font-family: var(--font-heading, inherit);
          font-size: 1.1rem;
          font-weight: 750;
          color: var(--text-main, #0a1931);
          margin: 0 0 6px 0;
        }

        .modal-detail-desc {
          font-size: 0.82rem;
          line-height: 1.4;
          color: var(--text-muted, #1e365c);
          margin: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 768px) {
          .calendar-modal-layout-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .hs-root {
            padding: 14px 12px;
          }
          .hs-card {
            flex: 0 0 150px;
            height: 95px;
          }
        }
      `}</style>
    </section>
  );
};

export default HolidaySlider;
