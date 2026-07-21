'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/Icons';

export default function Login() {
  const { login, currentUser, authStatus, requestPasswordReset } = useApp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Recovery States
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, authStatus, router]);

  if (authStatus === 'loading') {
    return null; // Prevent UI flashing during session check
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // artificial delay for premium micro-interaction loader feel
    setTimeout(async () => {
      const result = await login(email, password);
      setIsLoading(false);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.message);
      }
    }, 800);
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    setTimeout(async () => {
      const result = await requestPasswordReset(recoveryEmail);
      setRecoveryLoading(false);
      if (result.success) {
        setRecoverySuccess(result.message || 'A secure reset link has been dispatched to your email.');
      } else {
        setRecoveryError(result.message);
      }
    }, 800);
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        <div className="login-brand-header">
          <div className="brand-logo" style={{ display: 'inline-flex', color: 'var(--primary)' }}>
            <BrandLogo size={48} />
          </div>
          <h1>CubeLogs</h1>
          <p>Unified Workforce Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. admin@cubelogs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryError('');
                  setRecoverySuccess('');
                  setRecoveryEmail('');
                  setIsRecoveryOpen(true);
                }}
                className="forgot-password-link"
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? <span className="loader-dot"></span> : 'Sign In to Workspace'}
          </button>
        </form>

      </div>

      {/* Password Recovery Modal */}
      {isRecoveryOpen && (
        <div className="modal-overlay" onClick={() => !recoveryLoading && setIsRecoveryOpen(false)}>
          <div className="modal-content recovery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <p>Enter your registered email address below, and we'll send you a time-sensitive link valid for 2 minutes to recover your account.</p>
            </div>

            {recoverySuccess ? (
              <div className="success-state">
                <div className="success-badge-icon">✓</div>
                <p className="success-text">{recoverySuccess}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsRecoveryOpen(false);
                    setRecoverySuccess('');
                    setRecoveryEmail('');
                  }}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="login-form">
                {recoveryError && <div className="error-banner">{recoveryError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="recovery-email">Email Address</label>
                  <input
                    id="recovery-email"
                    type="email"
                    className="form-input"
                    placeholder="e.g. user@cubelogs.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    disabled={recoveryLoading}
                    autoFocus
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsRecoveryOpen(false)}
                    disabled={recoveryLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${recoveryLoading ? 'loading' : ''}`}
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading ? <span className="loader-dot"></span> : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .login-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, rgba(30, 58, 138, 0.15) 100%), #f8fafc;
          padding: 20px;
          font-family: var(--font-sans);
        }

        .login-card-wrapper {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.1);
          border-radius: var(--radius-lg);
          padding: 40px 32px;
          animation: slideIn 0.4s ease-out;
        }

        .login-brand-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .brand-logo {
          font-size: 2.8rem;
          margin-bottom: 8px;
        }

        .login-brand-header h1 {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          color: var(--text-main);
          font-weight: 800;
          margin-bottom: 4px;
        }

        .login-brand-header p {
          font-size: 0.86rem;
          color: var(--text-muted);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .error-banner {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 500;
          border-left: 3px solid var(--danger);
          margin-bottom: 8px;
        }

        .login-btn {
          width: 100%;
          padding: 12px 18px;
          font-size: 0.95rem;
          height: 48px;
        }

        .forgot-password-link {
          transition: color 0.15s ease;
        }

        .forgot-password-link:hover {
          color: var(--primary-hover) !important;
          text-decoration: underline !important;
        }

        .recovery-modal {
          max-width: 420px;
          padding: 32px 28px;
          animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .recovery-modal h2 {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 750;
          color: var(--text-main);
          margin-bottom: 8px;
          text-align: center;
        }

        .recovery-modal p {
          font-size: 0.86rem;
          color: var(--text-muted);
          line-height: 1.5;
          text-align: center;
          margin-bottom: 24px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .modal-actions button {
          flex: 1;
          height: 42px;
        }

        .success-state {
          text-align: center;
          padding: 10px 0;
        }

        .success-badge-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 18px;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
        }

        .success-text {
          font-size: 0.92rem;
          color: var(--text-main);
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 24px !important;
        }

        .prefill-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .prefill-divider::before,
        .prefill-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }

        .prefill-divider span {
          padding: 0 10px;
        }

        .prefill-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .prefill-badge {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          text-align: left;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .prefill-badge:hover {
          border-color: var(--primary);
          background-color: var(--primary-light);
          transform: translateY(-1px);
        }

        .prefill-badge strong {
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .prefill-badge span {
          font-size: 0.68rem;
          color: var(--text-light);
        }

        .prefill-badge.admin:hover {
          border-color: #1e3a8a;
        }

        .password-toggle-btn:hover {
          color: var(--primary) !important;
        }

        /* Loader inside button */
        .loader-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: white;
          display: inline-block;
          animation: dotPulse 0.8s infinite ease-in-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

