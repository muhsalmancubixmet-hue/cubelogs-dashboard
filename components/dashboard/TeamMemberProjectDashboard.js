'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TasksIcon, CheckIcon, ClockIcon } from '../Icons';

export default function TeamMemberProjectDashboard({
  currentUser = {},
  myTasks = [],
  myProjects = [],
  statuses = [],
  loading = false,
  error = '',
  onRetry = () => {},
  onTaskStatusChange = () => {},
  onLogHoursSubmit = () => {}
}) {
  const [loggingTask, setLoggingTask] = useState(null);
  const [hoursToLog, setHoursToLog] = useState(2);
  const [submittingLog, setSubmittingLog] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Metric cards skeleton */}
        <div className="project-kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, minHeight: 90, animation: 'pulse 1.5s infinite ease-in-out' }}>
              <div style={{ width: 80, height: 12, background: '#e2e8f0', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: 40, height: 24, background: '#cbd5e1', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        {/* Tasks skeleton */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ width: 140, height: 16, background: '#cbd5e1', borderRadius: 4, marginBottom: 16 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: '100%', height: 50, background: '#f1f5f9', borderRadius: 6, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px 24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Unable to load your task workspace</strong>
          <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
        </div>
        <button onClick={onRetry} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  // Calculate task counts
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = myTasks.filter(t => t.status !== 'Completed' && t.status_detail?.category !== 'completed');
  const inProgressTasks = myTasks.filter(t => t.status === 'In Progress' || t.status_detail?.category === 'in_progress');
  const completedTasks = myTasks.filter(t => t.status === 'Completed' || t.status_detail?.category === 'completed');
  const overdueTasks = myTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Completed' && t.status_detail?.category !== 'completed');

  const myTasksHref = myProjects.length === 1
    ? `/projects/${myProjects[0].id}/tasks?filter=my`
    : '/projects';

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!loggingTask) return;
    try {
      setSubmittingLog(true);
      await onLogHoursSubmit(loggingTask, hoursToLog);
      setLoggingTask(null);
      setHoursToLog(2);
    } catch {
      // Handled by parent
    } finally {
      setSubmittingLog(false);
    }
  };

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
                Developer Execution Center
              </span>
            </div>
            <h2 className="project-mgmt-title">
              My Assigned Workspace
            </h2>
            <p className="project-mgmt-desc">
              Welcome back, {currentUser.name || 'Team Member'}. Track your assigned stories, update status, and log work hours.
            </p>
          </div>
        </div>

        <div className="project-mgmt-actions">
          <Link href={myTasksHref} className="project-mgmt-btn-primary">
            My Tasks Portal →
          </Link>
          <Link href="/projects" className="project-mgmt-btn-secondary">
            Scrum Board
          </Link>
        </div>
      </div>

      {/* Task Summary Counters Grid - 2 per row on mobile, compact */}
      <div className="project-kpi-grid">
        <div className="project-kpi-card">
          <span className="project-kpi-label">Pending Tasks</span>
          <div className="project-kpi-value" style={{ color: '#d97706' }}>{pendingTasks.length}</div>
          <span className="project-kpi-sub" style={{ color: '#d97706' }}>Awaiting Execution</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">In Progress</span>
          <div className="project-kpi-value" style={{ color: '#0284c7' }}>{inProgressTasks.length}</div>
          <span className="project-kpi-sub" style={{ color: '#0284c7' }}>Currently Active</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Completed Tasks</span>
          <div className="project-kpi-value" style={{ color: '#16a34a' }}>{completedTasks.length}</div>
          <span className="project-kpi-sub" style={{ color: '#16a34a' }}>Finished</span>
        </div>

        <div className="project-kpi-card">
          <span className="project-kpi-label">Overdue Tasks</span>
          <div className="project-kpi-value" style={{ color: overdueTasks.length > 0 ? '#dc2626' : '#64748b' }}>{overdueTasks.length}</div>
          <span className="project-kpi-sub" style={{ color: overdueTasks.length > 0 ? '#dc2626' : '#64748b' }}>
            {overdueTasks.length > 0 ? 'Requires Action' : 'None Overdue'}
          </span>
        </div>
      </div>

      {/* Main Section: My Projects Cards & Assigned Tasks (Today's Work) */}
      <div className="project-dashboard-main-split">
        {/* Today's Work / My Assigned Tasks Widget */}
        <div className="project-dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Today's Execution Tasks ({pendingTasks.length})
            </h3>
            <Link href={myTasksHref} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
              View All Tasks →
            </Link>
          </div>

          {myTasks.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
              <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <CheckIcon size={32} />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#334155' }}>No pending tasks assigned</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>You are completely caught up with your daily work items.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myTasks.slice(0, 5).map((t) => {
                const priorityColor = t.priority === 'Critical' ? '#dc2626' : t.priority === 'High' ? '#ea580c' : '#475569';
                const isTaskCompleted = t.status === 'Completed' || t.status_detail?.category === 'completed';
                const taskProjectId = t.project_id || t.project || t.projectId;
                return (
                  <div
                    key={t.id}
                    className="project-task-item"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 14,
                      background: isTaskCompleted ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <Link
                        href={taskProjectId ? `/projects/${taskProjectId}/tasks?filter=my` : myTasksHref}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>
                          {t.task_key || `TASK-${t.id}`}
                        </span>
                        <strong style={{ fontSize: 13, color: isTaskCompleted ? '#64748b' : '#0f172a', textDecoration: isTaskCompleted ? 'line-through' : 'none' }}>
                          {t.title}
                        </strong>
                      </Link>
                      <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor, border: `1px solid ${priorityColor}`, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                        {t.priority || 'Medium'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockIcon size={13} style={{ color: '#94a3b8' }} />
                        <span>{t.logged_hours || 0} hrs logged {t.estimated_hours ? `/ ${t.estimated_hours} hrs est.` : ''}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {statuses.length > 0 && (
                          <select
                            value={t.status_detail?.id || t.status || ''}
                            onChange={(e) => onTaskStatusChange(t.id, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {statuses.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => setLoggingTask(t)}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer' }}
                        >
                          + Log Time
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Assigned Projects Grid & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* My Projects */}
          <div className="project-dashboard-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>My Projects ({myProjects.length})</h3>
              <Link href="/projects" style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                All Projects →
              </Link>
            </div>

            {myProjects.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No projects assigned to your account currently.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myProjects.slice(0, 4).map((p) => {
                  const progress = p.completion_percentage || 0;
                  return (
                    <div key={p.id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{p.name}</strong>
                        <Link href={`/projects/${p.id}/board`} style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                          Board →
                        </Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#cbd5e1', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: '#2563eb', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="project-dashboard-panel">
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Quick Shortcuts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link href={myTasksHref} className="project-quick-action-card" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TasksIcon size={16} style={{ color: '#2563eb' }} /> My Tasks
              </Link>
              <Link href="/projects" className="project-quick-action-card" style={{ textDecoration: 'none', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckIcon size={16} style={{ color: '#16a34a' }} /> Active Board
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Log Time Modal */}
      {loggingTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="custom-modal-card" style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Log Work Hours</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Logging hours to task: <strong>{loggingTask.task_key || loggingTask.title}</strong>
            </p>
            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Hours to Add:
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hoursToLog}
                  onChange={(e) => setHoursToLog(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setLoggingTask(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingLog} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{submittingLog ? 'Saving...' : 'Save Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
