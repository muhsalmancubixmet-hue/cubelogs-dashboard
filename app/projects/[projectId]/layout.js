'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import PageWrapper from '../../../components/PageWrapper';
import { projectService } from '../../../lib/services/projectService';
import { getProjectCapabilities } from '../../../lib/permissions/projectPermissions';
import { useApp } from '../../../providers/AppProvider';
import {
  DashboardIcon,
  BacklogIcon,
  StoryIcon,
  SprintIcon,
  BoardIcon,
  TasksIcon,
  EpicIcon,
  SearchIcon,
  ShieldIcon,
} from '../../../components/Icons';

export default function SingleProjectLayout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId;
  const { currentUser } = useApp() || {};

  const [project, setProject] = useState(null);
  const [userRole, setUserRole] = useState('DEVELOPER');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    async function loadProjectData() {
      try {
        setLoading(true);
        setNotFound(false);
        const overviewData = await projectService.getProjectOverview(projectId);
        if (isMounted && overviewData?.project_header) {
          setProject(overviewData.project_header);
          setUserRole(overviewData.user_role || 'DEVELOPER');
        }
      } catch (err) {
        if (isMounted) {
          if (err.status === 404 || err.status === 403 || (err.message && err.message.includes('No Project matches'))) {
            setNotFound(true);
          } else {
            console.error("Error loading project header:", err);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProjectData();
    return () => { isMounted = false; };
  }, [projectId]);

  // Compute canonical project capabilities
  const caps = getProjectCapabilities(currentUser, userRole, currentUser?.permissions || []);

  // Construct capability-driven navigation tabs list
  const tabs = [];
  tabs.push({ label: 'Overview', path: `/projects/${projectId}`, icon: DashboardIcon });

  if (caps.canViewBacklog) {
    tabs.push({ label: 'Backlog', path: `/projects/${projectId}/backlog`, icon: BacklogIcon });
  }

  if (caps.canViewStories) {
    tabs.push({ label: 'Stories', path: `/projects/${projectId}/stories`, icon: StoryIcon });
  }

  if (caps.canViewMyTasks || caps.canViewTask) {
    tabs.push({ label: 'Tasks', path: `/projects/${projectId}/tasks`, icon: TasksIcon });
  }

  if (caps.canViewSprints) {
    tabs.push({ label: 'Sprints', path: `/projects/${projectId}/sprints`, icon: SprintIcon });
  }

  if (caps.canViewBoard) {
    tabs.push({ label: 'Board', path: `/projects/${projectId}/board`, icon: BoardIcon });
  }

  const isExactActive = (tabPath) => {
    if (tabPath === `/projects/${projectId}`) {
      return pathname === `/projects/${projectId}`;
    }
    return pathname.startsWith(tabPath);
  };

  // Route protection check for capability-restricted sub-routes
  const isBacklogRoute = pathname.endsWith('/backlog') && !caps.canViewBacklog;
  const isEpicsRoute = pathname.endsWith('/epics') && !caps.canViewEpics;
  const isRestrictedRoute = isBacklogRoute || isEpicsRoute;

  if (notFound) {
    return (
      <PageWrapper title="Project Not Found" requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 320, gap: 16, textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b' }}>
            <SearchIcon size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Project Not Found or Access Denied
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            This project does not exist or you do not have permission to view it.
          </p>
          <Link href="/projects" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 8,
            background: '#2563eb', color: '#fff',
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
            marginTop: 8
          }}>
            ← Back to Projects List
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={project?.name ? `Project Management - ${project.name}` : "Project Management"} requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
      <div style={{ marginBottom: 20 }}>
        {/* Breadcrumb Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 12, flexWrap: 'wrap' }}>
          <Link href="/projects" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            Projects Workspace
          </Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {loading ? 'Loading...' : `${project?.name || 'Project'} (${project?.key || 'SCRUM'})`}
          </span>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 12,
            background: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
          }}>
            Role: {userRole.replace('_', ' ')}
          </span>
          {project?.active_sprint_name && (
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <SprintIcon size={12} color="#2563eb" /> {project.active_sprint_name}
            </span>
          )}
        </div>

        {/* Project Header Title Banner */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0
            }}>
              <TasksIcon size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.45rem)', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.01em', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {project?.name || 'Project Workspace'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: 4 }}>
                  {project?.key || 'PRJ'}
                </span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  PM: <strong>{project?.project_manager_name || 'Unassigned'}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  Team Lead: <strong>{project?.team_lead_name || 'Unassigned'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Level Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid #e2e8f0',
          marginTop: 16,
          overflowX: 'auto',
          paddingBottom: 0,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}>
          {tabs.map((tab) => {
            const active = isExactActive(tab.path);
            const IconComponent = tab.icon;
            return (
              <Link
                key={tab.label}
                href={tab.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 600,
                  color: active ? '#2563eb' : '#64748b',
                  background: active ? '#eff6ff' : 'transparent',
                  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {isRestrictedRoute ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          margin: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', marginBottom: 12 }}>
            <ShieldIcon size={32} />
          </div>
          <h3 style={{ fontSize: 18, color: '#0f172a', fontWeight: 700, margin: '0 0 8px' }}>
            Access Restricted (403)
          </h3>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            You do not have permission to view this section of the project workspace.
          </p>
          <Link href={`/projects/${projectId}`} style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
            display: 'inline-block'
          }}>
            ← Return to Project Overview
          </Link>
        </div>
      ) : (
        children
      )}
    </PageWrapper>
  );
}
