'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import AttendanceContent from './AttendanceContent';
import LeavesContent from './LeavesContent';
import HolidaysContent from './HolidaysContent';

function AttendanceRouter() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || '';

  if (tab.startsWith('leaves')) {
    return <LeavesContent />;
  }
  
  if (tab.startsWith('holidays')) {
    return <HolidaysContent />;
  }

  return <AttendanceContent />;
}

export default function AttendanceModule() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Module...
        </div>
      </div>
    }>
      <AttendanceRouter />
    </Suspense>
  );
}
