'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/Icons';

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { magicLogin } = useApp();
  const [status, setStatus] = useState('Verifying your magic link...');
  const [error, setError] = useState(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid link. No token provided.');
      return;
    }

    const verify = async () => {
      const result = await magicLogin(token);
      if (result.success) {
        setStatus('Authentication successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError(result.message);
      }
    };
    
    // Add artificial delay for smooth UI transition
    setTimeout(verify, 800);
  }, [searchParams, magicLogin, router]);

  return (
    <div className="verify-page-container">
      <div className="verify-card">
        <div className="brand-logo" style={{ color: 'var(--primary)', marginBottom: '20px' }}>
          <BrandLogo size={64} />
        </div>
        
        {error ? (
          <div className="error-state">
            <h2 className="error-title">Link Expired or Invalid</h2>
            <p className="error-message">{error}</p>
            <button 
              onClick={() => router.push('/login')} 
              className="btn btn-primary login-btn"
            >
              Go to Standard Login
            </button>
          </div>
        ) : (
          <div className="loading-state">
            <h2>{status}</h2>
            <div className="loader-container">
              <span className="loader-dot pulse1"></span>
              <span className="loader-dot pulse2"></span>
              <span className="loader-dot pulse3"></span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .verify-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, rgba(30, 58, 138, 0.15) 100%), #f8fafc;
          padding: 20px;
          font-family: var(--font-sans);
        }

        .verify-card {
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

        .error-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          color: var(--danger);
          margin-bottom: 12px;
        }

        .error-message {
          color: var(--text-muted);
          margin-bottom: 24px;
        }

        .login-btn {
          width: 100%;
          padding: 12px 18px;
          font-size: 0.95rem;
          height: 48px;
        }

        .loading-state h2 {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          color: var(--text-main);
          margin-bottom: 24px;
        }

        .loader-container {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .loader-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: var(--primary);
          display: inline-block;
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
      `}</style>
    </div>
  );
}

export default function VerifyMagicLink() {
  return (
    <Suspense fallback={null}>
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
