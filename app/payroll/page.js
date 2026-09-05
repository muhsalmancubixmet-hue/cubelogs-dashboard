'use client';

import React, { Suspense } from 'react';
import PageWrapper from '@/components/PageWrapper';
import PayrollContent from '@/components/modules/PayrollContent';

export default function PayrollPage() {
  return (
    <PageWrapper
      title="Monthly Payroll"
      requiredPermission={['payroll:view', 'payroll:process', 'payroll:manage']}
    >
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary, #0284c7)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading monthly payroll...</span>
        </div>
      }>
        <PayrollContent />
      </Suspense>
    </PageWrapper>
  );
}
