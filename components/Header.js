'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from 'next/navigation';
import { MenuIcon } from './Icons';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function Header({ title }) {
  const { currentUser, logout, setSidebarOpen, subscriptionDays } = useApp();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!currentUser) return null;

  const subInfo = currentUser?.subscription;
  const isWarningActive = currentUser?.isSuperAdmin && (subInfo?.warningActive || (subInfo?.secondsRemaining !== undefined && subInfo.secondsRemaining <= 300 && subInfo.secondsRemaining > 0));
  const secondsRemaining = subInfo?.secondsRemaining || 0;
  const showNormalWarning = currentUser?.isSuperAdmin && !isWarningActive && subscriptionDays <= 15;

  return (
    <header className="header-bar">
      <div className="header-title-section" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          className="hamburger-toggle" 
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle Sidebar"
        >
          <MenuIcon size={22} />
        </button>
        <h1>{title}</h1>
      </div>
      <div className="header-user-section">
        {isWarningActive && (
          <div className="subscription-badge warning-urgent" style={{
            marginRight: '12px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
            animation: 'pulseBorder 1.5s infinite'
          }}>
            <span className="status-pulse-dot" style={{ 
              backgroundColor: '#ef4444', 
              boxShadow: '0 0 8px #ef4444' 
            }}></span>
            <span>Warning: Subscription renewing in {secondsRemaining}s!</span>
          </div>
        )}
        {showNormalWarning && (
          <div className="subscription-badge" style={{
            marginRight: '12px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 100%)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)'
          }}>
            <span className="status-pulse-dot" style={{ 
              backgroundColor: '#ef4444', 
              boxShadow: '0 0 8px #ef4444' 
            }}></span>
            <span>Subscription ends in {subscriptionDays} days</span>
          </div>
        )}

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="theme-toggle-btn"
            aria-label="Toggle Theme"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)',
              padding: 0
            }}
          >
            {theme === 'dark' ? <Sun size={18} style={{ color: '#fbbf24' }} /> : <Moon size={18} style={{ color: '#2563eb' }} />}
          </button>
        )}
        {!mounted && (
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'var(--surface)' }} />
        )}

        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <div className="avatar-circle">
            {currentUser.profilePhoto ? (
              <img
                src={currentUser.profilePhoto}
                alt={currentUser.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
              />
            ) : (
              currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
        </Link>
      </div>

      <style jsx>{`
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(244, 247, 252, 0.75) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(210, 224, 245, 0.6);
          border-radius: var(--radius-lg);
          margin-bottom: 28px;
          box-shadow: 0 10px 30px -10px rgba(12, 30, 61, 0.07), 0 1px 3px rgba(12, 30, 61, 0.02);
          position: relative;
          z-index: 90;
          transition: all var(--transition-normal);
        }
        .header-title-section h1 {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: var(--font-heading);
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--text-main) 0%, var(--primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent !important;
          margin: 0;
        }
        :global(.main-content) .header-title-section h1 {
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }
        .header-user-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          font-family: var(--font-heading);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
          border: 2px solid white;
          cursor: pointer;
          transition: all var(--transition-normal);
          flex-shrink: 0;
        }
        .avatar-circle:hover {
          transform: scale(1.08) rotate(3deg);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }
        :global(.main-content) .avatar-circle,
        :global(.main-content) .avatar-circle * {
          color: white !important;
        }

        .hamburger-toggle {
          display: none;
          background: rgba(37, 99, 235, 0.06);
          border: 1.5px solid rgba(37, 99, 235, 0.15);
          cursor: pointer;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          padding: 0;
        }
        :global(.main-content) .hamburger-toggle {
          color: var(--primary) !important;
        }
        :global(.main-content) .hamburger-toggle:hover {
          background-color: var(--primary) !important;
          color: white !important;
          border-color: var(--primary) !important;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        :global(.main-content) .hamburger-toggle:active {
          transform: scale(0.95);
        }

        .theme-toggle-btn:hover {
          background-color: var(--primary-light) !important;
          border-color: var(--primary-border) !important;
          transform: scale(1.05);
        }
        .theme-toggle-btn:active {
          transform: scale(0.95);
        }

        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--primary);
          box-shadow: 0 0 8px var(--primary);
          animation: pulseDot 1.5s infinite;
        }

        @keyframes pulseDot {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        @keyframes pulseBorder {
          0% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { border-color: #f59e0b; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        @media (max-width: 992px) {
          .hamburger-toggle {
            display: flex;
          }
        }
        @media (max-width: 768px) {
          .header-bar {
            padding: 12px 16px;
            margin-bottom: 20px;
          }
          .header-title-section h1 {
            font-size: 1.25rem;
          }
          .subscription-badge {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .header-title-section h1 {
            font-size: 1.05rem;
            line-height: 1.2;
            white-space: normal;
            word-break: break-word;
            max-width: none;
          }
        }
      `}</style>
    </header>
  );
}
