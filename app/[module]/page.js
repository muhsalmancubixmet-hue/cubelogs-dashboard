'use client';

import React, { useContext, Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { AppContext } from '../../context/AppContext';
import ModuleRegistry from '../../components/ModuleRegistry';
import PageWrapper from '../../components/PageWrapper';

function ModulePageContent({ moduleSlug, permissionsRegistry }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || '';

  // Look up the module config
  const moduleConfig = permissionsRegistry?.modules?.find(m => m.id === moduleSlug);

  if (!moduleConfig) {
    return notFound();
  }

  // Look up matching capability for this path & tab
  const matchingCap = moduleConfig.functional_capabilities?.find(cap => {
    return (cap.tab || '') === activeTab;
  });

  // If no matching capability is found, fallback to all capability IDs for the module (requires ANY)
  const requiredPermission = matchingCap
    ? matchingCap.id
    : (moduleConfig.functional_capabilities?.map(c => c.id) || '');

  // Check if we have a specific React component registered
  const ModuleComponent = ModuleRegistry[moduleSlug];

  if (ModuleComponent) {
    return (
      <PageWrapper
        title={moduleConfig.metadata?.name || 'System Module'}
        requiredPermission={requiredPermission}
        requiredSubscriptionFlag={moduleConfig.metadata?.required_subscription_flag}
      >
        <ModuleComponent />
      </PageWrapper>
    );
  }

  // If a new module is added to permission.json without React code deployed yet,
  // we render a fallback layout. (Per user instructions, they will manually build later)
  return (
    <PageWrapper 
      title={moduleConfig.metadata?.name || 'System Module'} 
      requiredPermission={requiredPermission}
      requiredSubscriptionFlag={moduleConfig.metadata?.required_subscription_flag}
    >
      <div className="module-fallback-panel">
        <div className="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h2>{moduleConfig.metadata?.name || 'Module Active'}</h2>
        <p>This module has been configured in the system registry.</p>
        <div className="alert-banner">
          Frontend UI components have not yet been mapped for this operational module.
        </div>

        <style jsx>{`
          .module-fallback-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 20px;
            background: white;
            border-radius: var(--radius-lg);
            border: 1px dashed var(--border);
            text-align: center;
            max-width: 600px;
            margin: 40px auto;
          }
          .icon-wrapper {
            background: var(--primary-light);
            color: var(--primary);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 1.5rem;
            color: var(--text-main);
            margin-bottom: 8px;
          }
          p {
            color: var(--text-muted);
            margin-bottom: 24px;
          }
          .alert-banner {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #d97706;
            padding: 12px 20px;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}

export default function ModulePage({ params }) {
  const resolvedParams = React.use(params);
  const { module: moduleSlug } = resolvedParams;
  const { permissionsRegistry, isInitialized } = useContext(AppContext);

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Module Configuration...
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Module...
        </div>
      </div>
    }>
      <ModulePageContent moduleSlug={moduleSlug} permissionsRegistry={permissionsRegistry} />
    </Suspense>
  );
}

