'use client';

import React, { useState, useEffect } from 'react';

export default function PwaUpdater() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleWaiting = (worker) => {
      setWaitingWorker(worker);
      setHasUpdate(true);
    };

    // 1. Get current registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Check if there is already a waiting worker
      if (reg.waiting) {
        handleWaiting(reg.waiting);
      }

      // Check for updates periodically or on transition
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleWaiting(newWorker);
          }
        });
      });
    });

    // 2. Controller change - reload page once skipWaiting has completed and new SW active
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Send signal to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload if worker isn't immediately found
      window.location.reload();
    }
  };

  if (!hasUpdate) return null;

  return (
    <div className="pwa-update-toast">
      <div className="pwa-update-content">
        <span className="pwa-update-icon">✨</span>
        <div className="pwa-update-text">
          <strong>New Version Available</strong>
          <span>A new version of CubeLogs is ready.</span>
        </div>
      </div>
      <button className="btn btn-primary btn-sm pwa-update-btn" onClick={handleUpdate}>
        Update Now
      </button>

      <style jsx>{`
        .pwa-update-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-width: 320px;
          max-width: 420px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-premium);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          color: var(--text-main);
        }

        .pwa-update-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pwa-update-icon {
          font-size: 1.4rem;
        }

        .pwa-update-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pwa-update-text strong {
          font-family: var(--font-heading);
          font-size: 0.88rem;
          font-weight: 600;
        }

        .pwa-update-text span {
          font-size: 0.78rem;
          color: var(--text-light);
        }

        .pwa-update-btn {
          white-space: nowrap;
          padding: 8px 14px;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: var(--radius-md);
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .pwa-update-toast {
            bottom: 16px;
            left: 16px;
            right: 16px;
            min-width: 0;
            max-width: none;
            padding: 12px 14px;
          }
        }
      `}</style>
    </div>
  );
}
