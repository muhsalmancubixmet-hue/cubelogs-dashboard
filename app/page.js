'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { currentUser, isInitialized } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (currentUser) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [currentUser, isInitialized, router]);

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span className="loading-text">Redirecting...</span>
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
