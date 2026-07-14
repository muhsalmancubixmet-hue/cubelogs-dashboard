'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LeavesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab') || 'apply';
    let targetTab = 'leaves-apply';
    if (tab === 'approve') {
      targetTab = 'leaves-approve';
    } else if (tab === 'manage') {
      targetTab = 'leaves-manage';
    } else if (tab.startsWith('leaves-')) {
      targetTab = tab;
    }
    router.replace(`/attendance?tab=${targetTab}`);
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-app)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',
      fontWeight: '600'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--primary-border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px'
        }} />
        Redirecting to Leave Management...
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LeavesRedirectPage() {
  return (
    <Suspense fallback={null}>
      <LeavesRedirect />
    </Suspense>
  );
}
