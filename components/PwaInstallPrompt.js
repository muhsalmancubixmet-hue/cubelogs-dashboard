'use client';

import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    const isSavedInstalled = localStorage.getItem('cubelogs_pwa_installed') === 'true';

    if (isStandalone || isSavedInstalled) {
      return;
    }

    // 2. Check if recently dismissed in this session
    const isDismissed = sessionStorage.getItem('cubelogs_pwa_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // 3. Listen to beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // 4. Listen to appinstalled event
    const handleAppInstalled = () => {
      localStorage.setItem('cubelogs_pwa_installed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback hint for browsers that don't support beforeinstallprompt (e.g. iOS Safari)
      alert("To install CubeLogs, tap your browser's share or menu icon and select 'Add to Home Screen' or 'Install App'.");
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        localStorage.setItem('cubelogs_pwa_installed', 'true');
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('cubelogs_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <aside aria-label="Install CubeLogs App" className="pwa-install-banner">
      <div className="pwa-install-left">
        <div className="pwa-app-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="pwa-text-col">
          <strong>Install CubeLogs App</strong>
          <span>Install on your desktop or device for lightning-fast access and offline sync.</span>
        </div>
      </div>

      <div className="pwa-actions-group">
        <button
          type="button"
          className="pwa-btn-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss install notification"
        >
          Later
        </button>
        <button
          type="button"
          className="pwa-btn-install"
          onClick={handleInstallClick}
          disabled={isInstalling}
        >
          {isInstalling ? 'Installing...' : 'Install App'}
        </button>
      </div>

      <style jsx>{`
        .pwa-install-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99998;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          width: 90%;
          max-width: 580px;
          padding: 14px 20px;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          animation: slideUpPrompt 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .pwa-install-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .pwa-app-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #2563eb;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pwa-text-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pwa-text-col strong {
          font-size: 0.9rem;
          font-weight: 700;
          color: #ffffff;
        }

        .pwa-text-col span {
          font-size: 0.78rem;
          color: #94a3b8;
          line-height: 1.3;
        }

        .pwa-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .pwa-btn-dismiss {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 7px 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.15s ease;
        }

        .pwa-btn-dismiss:hover {
          color: #ffffff;
        }

        .pwa-btn-install {
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #3b82f6;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
          transition: background 0.15s ease;
        }

        .pwa-btn-install:hover {
          background: #1d4ed8;
        }

        @keyframes slideUpPrompt {
          from {
            transform: translate(-50%, 30px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .pwa-install-banner {
            flex-direction: column;
            align-items: flex-start;
            bottom: 16px;
            width: calc(100% - 32px);
            gap: 14px;
            padding: 14px 16px;
          }

          .pwa-actions-group {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </aside>
  );
}
