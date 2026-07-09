'use client';

import { Suspense } from 'react';
import HolidaysContent from '@/components/modules/HolidaysContent';

export default function HolidaysPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Holiday Calendar...
        </div>
      </div>
    }>
      <HolidaysContent />
    </Suspense>
  );
}
