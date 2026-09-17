'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TasksIcon, EmployeesIcon, AuditIcon, CheckIcon } from '../Icons';
import { projectService } from '../../lib/services/projectService';
import { useApp } from '../../context/AppContext';

function generateKeyPreview(name) {
  if (!name) return 'PRJ-0001';
  let cleanName = name.replace(/[^A-Za-z\s]/g, '').trim().toUpperCase();
  let words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words[0] === 'CUBELOGS') words = words.slice(1);
  if (!words.length) return 'PRJ-0001';
  let prefix = 'PRJ';
  if (words.length >= 3) prefix = words.slice(0, 3).map(w => w[0]).join('');
  else if (words.length === 2) prefix = (words[0].slice(0, 2) + words[1][0]);
  else prefix = words[0].slice(0, 3);
  return `${prefix.toUpperCase()}-0001`;
}

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
  const appContext = useApp?.();
  const showAlert = appContext?.showAlert;

  // Create Project Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    project_type: 'Internal',
    priority: 'Medium',
    start_date: '',
    end_date: '',
    team_lead: '',
  });

  const openCreateModal = () => {
    setFormError('');
    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const endStr = nextMonth.toISOString().split('T')[0];

    setNewProject({
      name: '',
      description: '',
      project_type: 'Internal',
      priority: 'Medium',
      start_date: todayStr,
      end_date: endStr,
      team_lead: '',
    });
    setShowCreateModal(true);

    if (eligibleEmployees.length === 0) {
      setEmpLoading(true);
      projectService.getCompanyEligibleEmployees()
        .then((res) => {
          let list = [];
          if (Array.isArray(res)) list = res;
          else if (Array.isArray(res?.results)) list = res.results;
          else if (Array.isArray(res?.data)) list = res.data;
          else if (Array.isArray(res?.employees)) list = res.employees;
          setEligibleEmployees(list);
        })
        .catch((err) => {
          console.error('Failed to load eligible employees:', err);
        })
        .finally(() => {
          setEmpLoading(false);
        });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    try {
      setCreating(true);
      setFormError('');
      const payload = {
        name: newProject.name.trim(),
        project_type: newProject.project_type,
        priority: newProject.priority,
        description: newProject.description.trim() || undefined,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
      };
      if (newProject.team_lead) {
        payload.team_lead = Number(newProject.team_lead);
      }
      await projectService.createProject(payload);
      setShowCreateModal(false);
      showAlert?.('Project created successfully!', 'Success', 'success');
      onRetry();
    } catch (err) {
      console.error('Failed to create project:', err);
      setFormError(err?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Metric cards skeleton */}
        <div className="project-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="project-kpi-card" style={{ minHeight: 70, animation: 'pulse 1.5s infinite ease-in-out' }}>
              <div style={{ width: 60, height: 10, background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: 36, height: 20, background: '#cbd5e1', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="project-dashboard-panel">
          <div style={{ width: 140, height: 16, background: '#cbd5e1', borderRadius: 4, marginBottom: 16 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: '100%', height: 36, background: '#f1f5f9', borderRadius: 6, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>Unable to load Project Management data</strong>
          <span style={{ fontSize: 12, color: '#b91c1c' }}>{error}</span>
        </div>
        <button onClick={onRetry} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Standard CubeLogs Header Banner - Responsive & Compact */}
      <div className="project-mgmt-header">
        <div className="project-mgmt-header-left">
          <div className="project-mgmt-icon-box">
            <TasksIcon size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="project-mgmt-badge">
                Enterprise Workspace
              </span>
            </div>
            <h2 className="project-mgmt-title">
              Project Management Overview
            </h2>
            <p className="project-mgmt-desc">
              Organization-wide project health, active sprints, story execution, and deliverable progress.
            </p>
          </div>
        </div>

        <div className="project-mgmt-actions">
          {canCreateProject && (
            <button
              type="button"
              onClick={openCreateModal}
              className="project-mgmt-btn-primary"
            >
              + Create Project
            </button>
          )}
          <Link href="/projects" className="project-mgmt-btn-secondary">
            Scrum Workspace →
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - 2 per row on mobile, compact and lightweight */}
      <div className="project-kpi-grid">
        <div className="project-kpi-card">
          <span className="project-kpi-label">Total Projects</span>
          <div className="project-kpi-value">{totalProjects}</div>
          <span className="project-kpi-sub" style={{ color: '#2563eb' }}>Active in Company</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Total Stories</span>
          <div className="project-kpi-value">{totalStoriesCount}</div>
          <span className="project-kpi-sub" style={{ color: '#4f46e5' }}>Backlog & Sprints</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Total Tasks</span>
          <div className="project-kpi-value">{totalTasksCount}</div>
          <span className="project-kpi-sub" style={{ color: '#0284c7' }}>Across Projects</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Completed Tasks</span>
          <div className="project-kpi-value" style={{ color: '#16a34a' }}>{completedTasksCount}</div>
          <span className="project-kpi-sub" style={{ color: '#16a34a' }}>Verified Complete</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Active Sprints</span>
          <div className="project-kpi-value">{activeSprintsCount}</div>
          <span className="project-kpi-sub" style={{ color: '#0284c7' }}>In Progress</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Pending Tasks</span>
          <div className="project-kpi-value" style={{ color: '#d97706' }}>{pendingTasksCount}</div>
          <span className="project-kpi-sub" style={{ color: '#d97706' }}>Awaiting Finish</span>
        </div>
      </div>

      {/* Main Content Split: Recent Projects & Activity Timeline */}
      <div className="project-dashboard-main-split">
        {/* Recent Projects Table Panel */}
        <div className="project-dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Active Projects ({projects.length})
            </h3>
            <Link href="/projects" style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
              <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <TasksIcon size={28} />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#334155' }}>No projects created</h4>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>Start by initializing your first organization project.</p>
              {canCreateProject && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="project-mgmt-btn-primary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  + Create First Project
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left', minWidth: 460 }}>
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
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0f172a' }}>
                          <Link href={`/projects/${proj.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                            {proj.name}
                          </Link>
                          {proj.code && <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>{proj.code}</span>}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8' }}>
                            {statusName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', minWidth: 26 }}>{progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 11, color: '#475569' }}>
                          {proj.team_lead_detail?.name || proj.project_manager_detail?.name || '—'}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                          <Link href={`/projects/${proj.id}/board`} style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', padding: '3px 8px', borderRadius: 5 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Action Shortcuts Panel */}
          <div className="project-dashboard-panel">
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Quick Management Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link href="/projects" className="project-quick-action-card" style={{ textDecoration: 'none', padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TasksIcon size={14} style={{ color: '#2563eb' }} /> Scrum Projects
              </Link>
              <Link href={projects.length > 0 ? `/projects/${projects[0].id}/tasks` : '/projects'} className="project-quick-action-card" style={{ textDecoration: 'none', padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckIcon size={14} style={{ color: '#16a34a' }} /> All Tasks
              </Link>
              <Link href="/admin/employees" className="project-quick-action-card" style={{ textDecoration: 'none', padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <EmployeesIcon size={14} style={{ color: '#4f46e5' }} /> Team Allocations
              </Link>
              <Link href="/audit-logs" className="project-quick-action-card" style={{ textDecoration: 'none', padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AuditIcon size={14} style={{ color: '#0284c7' }} /> Audit Logs
              </Link>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="project-dashboard-panel" style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Recent Activity Feed</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  No recent execution tasks found.
                </div>
              ) : (
                tasks.slice(0, 4).map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 11, border: '1px solid #f1f5f9' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: 'block', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</strong>
                      <span style={{ color: '#64748b' }}>{t.task_key || 'TASK'} • {t.status_detail?.name || t.status || 'Pending'}</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8 }}>Active</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="custom-modal-card project-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TasksIcon size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Create Scrum Project
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Key Preview: <strong>{generateKeyPreview(newProject.name)}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    ⚠️ {formError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="e.g. Mobile App Redesign"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Project Type
                    </label>
                    <select
                      value={newProject.project_type}
                      onChange={(e) => setNewProject({ ...newProject, project_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#ffffff',
                      }}
                    >
                      <option value="Internal">Internal</option>
                      <option value="Client">Client</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Priority
                    </label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#ffffff',
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Team Lead
                  </label>
                  <select
                    value={newProject.team_lead}
                    onChange={(e) => setNewProject({ ...newProject, team_lead: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      background: '#ffffff',
                    }}
                  >
                    <option value="">Select Team Lead (Optional)...</option>
                    {eligibleEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || emp.full_name || emp.email} ({emp.role || emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Brief summary of project goals and objectives..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '10px 16px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: creating ? '#93c5fd' : '#2563eb',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {creating ? 'Creating...' : '+ Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
