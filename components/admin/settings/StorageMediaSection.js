'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Format raw bytes into commercial/decimal friendly unit string (MB, GB, etc.)
 * Preserves commercial storage conventions (1 GB = 1,000,000,000 bytes).
 */
export function formatStorageBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
  const b = Number(bytes);
  if (b === 0) return '0 B';
  if (b < 1000) return `${b} B`;
  if (b < 1000 * 1000) return `${(b / 1000).toFixed(2)} KB`;
  if (b < 1000 * 1000 * 1000) return `${(b / (1000 * 1000)).toFixed(2)} MB`;
  return `${(b / (1000 * 1000 * 1000)).toFixed(2)} GB`;
}

/**
 * Format currency amounts with proper currency symbol.
 */
export function formatCurrencyAmount(amount, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : `${currency} `);
  const num = parseFloat(amount || 0);
  return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Clean human-readable module title mapping.
 */
export function getSourceModuleTitle(sourceModule) {
  if (!sourceModule) return 'General Storage';
  const known = {
    projects: 'Projects',
    attendance: 'Attendance',
    payroll: 'Payroll',
    employees: 'Employees',
    branding: 'Branding',
  };
  const key = String(sourceModule).toLowerCase();
  if (known[key]) return known[key];
  return key
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Module color palette for native iPhone-style bar segments
const MODULE_COLORS = {
  projects: '#2563eb', // Blue
  attendance: '#10b981', // Emerald
  payroll: '#f59e0b', // Amber
  employees: '#8b5cf6', // Violet
  branding: '#ec4899', // Pink
};

function getModuleColor(moduleKey) {
  const key = String(moduleKey || '').toLowerCase();
  return MODULE_COLORS[key] || '#3b82f6';
}

export default function StorageMediaSection() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStorageData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [summaryRes, historyRes] = await Promise.all([
        apiFetch('/v1/storage/summary/'),
        apiFetch('/v1/storage/history/').catch((histErr) => {
          // Failure on history should not crash or block summary display
          console.warn('Storage history fetch warning:', histErr);
          return [];
        }),
      ]);

      setSummary(summaryRes);
      setHistory(Array.isArray(historyRes) ? historyRes : (historyRes?.results || []));
    } catch (err) {
      console.error('Failed to load storage billing data:', err);
      if (err?.status === 403) {
        setError("You don't have permission to view storage billing information.");
      } else {
        setError('Storage information is temporarily unavailable.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  // Loading skeleton state
  if (loading && !summary) {
    return (
      <div
        className="panel storage-media-section"
        style={{
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          padding: '24px',
          marginTop: '24px',
        }}
        aria-busy="true"
        aria-label="Loading storage and media information"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ width: '200px', height: '24px', backgroundColor: '#e2e8f0', borderRadius: '6px' }} />
          <div style={{ width: '120px', height: '24px', backgroundColor: '#e2e8f0', borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '88px', backgroundColor: '#f1f5f9', borderRadius: '8px' }} />
          ))}
        </div>
        <div style={{ height: '36px', backgroundColor: '#f1f5f9', borderRadius: '8px' }} />
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div
        className="panel storage-media-section"
        style={{
          border: '1px solid #fee2e2',
          borderRadius: '12px',
          backgroundColor: '#fff5f5',
          padding: '24px',
          marginTop: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px', color: '#b91c1c', fontSize: '1.05rem', fontWeight: '700' }}>
              Storage & Media Information
            </h4>
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.9rem' }}>{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchStorageData(true)}
            disabled={refreshing}
            style={{ flexShrink: 0 }}
          >
            {refreshing ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const activeBytes = Number(summary?.active_bytes || 0);
  const activeGb = summary?.active_gb || '0.0000';
  const currentCredits = Number(summary?.current_credits || 0);
  const creditSizeBytes = Number(summary?.credit_size_bytes || 1000000000);
  const creditMonthlyPrice = summary?.credit_monthly_price || '20.00';
  const currency = summary?.currency || 'INR';
  const billingEnabled = Boolean(summary?.billing_enabled);
  const activeFiles = Number(summary?.active_files || 0);
  const deletedFiles = Number(summary?.deleted_files || 0);
  const sourceBreakdown = Array.isArray(summary?.source_breakdown) ? summary.source_breakdown : [];

  // Credit usage calculation (iPhone-style bar)
  // active_bytes / (current_credits * credit_size_bytes)
  const totalCreditCapacityBytes = currentCredits > 0 ? currentCredits * creditSizeBytes : 0;
  const usageRatio = totalCreditCapacityBytes > 0 ? activeBytes / totalCreditCapacityBytes : 0;
  const usagePercentage = Math.min(100, Math.max(0, usageRatio * 100));

  const formattedUsagePct =
    activeBytes > 0 && usagePercentage < 0.01
      ? '< 0.01%'
      : `${usagePercentage.toFixed(2)}%`;

  // Estimate monthly value strictly from current_credits * credit_monthly_price
  const estimatedMonthlyStorage = currentCredits * parseFloat(creditMonthlyPrice || 0);

  return (
    <div
      className="panel settings-panel-card storage-media-section"
      id="storage-media-section"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-card, #ffffff)',
        padding: '24px',
        marginTop: '28px',
      }}
    >
      {/* SECTION HEADER */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border, #f1f5f9)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)' }}>
              Storage & Media
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Billing status badge */}
          {billingEnabled ? (
            <span
              className="badge"
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
              }}
            >
              Storage billing active
            </span>
          ) : (
            <span
              className="badge"
              style={{
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #dbeafe',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
              }}
              title="Storage tracking is active for usage insights while billing charges are currently disabled."
            >
              Usage tracking active · Billing disabled
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchStorageData(true)}
            disabled={refreshing}
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            title="Refresh storage metrics"
            aria-label="Refresh storage metrics"
          >
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1: Storage Used */}
        <div
          className="storage-metric-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: 'var(--bg-card-nested, #f8fafc)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Storage Used
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
            {formatStorageBytes(activeBytes)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
            {activeGb} GB active
          </div>
        </div>

        {/* Metric 2: Current Credits */}
        <div
          className="storage-metric-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: 'var(--bg-card-nested, #f8fafc)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Current Credits
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', marginTop: '6px' }}>
            {currentCredits} {currentCredits === 1 ? 'credit' : 'credits'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
            1 credit = {formatStorageBytes(creditSizeBytes)}
          </div>
        </div>

        {/* Metric 3: Storage Rate */}
        <div
          className="storage-metric-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: 'var(--bg-card-nested, #f8fafc)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Storage Rate
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
            {formatCurrencyAmount(creditMonthlyPrice, currency)}
            <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-light)' }}> / credit / mo</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
            Storage usage is metered daily.
          </div>
        </div>

        {/* Metric 4: Files Tracked */}
        <div
          className="storage-metric-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: 'var(--bg-card-nested, #f8fafc)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tracked Files
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
            {activeFiles} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-light)' }}>active</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
            {deletedFiles} historical
          </div>
        </div>
      </div>

      {/* HORIZONTAL CREDIT-USAGE VISUAL (IPHONE-STYLE) */}
      <div
        className="storage-sub-panel"
        style={{
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>
              Current credit usage
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginLeft: '8px' }}>
              {formatStorageBytes(activeBytes)} currently tracked · {currentCredits} billing {currentCredits === 1 ? 'credit' : 'credits'}
            </span>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>
            {formattedUsagePct}
          </span>
        </div>

        {/* Progress meter bar */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(usagePercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Current credit usage"
          style={{
            width: '100%',
            height: '14px',
            backgroundColor: 'var(--border, #e2e8f0)',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {activeBytes > 0 && sourceBreakdown.length > 0 ? (
            sourceBreakdown.map((src, idx) => {
              const srcBytes = Number(src.bytes || 0);
              if (srcBytes <= 0 || totalCreditCapacityBytes <= 0) return null;
              const segmentPct = (srcBytes / totalCreditCapacityBytes) * 100;
              const modKey = src.source_module || 'projects';
              return (
                <div
                  key={`${modKey}-${idx}`}
                  title={`${getSourceModuleTitle(modKey)}: ${formatStorageBytes(srcBytes)}`}
                  style={{
                    width: `${Math.max(0.5, segmentPct)}%`,
                    backgroundColor: getModuleColor(modKey),
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}
                />
              );
            })
          ) : activeBytes > 0 ? (
            <div
              style={{
                width: `${Math.max(0.5, usagePercentage)}%`,
                backgroundColor: '#2563eb',
                height: '100%',
                transition: 'width 0.3s ease',
              }}
            />
          ) : (
            <div style={{ width: '0%', height: '100%' }} />
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            marginTop: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-light)',
          }}
        >
          {sourceBreakdown.map((src, idx) => {
            const modKey = src.source_module || 'projects';
            return (
              <div key={`${modKey}-legend-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: getModuleColor(modKey),
                  }}
                  aria-hidden="true"
                />
                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                  {getSourceModuleTitle(modKey)}
                </span>
                <span>({formatStorageBytes(src.bytes)})</span>
              </div>
            );
          })}
          {currentCredits > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--border, #e2e8f0)',
                }}
                aria-hidden="true"
              />
              <span>Current credit block</span>
            </div>
          )}
        </div>
      </div>

      {/* TWO-COLUMN LOWER SECTION: MODULE BREAKDOWN & RATE / ESTIMATE */}
      <div
        className="storage-media-lower-grid"
        style={{
          display: 'grid',
          gap: '20px',
          marginBottom: '24px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Source Breakdown */}
        <div
          className="storage-sub-panel"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <h4
            style={{
              margin: '0 0 14px',
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Storage by Module</span>
          </h4>

          {sourceBreakdown.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-light)' }}>
              No module storage tracked yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sourceBreakdown.map((src, idx) => {
                const srcBytes = Number(src.bytes || 0);
                const pctOfActive =
                  activeBytes > 0 ? ((srcBytes / activeBytes) * 100).toFixed(1) : '0.0';
                const modKey = src.source_module || 'projects';

                return (
                  <div
                    key={`${modKey}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card-nested, #f8fafc)',
                      border: '1px solid var(--border, #f1f5f9)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          backgroundColor: getModuleColor(modKey),
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {getSourceModuleTitle(modKey)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                          {src.active_files || 0} {(src.active_files || 0) === 1 ? 'file' : 'files'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {formatStorageBytes(srcBytes)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                        {pctOfActive}% of active
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Storage Configuration & Current Estimate */}
        <div
          className="storage-sub-panel"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <div>
            <h4
              style={{
                margin: '0 0 14px',
                fontSize: '1rem',
                fontWeight: '700',
                color: 'var(--text-main)',
              }}
            >
              Storage Credit Configuration
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                <span style={{ color: 'var(--text-light)' }}>Billing unit size</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                  1 Credit = {formatStorageBytes(creditSizeBytes)} ({creditSizeBytes / 1000000000} GB)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                <span style={{ color: 'var(--text-light)' }}>Monthly credit price</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                  {formatCurrencyAmount(creditMonthlyPrice, currency)} / month
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                <span style={{ color: 'var(--text-light)' }}>Status</span>
                <span style={{ fontWeight: '600', color: billingEnabled ? '#15803d' : '#1e40af' }}>
                  {billingEnabled ? 'Billing Active' : 'Usage Tracking (Billing Disabled)'}
                </span>
              </div>
            </div>
          </div>

          {/* Current credit value preview (strictly labeled as estimate) */}
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card-nested, #f8fafc)',
              border: '1px dashed var(--border, #cbd5e1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                  Estimated monthly storage at current usage
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                  Calculated as {currentCredits} credit × {formatCurrencyAmount(creditMonthlyPrice, currency)} (estimate only)
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                {formatCurrencyAmount(estimatedMonthlyStorage, currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY STORAGE USAGE HISTORY */}
      <div
        className="storage-sub-panel"
        style={{
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
          backgroundColor: 'var(--bg-card, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: '700', color: 'var(--text-main)' }}>
            Daily Storage History
          </h4>
        </div>

        {history.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card-nested, #f8fafc)',
              borderRadius: '8px',
              border: '1px dashed var(--border, #cbd5e1)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 10px', display: 'block' }}
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
              No daily storage history yet.
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-light)' }}>
              Usage history will appear here once daily metering snapshots are available.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Billable Storage</th>
                  <th>Storage Credits</th>
                  <th>Status</th>
                  <th>Storage Charge</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => {
                  const billableGb = row.billable_gb || '0.0000';
                  const rowCredits = row.storage_credits || 0;
                  const isFinalized = Boolean(row.is_finalized);
                  const charge = row.storage_charge || '0.00';

                  return (
                    <tr key={row.date || idx}>
                      <td>{row.date || '—'}</td>
                      <td style={{ fontWeight: '600' }}>{billableGb} GB</td>
                      <td>{rowCredits} {rowCredits === 1 ? 'credit' : 'credits'}</td>
                      <td>
                        <span
                          className={`badge ${isFinalized ? 'badge-success' : 'badge-pending'}`}
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          {isFinalized ? 'Finalized' : 'Provisional (estimated)'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: isFinalized ? 'var(--text-main)' : 'var(--text-light)' }}>
                        {formatCurrencyAmount(charge, summary?.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .storage-media-lower-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 860px) {
          .storage-media-lower-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 480px) {
          :global(.storage-sub-panel) {
            padding: 14px 10px !important;
          }
        }

        :global(:root.dark) .storage-media-section,
        :global(:root.dark) .storage-sub-panel {
          background-color: var(--bg-card, #1e293b) !important;
          border-color: var(--border, #334155) !important;
          color: var(--text-main, #f8fafc) !important;
        }
        :global(:root.dark) .storage-metric-card {
          background-color: var(--bg-card-nested, #0f172a) !important;
          border-color: var(--border, #334155) !important;
        }
      `}</style>
    </div>
  );
}
