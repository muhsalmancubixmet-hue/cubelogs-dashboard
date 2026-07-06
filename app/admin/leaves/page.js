'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectConfigureLeaves() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leaves?tab=manage');
  }, [router]);

  return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
      Redirecting to Leave Management Center...
    </div>
  );
}
