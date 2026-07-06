'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/Icons';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { validateResetToken, confirmPasswordReset } = useApp();

  const [token, setToken] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState(null);

  // Form states
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validationAttempted = useRef(false);

  useEffect(() => {
    if (validationAttempted.current) return;
    validationAttempted.current = true;

    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setTokenError('Invalid link. No password recovery token was provided.');
      setIsValidating(false);
      return;
    }

    setToken(tokenParam);

    const verifyToken = async () => {
      const result = await validateResetToken(tokenParam);
      setIsValidating(false);
      if (!result.success) {
        setTokenError(result.message || 'Your reset link is expired or invalid. Recovery links are only active for 2 minutes.');
      }
    };

    // Minor delay for premium feel micro-animation
    setTimeout(verifyToken, 800);
  }, [searchParams, validateResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== passwordConfirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      const result = await confirmPasswordReset(token, password, passwordConfirm);
      setIsSubmitting(false);
  
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setFormError(result.message || 'Failed to update your password. Please try again.');
      }
    }, 800);
  };

  return (
    <div className="reset-page-container">
      <div className="reset-card">
        <div className="brand-logo" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-flex' }}>
          <BrandLogo size={56} />
        </div>

        {isValidating ? (
          <div className="state-container">
            <h2 className="state-title">Verifying Recovery Token</h2>
            <p className="state-desc">Securing your session. Please wait...</p>
            <div className="loader-container">
              <span className="loader-dot pulse1"></span>
              <span className="loader-dot pulse2"></span>
              <span className="loader-dot pulse3"></span>
            </div>
          </div>
        ) : tokenError ? (
          <div className="state-container">
            <h2 className="state-title error">Link Expired or Invalid</h2>
            <p className="state-desc">{tokenError}</p>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-primary action-btn"
            >
              Return to Login
            </button>
          </div>
        ) : isSuccess ? (
          <div className="state-container">
            <div className="success-badge-icon">✓</div>
            <h2 className="state-title success">Password Updated!</h2>
            <p className="state-desc">Your password has been successfully reset. Redirecting you to the workspace login page...</p>
            <div className="loader-container" style={{ marginTop: '15px' }}>
              <span className="loader-dot pulse1"></span>
              <span className="loader-dot pulse2"></span>
              <span className="loader-dot pulse3"></span>
            </div>
          </div>
        ) : (
          <div className="state-container">
            <h2 className="state-title">Create New Password</h2>
            <p className="state-desc">Set a secure password for your CubeLogs account.</p>

            <form onSubmit={handleSubmit} className="reset-form">
              {formError && <div className="error-banner">{formError}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="Repeat new password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary action-btn ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="loader-dot-white"></span> : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .reset-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, rgba(30, 58, 138, 0.15) 100%), #f8fafc;
          padding: 20px;
          font-family: var(--font-sans);
        }

        .reset-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.1);
          border-radius: var(--radius-lg);
          padding: 40px 32px;
          text-align: center;
          animation: slideIn 0.4s ease-out;
        }

        .state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .state-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 750;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        .state-title.error {
          color: var(--danger);
        }

        .state-title.success {
          color: var(--primary);
        }

        .state-desc {
          font-size: 0.86rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .reset-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .form-group {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 0.92rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          outline: none;
          transition: border-color 0.15s ease;
        }

        .form-input:focus {
          border-color: var(--primary);
        }

        .error-banner {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 500;
          border-left: 3px solid var(--danger);
          width: 100%;
        }

        .action-btn {
          width: 100%;
          padding: 12px 18px;
          font-size: 0.95rem;
          height: 48px;
          margin-top: 8px;
        }

        .success-badge-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          font-weight: bold;
          margin-bottom: 18px;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
        }

        .loader-container {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }

        .loader-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: var(--primary);
          display: inline-block;
        }

        .loader-dot-white {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: white;
          display: inline-block;
          animation: dotPulseWhite 0.8s infinite ease-in-out;
        }

        .pulse1 { animation: dotPulse 1.4s infinite ease-in-out both; }
        .pulse2 { animation: dotPulse 1.4s infinite ease-in-out both; animation-delay: 0.2s; }
        .pulse3 { animation: dotPulse 1.4s infinite ease-in-out both; animation-delay: 0.4s; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        @keyframes dotPulseWhite {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
