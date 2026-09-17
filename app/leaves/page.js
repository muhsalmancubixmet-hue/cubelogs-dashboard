'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LeavesRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'approve') {
      router.replace('/attendance?tab=leaves-approve');
    } else if (tabParam === 'manage') {
      router.replace('/attendance?tab=leaves-manage');
    } else {
      router.replace('/attendance?tab=leaves-apply');
    }
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        Redirecting to Leave Portal...
      </div>
    </div>
  );
}

export default function LeavesRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
        Redirecting...
      </div>
    }>
      <LeavesRedirectContent />
    </Suspense>
  );
}

