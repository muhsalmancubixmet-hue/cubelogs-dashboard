'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { projectService } from '../../lib/services/projectService';
import { TasksIcon, CheckIcon, SearchIcon, ClockIcon, WarningIcon } from '../../components/Icons';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedStatusId, setSelectedStatusId] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Action Modal: Log Hours
  const [loggingTask, setLoggingTask] = useState(null);
  const [hoursToLog, setHoursToLog] = useState(2);
  const [submittingLog, setSubmittingLog] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [tData, pData, stList] = await Promise.all([
        projectService.getProjectTasks(),
        projectService.getProjects(),
        projectService.getProjectStatuses(),
      ]);

      const taskList = Array.isArray(tData) ? tData : (tData?.results || tData?.data || []);
      const projList = Array.isArray(pData) ? pData : (pData?.results || pData?.data || []);
      const statusList = Array.isArray(stList) ? stList : (stList?.results || stList?.data || []);

      setTasks(taskList);
      setProjects(projList);
      setStatuses(statusList);
    } catch (err) {
      console.error('Failed to load my tasks:', err);
      setErrorMsg('Unable to load your assigned tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      setErrorMsg('');
      await projectService.updateProjectTaskStatus(taskId, Number(newStatusId));
      setSuccessBanner('Task status updated successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update task status.');
    }
  };

  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    try {
      setErrorMsg('');
      await projectService.updateSubtaskStatus(subtaskId, !currentStatus);
      setSuccessBanner('Subtask status updated.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update subtask.');
    }
  };

  const handleLogHoursSubmit = async (e) => {
    e.preventDefault();
    if (!loggingTask) return;
    try {
      setSubmittingLog(true);
      setErrorMsg('');
      const currentLogged = Number(loggingTask.logged_hours || 0);
      const additional = Number(hoursToLog) || 0;
      await projectService.updateTask(loggingTask.id, {
        logged_hours: currentLogged + additional
      });
      setLoggingTask(null);
      setHoursToLog(2);
      setSuccessBanner(`Logged ${additional} hrs to ${loggingTask.task_key || 'task'}.`);
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log hours.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedProjectId('ALL');
    setSelectedStatusId('ALL');
    setSelectedPriority('ALL');
    setSearchQuery('');
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId !== 'ALL' && String(t.project || t.story_project) !== String(selectedProjectId)) return false;
    if (selectedStatusId !== 'ALL' && String(t.status || t.status_detail?.id) !== String(selectedStatusId)) return false;
    if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = (t.title || '').toLowerCase();
      const key = (t.task_key || '').toLowerCase();
      return title.includes(q) || key.includes(q);
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasksCount = filteredTasks.filter(t => t.status_detail?.category !== 'completed' && t.status !== 'Completed').length;
  const completedTasksCount = filteredTasks.filter(t => t.status_detail?.category === 'completed' || t.status === 'Completed').length;
  const overdueTasksCount = filteredTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Completed' && t.status_detail?.category !== 'completed').length;

  const isFilterActive = selectedProjectId !== 'ALL' || selectedStatusId !== 'ALL' || selectedPriority !== 'ALL' || searchQuery.trim() !== '';

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
                Developer Execution Center
              </span>
            </div>
            <h1 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              My Assigned Tasks Workspace
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Single-page workspace for daily developer execution: update task status, complete child subtasks, and log work hours.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8fafc', padding: '10px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', display: 'block' }}>{completedTasksCount}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Completed</span>
          </div>
          <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#d97706', display: 'block' }}>{pendingTasksCount}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Pending</span>
          </div>
          {overdueTasksCount > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', display: 'block' }}>{overdueTasksCount}</span>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Overdue</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div style={{ padding: '12px 18px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckIcon size={16} /> <span>{successBanner}</span>
        </div>
      )}

      {/* Error Message with Retry */}
      {errorMsg && (
        <div style={{ padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningIcon size={16} />
            <span>{errorMsg}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={loadData} style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
            <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* Standard White Filter Control Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by task key or title..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={15} />
          </span>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
        >
          <option value="ALL">All Projects ({projects.length})</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedStatusId}
          onChange={(e) => setSelectedStatusId(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
        >
          <option value="ALL">All Statuses ({statuses.length})</option>
          {statuses.map((st) => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
        >
          <option value="ALL">All Priorities</option>
          {['Low', 'Medium', 'High', 'Critical'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {isFilterActive && (
          <button
            onClick={clearAllFilters}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Assigned Tasks Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, height: 160, animation: 'pulse 1.5s infinite ease-in-out' }}>
              <div style={{ width: 80, height: 12, background: '#e2e8f0', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: '80%', height: 18, background: '#cbd5e1', borderRadius: 4, marginBottom: 16 }} />
              <div style={{ width: '100%', height: 40, background: '#f1f5f9', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ padding: '56px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <TasksIcon size={36} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#334155' }}>No tasks assigned</h3>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
            {isFilterActive ? 'No tasks match the active filters selected.' : 'You have no assigned tasks currently.'}
          </p>
          {isFilterActive && (
            <button onClick={clearAllFilters} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredTasks.map((t) => {
            const subtaskCount = t.subtasks?.length || 0;
            const completedSubtasks = t.subtasks?.filter((s) => s.is_completed).length || 0;
            const subPct = subtaskCount > 0 ? Math.round((completedSubtasks / subtaskCount) * 100) : 0;
            const isCompleted = t.status_detail?.category === 'completed' || t.status === 'Completed';

            const priorityStyle = t.priority === 'Critical'
              ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
              : t.priority === 'High'
              ? { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' }
              : t.priority === 'Low'
              ? { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' }
              : { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };

            return (
              <div
                key={t.id}
                style={{
                  background: '#ffffff',
                  border: isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 5 }}>
                      {t.task_key || `TASK-${t.id}`}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: priorityStyle.color, background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' }}>
                      {t.priority || 'Medium'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: isCompleted ? '#64748b' : '#0f172a', lineHeight: 1.3, textDecoration: isCompleted ? 'line-through' : 'none' }}>
                    {t.title}
                  </h3>

                  {t.description && (
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Subtasks Progress Section */}
                {subtaskCount > 0 && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 600 }}>
                      <span>Subtasks ({completedSubtasks}/{subtaskCount})</span>
                      <span>{subPct}%</span>
                    </div>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${subPct}%`, height: '100%', background: subPct >= 100 ? '#16a34a' : '#2563eb', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 90, overflowY: 'auto' }}>
                      {t.subtasks.map((sub) => (
                        <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: sub.is_completed ? '#166534' : '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={sub.is_completed}
                            onChange={() => handleToggleSubtask(sub.id, sub.is_completed)}
                          />
                          <span style={{ textDecoration: sub.is_completed ? 'line-through' : 'none' }}>{sub.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hours & Actions Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockIcon size={13} style={{ color: '#94a3b8' }} />
                    <span>Logged: <strong style={{ color: '#0f172a' }}>{t.logged_hours || 0}</strong> {t.estimated_hours ? `/ ${t.estimated_hours} hrs` : 'hrs'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => { setLoggingTask(t); setHoursToLog(2); }}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Log Time
                    </button>

                    {statuses.length > 0 && (
                      <select
                        value={t.status_detail?.id || t.status || ''}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {statuses.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Hours Modal */}
      {loggingTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Log Work Hours</h3>
            <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 16 }}>
              Task: <strong>{loggingTask.task_key || `TASK-${loggingTask.id}`} - {loggingTask.title}</strong>
            </span>

            <form onSubmit={handleLogHoursSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Additional Hours Worked *</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  max="24"
                  value={hoursToLog}
                  onChange={(e) => setHoursToLog(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setLoggingTask(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingLog} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{submittingLog ? 'Logging...' : 'Save Logged Hours'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
