'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { projectService } from '@/lib/services/projectService';
import { useApp } from '@/context/AppContext';
import { MapPin } from 'lucide-react';
import { TasksIcon, CheckIcon, ClockIcon, CalendarIcon, ShieldIcon, ActivityIcon, SearchIcon } from '@/components/Icons';
import {
  useLearningMode,
  GlobalScrumHeader,
  ScrumHelpPanel
} from '@/components/scrum/ScrumLearningComponents';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(id) {
  const colors = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  ];
  const num = typeof id === 'number' ? id : (String(id).length || 0);
  return colors[num % colors.length];
}

export default function ProjectTasksPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId;
  const { currentUser } = useApp() || {};
  const { learningMode, setLearningMode } = useLearningMode();
  const filterQuery = searchParams.get('filter') || 'all';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(filterQuery === 'my' ? 'all' : filterQuery);
  const [search, setSearch] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(filterQuery === 'my');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (filterQuery === 'my') {
      setMyTasksOnly(true);
      setFilter('all');
    } else {
      setFilter(filterQuery);
    }
  }, [filterQuery]);

  const fetchProjectTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await projectService.getProjectTasks({ project_id: projectId });
      setTasks(Array.isArray(res) ? res : (res?.results || []));
    } catch (err) {
      console.error('Error loading project tasks:', err);
      setError(err.message || 'Failed to load project tasks.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectTasks();
  }, [fetchProjectTasks]);

  // Compute Task KPI metrics
  const kpis = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;

    tasks.forEach(t => {
      const cat = (t.status_detail?.category || '').toLowerCase();
      const name = (t.status_detail?.name || '').toLowerCase();
      if (cat === 'completed') {
        completed++;
      } else if (cat === 'active') {
        inProgress++;
      } else if (cat === 'pending' || name.includes('blocked')) {
        blocked++;
      } else {
        pending++;
      }
    });

    return { total: tasks.length, pending, completed, inProgress, blocked };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // My Tasks Only swipe toggle filter
      if (myTasksOnly && currentUser) {
        const userIds = [
          currentUser?.id,
          currentUser?.employee_id,
          currentUser?.user_id,
          currentUser?.user
        ].filter(v => v !== undefined && v !== null).map(Number);

        const assignedId = typeof t.assigned_to === 'object' ? t.assigned_to?.id : t.assigned_to;
        const assignedIdNum = assignedId !== undefined && assignedId !== null ? Number(assignedId) : null;
        const assignedToIdNum = t.assigned_to_id !== undefined && t.assigned_to_id !== null ? Number(t.assigned_to_id) : null;
        const assignedDetailIdNum = t.assigned_to_detail?.id !== undefined && t.assigned_to_detail?.id !== null ? Number(t.assigned_to_detail?.id) : null;

        const membersList = (Array.isArray(t.assigned_members) ? t.assigned_members : [])
          .concat(Array.isArray(t.members) ? t.members : [])
          .map(m => (typeof m === 'object' ? Number(m?.id) : Number(m)))
          .filter(n => !isNaN(n));

        const isAssigned =
          (assignedIdNum !== null && userIds.includes(assignedIdNum)) ||
          (assignedToIdNum !== null && userIds.includes(assignedToIdNum)) ||
          (assignedDetailIdNum !== null && userIds.includes(assignedDetailIdNum)) ||
          membersList.some(id => userIds.includes(id)) ||
          (t.assigned_to_name && currentUser.first_name && t.assigned_to_name.toLowerCase().includes(currentUser.first_name.toLowerCase()));

        if (!isAssigned) return false;
      }

      const q = search.toLowerCase().trim();
      const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.task_key && t.task_key.toLowerCase().includes(q)) || (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q));

      const statusCat = (t.status_detail?.category || '').toLowerCase();
      const statusName = (t.status_detail?.name || '').toLowerCase();

      let matchFilter = true;
      if (filter === 'pending') {
        matchFilter = statusCat !== 'completed';
      } else if (filter === 'completed') {
        matchFilter = statusCat === 'completed';
      } else if (filter === 'blocked') {
        matchFilter = statusCat === 'pending' || statusName.includes('blocked');
      } else if (filter === 'in_progress') {
        matchFilter = statusCat === 'active';
      }

      return matchSearch && matchFilter;
    });
  }, [tasks, search, filter, myTasksOnly, currentUser]);

  const getPriorityStyle = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'critical' || p === 'urgent') return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
    if (p === 'high') return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' };
    if (p === 'medium') return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>

      {/* ── 1. GLOBAL SCRUM HEADER ── */}
      <GlobalScrumHeader
        location="Project > Tasks"
        title="Tasks"
        icon={TasksIcon}
        badge={filteredTasks.length}
        purpose="Task Tracking"
        whoUsesThis="Developers • QA Engineers • Team Lead • Scrum Master"
        primaryGoal="Track story and task status movements in real-time."
        nextStep="Update task status as you progress with development."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
        actionButtons={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: myTasksOnly ? '#2563eb' : '#475569', whiteSpace: 'nowrap' }}>
              My Tasks Only
            </span>
            <button
              type="button"
              onClick={() => setMyTasksOnly(!myTasksOnly)}
              style={{
                width: 38, height: 20, borderRadius: 10, border: 'none',
                background: myTasksOnly ? '#2563eb' : '#cbd5e1',
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease', padding: 2, flexShrink: 0
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#ffffff',
                position: 'absolute', top: 2, left: myTasksOnly ? 20 : 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </button>
            <span style={{ fontSize: 11.5, color: '#94a3b8', minWidth: 55, whiteSpace: 'nowrap' }}>
              {myTasksOnly ? 'My Tasks' : 'All Tasks'}
            </span>
          </div>
        )}
      />

      {/* ── 3. HORIZONTAL SLEEK SEGMENTED FILTER BAR ── */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '4px 2px', scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        {[
          { id: 'all', label: 'All Work' },
          { id: 'pending', label: 'Pending' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
          { id: 'blocked', label: 'Blocked' },
        ].map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={isActive ? 'btn-blue-active btn-primary' : ''}
              data-active-blue={isActive ? 'true' : 'false'}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 700 : 600,
                whiteSpace: 'nowrap', border: isActive ? 'none' : '1px solid #cbd5e1',
                background: isActive ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#ffffff',
                color: isActive ? '#ffffff !important' : '#475569',
                boxShadow: isActive ? '0 2px 8px rgba(37,99,255,0.25)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0, minHeight: 36
              }}
            >
              <span style={{ color: isActive ? '#ffffff !important' : 'inherit' }}>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. KPI METRICS BAR ── */}
      <div className="project-kpi-grid" style={{ display: 'grid', gap: 10 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Total Tasks</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{kpis.total}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>In Progress</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>{kpis.inProgress}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600 }}>Completed</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{kpis.completed}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>Pending / Blocked</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{kpis.blocked}</div>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', width: '100%' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <SearchIcon size={14} color="#94a3b8" />
        </span>
        <input
          type="text"
          placeholder="Search tasks by key, title, or assignee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', minHeight: 36, boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Loading tasks...
        </div>
      ) : filteredTasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTasks.map((task) => {
            const prioStyle = getPriorityStyle(task.priority);
            const isMyTask = currentUser && (
              task.assigned_to === currentUser.id ||
              (task.assigned_to_detail && task.assigned_to_detail.id === currentUser.id) ||
              (Array.isArray(task.assigned_members) && task.assigned_members.includes(currentUser.id)) ||
              (Array.isArray(task.members) && task.members.includes(currentUser.id))
            );
            const assigneeName = task.assigned_to_name || (task.assigned_to ? `Member #${task.assigned_to}` : 'Unassigned');

            return (
              <div key={task.id} style={{
                background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 10
              }}>
                {/* Top Row: Task Key + Badges + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 6 }}>
                      {task.task_key || `TASK-${task.id}`}
                    </span>
                    {task.story_key && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                        Story: {task.story_key}
                      </span>
                    )}
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: prioStyle.bg, color: prioStyle.color, border: `1px solid ${prioStyle.border}` }}>
                      {task.priority || 'Medium'}
                    </span>
                    {isMyTask && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                        Assigned to You
                      </span>
                    )}
                  </div>

                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                    background: (task.status_detail?.category === 'completed' || task.status === 'Completed') ? '#dcfce7' : '#eff6ff',
                    color: (task.status_detail?.category === 'completed' || task.status === 'Completed') ? '#15803d' : '#1d4ed8'
                  }}>
                    {task.status_detail?.name || task.status || 'Pending'}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.35, overflowWrap: 'anywhere', wordBreak: 'normal' }}>
                  <Link href={`/projects/${projectId}/stories/${task.story || task.story_id}/tasks/${task.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                    {task.title}
                  </Link>
                </h3>

                {/* Bottom Row: Assignee & Meta Stats + View Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#334155' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: getGradient(task.assigned_to || task.id),
                        color: '#ffffff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {getInitials(assigneeName)}
                      </div>
                      <span>{assigneeName}</span>
                    </div>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ClockIcon size={12} color="#64748b" />
                      <span>Est: {task.estimated_hours || 0}h</span>
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ActivityIcon size={12} color="#64748b" />
                      <span>Logged: {task.logged_hours || 0}h</span>
                    </span>

                    {task.due_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CalendarIcon size={12} color="#64748b" />
                        <span>Due: {task.due_date}</span>
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/projects/${projectId}/stories/${task.story || task.story_id}/tasks/${task.id}`}
                    style={{
                      padding: '6px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1',
                      color: '#2563eb', fontWeight: 700, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap'
                    }}
                  >
                    View Task →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <TasksIcon size={24} color="#94a3b8" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {myTasksOnly ? 'No assigned tasks found' : 'No tasks found'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {myTasksOnly ? 'No tasks assigned to you.' : 'No project tasks available.'}
          </p>
        </div>
      )}
    </div>
  );
}
