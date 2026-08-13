'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import ProjectAccessDenied from '../../features/projects/components/ProjectAccessDenied';

export default function ProjectsLayout({ children }) {
  const { currentUser, isInitialized, hasPermission } = useApp();

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary, #3b82f6)' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--primary-border, #bfdbfe)',
              borderTop: '3px solid var(--primary, #3b82f6)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading Project Access...
        </div>
      </div>
    );
  }

  const isProjectEnabled =
    currentUser?.subscription?.is_project_enabled !== undefined
      ? Boolean(currentUser.subscription.is_project_enabled)
      : currentUser?.is_project_enabled !== undefined
      ? Boolean(currentUser.is_project_enabled)
      : true;

  if (!isProjectEnabled) {
    return <ProjectAccessDenied reason="disabled" />;
  }

  const canViewProjects = currentUser?.isSuperAdmin || hasPermission('projects:view');
  if (!canViewProjects) {
    return <ProjectAccessDenied reason="unauthorized" />;
  }

  return <>{children}</>;
}
