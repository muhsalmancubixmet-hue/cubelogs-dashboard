'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { projectService } from '../../lib/services/projectService';

function TasksRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Opening Tasks Workspace...');

  useEffect(() => {
    let isMounted = true;

    async function resolveTasksRedirect() {
      try {
        // 1. Check if an explicit project ID is in the query params
        const qpProjectId = searchParams.get('projectId') || searchParams.get('project');
        if (qpProjectId) {
          try {
            localStorage.setItem('cubelogs_active_project_id', String(qpProjectId));
          } catch (e) {}

          const params = new URLSearchParams(searchParams.toString());
          params.delete('projectId');
          params.delete('project');
          const qs = params.toString();
          const target = `/projects/${qpProjectId}/tasks${qs ? `?${qs}` : ''}`;
          if (isMounted) router.replace(target);
          return;
        }

        // 2. Check localStorage for active project
        let savedProjectId = null;
        try {
          savedProjectId = localStorage.getItem('cubelogs_active_project_id');
        } catch (e) {}

        // 3. Fetch user projects to ensure saved project still exists or pick the first available project
        const pData = await projectService.getProjects();
        const projList = Array.isArray(pData) ? pData : (pData?.results || pData?.data || []);

        if (projList.length > 0) {
          let targetProjectId = savedProjectId && projList.some(p => String(p.id) === String(savedProjectId))
            ? savedProjectId
            : projList[0].id;

          try {
            localStorage.setItem('cubelogs_active_project_id', String(targetProjectId));
          } catch (e) {}

          const qs = searchParams.toString();
          const target = `/projects/${targetProjectId}/tasks${qs ? `?${qs}` : ''}`;
          if (isMounted) router.replace(target);
        } else {
          // No projects available -> redirect to projects overview
          if (isMounted) {
            setStatusMessage('No projects found. Redirecting to Projects...');
            router.replace('/projects');
          }
        }
      } catch (err) {
        console.error('Failed to resolve tasks route:', err);
        if (isMounted) router.replace('/projects');
      }
    }

    resolveTasksRedirect();
    return () => { isMounted = false; };
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      gap: 16,
      textAlign: 'center',
      fontFamily: 'inherit'
    }}>
      <div style={{
        width: 42,
        height: 42,
        border: '3px solid rgba(37, 99, 235, 0.15)',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'tasksSpin 0.75s linear infinite'
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {statusMessage}
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Connecting to your project tasks workspace...
        </p>
      </div>
      <style jsx>{`
        @keyframes tasksSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function TasksRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        color: '#64748b',
        fontSize: 14
      }}>
        Loading Tasks Workspace...
      </div>
    }>
      <TasksRedirectContent />
    </Suspense>
  );
}
