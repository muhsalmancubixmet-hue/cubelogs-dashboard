'use client';

import React, { useEffect, Suspense } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { WarningIcon } from './Icons';
import OnboardingDashboard from './OnboardingDashboard';

export default function PageWrapper({ children, title, requiredPermission }) {
  const { 
    currentUser, 
    authStatus, 
    orgProfileStatus, 
    fetchInitialData, 
    hasPermission, 
    sidebarOpen, 
    setSidebarOpen, 
    brandLogo, 
    officeLocations, 
    logout 
  } = useApp();
  const router = useRouter();

  const isUnpaid = currentUser?.subscription?.subscriptionStatus === 'Unpaid' || currentUser?.subscription?.subscriptionStatus === 'Restricted';

  const isAllowedPathForUnpaid = () => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (path === '/dashboard') return true;
    if (path === '/admin/settings' && tab === 'billing') return true;
    return false;
  };

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (authStatus === 'authenticated' && currentUser && isUnpaid && !isAllowedPathForUnpaid()) {
      router.replace('/dashboard');
    }
  }, [currentUser, authStatus, isUnpaid, router]);

  const isLoading =
    authStatus === 'loading' ||
    (authStatus === 'authenticated' && (orgProfileStatus === 'idle' || orgProfileStatus === 'loading'));

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span className="loading-text">Loading CubeLogs...</span>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            font-family: var(--font-sans);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--primary-border);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          .loading-text {
            color: var(--primary-dark);
            font-weight: 600;
            font-size: 1.1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !currentUser) {
    return null; // redirecting
  }

  if (orgProfileStatus === 'error') {
    return (
      <div className="loading-container">
        <div className="panel alert-box alert-box-danger" style={{ maxWidth: '460px', textAlign: 'center', margin: '0 20px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--danger)' }}>
            <WarningIcon size={40} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Workspace Data Error</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: '1.5', margin: 0 }}>
            We encountered a temporary network or server error while retrieving your organization profile.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fetchInitialData(currentUser)}
            style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px' }}
          >
            Retry Loading
          </button>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            font-family: var(--font-sans);
          }
        `}</style>
      </div>
    );
  }

  if (orgProfileStatus === 'loaded') {
    // Completeness check for organization profile
    const primaryLoc = officeLocations.find(loc => loc.isPrimary) || officeLocations[0];
    const hasCustomLogo = !!brandLogo;
    const hasCustomLocation = primaryLoc && !(primaryLoc.name === 'Head Office' && primaryLoc.lat === 11.1143 && primaryLoc.lon === 76.2274);
    const isProfileComplete = hasCustomLogo && hasCustomLocation;

    if (!isProfileComplete) {
      if (currentUser.isSuperAdmin) {
        return (
          <Suspense fallback={<div style={{ color: 'white', padding: '40px' }}>Loading setup parameters...</div>}>
            <OnboardingDashboard />
          </Suspense>
        );
      } else {
        // Regular user - block access with information screen
        return (
          <div className="onboard-overlay" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #0b1528 0%, #030712 100%)',
            fontFamily: 'var(--font-sans)',
            padding: '24px',
            color: '#ffffff',
            textAlign: 'center'
          }}>
            <div className="onboard-card" style={{
              width: '100%',
              maxWidth: '460px',
              background: 'rgba(17, 28, 46, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              <span style={{ fontSize: '3rem' }}>⏳</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Workspace Setup In Progress</h1>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                Your administrator has not completed the workspace onboarding registration yet. Please verify with your admin to finalize the system activation.
              </p>
              <button 
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }} 
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        );
      }
    }
  }

  // Permission Guard Check
  const hasPageAccess = () => {
    if (!requiredPermission) return true;
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(perm => hasPermission(perm));
    }
    return hasPermission(requiredPermission);
  };

  if (!hasPageAccess()) {
    return (
      <div className="app-container">
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Suspense fallback={<div className="sidebar-placeholder" style={{ width: '280px', backgroundColor: '#0b1528' }} />}>
          <Sidebar />
        </Suspense>
        <div className="main-content">
          <div className="main-content-inner">
            <Header title="Access Denied" />
            <div className="panel alert-box alert-box-danger" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '32px' }}>
              <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WarningIcon size={36} />
              </div>
              <h2>Restricted Area</h2>
              <p>You do not have the authorization credentials required to access this portal.</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)' }}>
                Required Permission Flag: <code>{Array.isArray(requiredPermission) ? requiredPermission.join(' or ') : requiredPermission}</code>
              </p>
              <div>
                <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Suspense fallback={<div className="sidebar-placeholder" style={{ width: '280px', backgroundColor: '#0b1528' }} />}>
        <Sidebar />
      </Suspense>
      <div className="main-content">
        <div className="main-content-inner">
          <Header title={title} />
          {children}
        </div>
      </div>
    </div>
  );
}
