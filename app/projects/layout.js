'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import ProjectAccessDenied from '../../features/projects/components/ProjectAccessDenied';

export default function ProjectsLayout({ children }) {
  const { currentUser, isInitialized, hasPermission } = useApp();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && isInitialized) {
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
  }

  return <>{children}</>;
}
