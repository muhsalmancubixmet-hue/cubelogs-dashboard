'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BACKEND_BASE_URL } from '@/lib/api';

function RevokeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing revocation token.');
      return;
    }

    const revokeRegistration = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/employees/revoke/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Registration successfully revoked.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to revoke registration.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error occurred while revoking registration.');
      }
    };

    revokeRegistration();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4">
      <div className="bg-[#131A2A] border border-[#1E293B] p-8 rounded-xl max-w-md w-full text-center shadow-xl">
        <h1 className="text-2xl font-semibold mb-6 text-white">Account Revocation</h1>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Processing your request...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-emerald-500 bg-emerald-500/10 p-4 rounded-lg mb-6 border border-emerald-500/20">
              {message}
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Your account has been deleted and access has been revoked.
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div>
             <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-rose-500 bg-rose-500/10 p-4 rounded-lg mb-6 border border-rose-500/20">
              {message}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[#1E293B]">
          <Link href="/login" className="inline-flex items-center space-x-2 text-[#3B82F6] hover:text-[#60A5FA] transition-colors font-medium">
            <span>Return to Login</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RevokePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">Loading...</div>}>
      <RevokeContent />
    </Suspense>
  );
}
