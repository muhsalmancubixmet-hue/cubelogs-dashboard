'use client';

import React from 'react';
import Link from 'next/link';
import { TasksIcon, EmployeesIcon, AuditIcon, CheckIcon } from '../Icons';

export default function AdminProjectDashboard({
  projects = [],
  tasks = [],
  stories = [],
  sprints = [],
  loading = false,
  error = '',
  onRetry = () => {},
  canCreateProject = false
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Metric cards skeleton */}
        <div className="project-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, minHeight: 90, animation: 'pulse 1.5s infinite ease-in-out' }}>
              <div style={{ width: 80, height: 12, background: '#e2e8f0', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: 40, height: 24, background: '#cbd5e1', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ width: 140, height: 16, background: '#cbd5e1', borderRadius: 4, marginBottom: 16 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: '100%', height: 40, background: '#f1f5f9', borderRadius: 6, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px 24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Unable to load Project Management data</strong>
          <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
        </div>
        <button onClick={onRetry} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  // Calculate Metrics
  const totalProjects = projects.length;
  const totalStoriesCount = stories.length || projects.reduce((acc, p) => acc + (p.stories_count || 0), 0);
  const totalTasksCount = tasks.length || projects.reduce((acc, p) => acc + (p.tasks_count || 0), 0);
  const completedTasksCount = tasks.filter(t => t.status === 'Completed' || t.status_detail?.category === 'completed').length;
  const pendingTasksCount = totalTasksCount > 0 ? (totalTasksCount - completedTasksCount) : 0;
  const activeSprintsCount = sprints.filter(s => s.status === 'Active' || s.is_active).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Standard CubeLogs Header Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px 28px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <TasksIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4 }}>
                Enterprise Workspace
              </span>
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              Project Management Overview
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Organization-wide project health, active sprints, story execution, and deliverable progress.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canCreateProject && (
            <Link href="/projects?modal=create" style={{ textDecoration: 'none', background: '#2563eb', color: '#fff', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              + Create Project
            </Link>
          )}
          <Link href="/projects" style={{ textDecoration: 'none', background: '#f8fafc', color: '#334155', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, border: '1px solid #cbd5e1' }}>
            Scrum Workspace →
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="project-kpi-grid">
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Projects</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalProjects}</div>
          <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 4, display: 'block' }}>Active in Company</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Stories</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalStoriesCount}</div>
          <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600, marginTop: 4, display: 'block' }}>Backlog & Sprints</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Tasks</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalTasksCount}</div>
          <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 4, display: 'block' }}>Across Projects</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Completed Tasks</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{completedTasksCount}</div>
          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 4, display: 'block' }}>Verified Complete</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Sprints</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>{activeSprintsCount}</div>
          <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 4, display: 'block' }}>In Progress</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pending Tasks</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{pendingTasksCount}</div>
          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 4, display: 'block' }}>Awaiting Finish</span>
        </div>
      </div>

      {/* Main Content Split: Recent Projects & Activity Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Recent Projects Table Panel */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Active Projects ({projects.length})
            </h3>
            <Link href="/projects" style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
              <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <TasksIcon size={32} />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#334155' }}>No projects created</h4>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>Start by initializing your first organization project.</p>
              {canCreateProject && (
                <Link href="/projects?modal=create" style={{ textDecoration: 'none', background: '#2563eb', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  + Create First Project
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Project</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Progress</th>
                    <th style={{ padding: '8px 10px' }}>Lead / PM</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 5).map((proj) => {
                    const progress = proj.completion_percentage || 0;
                    const statusName = proj.status_detail?.name || proj.status_name || 'In Progress';
                    return (
                      <tr key={proj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a' }}>
                          <Link href={`/projects/${proj.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                            {proj.name}
                          </Link>
                          {proj.code && <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{proj.code}</span>}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8' }}>
                            {statusName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', minWidth: 28 }}>{progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#475569' }}>
                          {proj.team_lead_detail?.name || proj.project_manager_detail?.name || '—'}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <Link href={`/projects/${proj.id}/board`} style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', padding: '4px 10px', borderRadius: 6 }}>
                            Board →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity Timeline & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Action Shortcuts Panel */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Quick Management Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link href="/projects" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TasksIcon size={16} style={{ color: '#2563eb' }} /> Scrum Projects
              </Link>
              <Link href="/tasks" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckIcon size={16} style={{ color: '#16a34a' }} /> All Tasks
              </Link>
              <Link href="/admin/employees" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmployeesIcon size={16} style={{ color: '#4f46e5' }} /> Team Allocations
              </Link>
              <Link href="/audit-logs" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AuditIcon size={16} style={{ color: '#0284c7' }} /> Audit Logs
              </Link>
            </div>
          </div>

          {/* Activity Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flex: 1 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Recent Activity Feed</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No recent task activity logged.</p>
              ) : (
                tasks.slice(0, 4).map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#1e293b' }}>{t.task_key || `Task #${t.id}`}</strong>: {t.title}
                      <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>Status: {t.status_name || t.status || 'Updated'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
