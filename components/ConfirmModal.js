'use client';

import React, { useEffect } from 'react';

/**
 * ConfirmModal — dark-blue premium themed confirmation dialog.
 *
 * Props:
 *  isOpen    {boolean}  — whether to show the modal
 *  title     {string}   — bold heading text
 *  message   {string}   — body / description text
 *  onConfirm {fn}       — called when user clicks the confirm button
 *  onCancel  {fn}       — called when user clicks cancel or overlay
 *  confirmLabel {string} — optional label for confirm button (default: "Confirm")
 *  danger    {boolean}  — if true, confirm button is styled red (default: false → blue)
 */
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = '',
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = true,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 15, 35, 0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'cmFadeIn 0.18s ease',
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="cm-dialog-box"
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(99, 179, 237, 0.18)',
            borderRadius: '16px',
            boxShadow: '0 32px 64px -12px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset',
            padding: '32px 28px 24px',
            width: '100%',
            maxWidth: '420px',
            animation: 'cmSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Icon strip */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: danger
              ? 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: danger
              ? '0 8px 20px -4px rgba(239,68,68,0.45)'
              : '0 8px 20px -4px rgba(59,130,246,0.45)',
          }}>
            {danger ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>

          {/* Title */}
          <div
            id="cm-title"
            className="cm-title"
            style={{
              margin: '0 0 10px',
              fontSize: '1.1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </div>

          {/* Message */}
          {message && (
            <div className="cm-message" style={{
              margin: '0 0 24px',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}>
              {message}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '20px' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f1f5f9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: danger
                  ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: danger
                  ? '0 4px 12px -2px rgba(239,68,68,0.5)'
                  : '0 4px 12px -2px rgba(59,130,246,0.5)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        div.cm-dialog-box {
          color: #f8fafc !important;
        }
        div.cm-dialog-box div.cm-title {
          color: #f8fafc !important;
          font-weight: 700 !important;
        }
        div.cm-dialog-box div.cm-message {
          color: #94a3b8 !important;
        }
        div.cm-dialog-box button {
          font-family: inherit !important;
        }
      `}</style>
    </>
  );
}
