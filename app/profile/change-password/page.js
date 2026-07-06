'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackIcon, ShieldIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';
import { apiFetch } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { showAlert, updateAuthSession, logout } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      // Update stored session tokens
      updateAuthSession(response.access, response.refresh, response.user);

      // Show success notification modal
      showAlert('Password updated successfully!', 'Success', 'success');

      // Redirect back to profile page
      router.push('/profile');
    } catch (err) {
      setFormError(err.message || 'Failed to update your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper title="Change Account Password" requiredPermission="dashboard">
      <div className="change-password-wrapper">
        <div className="nav-row" style={{ marginBottom: '20px' }}>
          <Link href="/profile" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <BackIcon size={14} />
            <span>Back to Profile</span>
          </Link>
        </div>

        <div className="panel form-panel-card">
          <div className="form-header">
            <ShieldIcon size={28} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            <h3>Update Password Credentials</h3>
            <p className="subtitle">Enter your current credentials to verify ownership, then establish your new password.</p>
          </div>

          <form onSubmit={handleSubmit} className="password-form">
            {formError && <div className="error-banner">{formError}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="current-password">Current Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  tabIndex="-1"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                  {showCurrentPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex="-1"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
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
                  {showNewPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                  {showConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className={`btn btn-primary submit-btn ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating Credentials...' : 'Save Changes'}
              </button>
              <div className="forgot-password-row">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => { logout(); }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .change-password-wrapper {
          max-width: 520px;
          margin: 0 auto;
        }

        .form-panel-card {
          padding: 36px 32px !important;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }

        .form-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 28px;
        }

        .form-header h3 {
          font-size: 1.3rem;
          font-weight: 750;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .subtitle {
          font-size: 0.85rem;
          color: var(--text-light);
          line-height: 1.45;
        }

        .password-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .form-input {
          width: 100%;
          padding: 11px 14px;
          font-size: 0.92rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          background-color: var(--bg-app);
        }

        .form-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .error-banner {
          background-color: #fef2f2;
          color: #dc2626;
          padding: 11px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
          border-left: 4.5px solid #dc2626;
          line-height: 1.4;
        }

        .form-actions {
          margin-top: 10px;
        }

        .submit-btn {
          width: 100%;
          padding: 12px 18px;
          font-size: 0.95rem;
          font-weight: 600;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .forgot-password-row {
          display: flex;
          justify-content: center;
          margin-top: 14px;
        }

        .forgot-password-link {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--primary);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease, opacity 0.15s ease;
        }

        .forgot-password-link:hover {
          opacity: 0.75;
        }
      `}</style>
    </PageWrapper>
  );
}
