'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../../../../../components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../../../../../context/AppContext';
import { projectService } from '../../../../../../lib/services/projectService';
import ManageStatusesModal from '../../../../../../components/ManageStatusesModal';
import { EditIcon, TrashIcon } from '../../../../../../components/Icons';
import { TiptapEditor, TiptapReadOnly, richTextToPlainText } from '../../../../../../components/rich-text';

const CATEGORY_STYLES = {
  pending:   { bg: '#e0f2fe', color: '#075985' },
  active:    { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#f3e8ff', color: '#6b21a8' },
};

const PRIORITY_BADGES = {
  Low:    { bg: '#f1f5f9', color: '#475569' },
  Medium: { bg: '#e0f2fe', color: '#0369a1' },
  High:   { bg: '#ffedd5', color: '#c2410c' },
  Urgent: { bg: '#fee2e2', color: '#b91c1c' },
};

function StatusBadge({ name, category }) {
  const style = CATEGORY_STYLES[category] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem',
      fontWeight: 600, background: style.bg, color: style.color
    }}>
      {name || 'No Status'}
    </span>
  );
}

export default function StoryTasksPage({ params }) {
  const resolvedParams = React.use(params);
  const { projectId, storyId } = resolvedParams;
  const router = useRouter();
  const { currentUser, hasPermission } = useApp();

  const [project, setProject] = useState(null);
  const [story, setStory] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [storyMembers, setStoryMembers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assigned_to: '', priority: 'Medium', status: '', start_date: '', due_date: ''
  });
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Story Member Assignment Modal & Status Modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedProjectMember, setSelectedProjectMember] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Capabilities
  const isPM = currentUser?.isSuperAdmin || project?.project_manager === currentUser?.id || hasPermission('projects:update');
  const isLead = project?.team_lead === currentUser?.id;
  const canManageStoryMembers = isPM || isLead || hasPermission('projects:members_manage');
  const canManageStatuses = currentUser?.isSuperAdmin || hasPermission('project_statuses:create');

  const canCreateTask = isPM || isLead || hasPermission('project_tasks:create');
  const canUpdateAllTasks = isPM || isLead || hasPermission('project_tasks:update_all');

  // ── Fetch Data ────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [projData, storyData, tasksData, statusesData, storyMemsData, projMemsData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getStory(storyId),
        projectService.getStoryTasks(storyId),
        projectService.getProjectStatuses(),
        projectService.getStoryMembers(storyId),
        projectService.getProjectMembers(projectId),
      ]);

      setProject(projData);
      setStory(storyData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);
      setStoryMembers(Array.isArray(storyMemsData) ? storyMemsData : []);
      setProjectMembers(Array.isArray(projMemsData) ? projMemsData : []);
    } catch (err) {
      console.error('Error loading task page data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, storyId]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── Task Modal Actions ────────────────────────────────────────────────────
  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: '', description: '', assigned_to: '', priority: 'Medium', status: '', start_date: '', due_date: ''
    });
    setTaskError('');
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority || 'Medium',
      status: task.status || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
    });
    setTaskError('');
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      setSubmittingTask(true);
      setTaskError('');
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
        priority: taskForm.priority,
        status: taskForm.status ? parseInt(taskForm.status) : undefined,
        start_date: taskForm.start_date || null,
        due_date: taskForm.due_date || null,
      };

      if (editingTask) {
        await projectService.updateProjectTask(editingTask.id, payload);
      } else {
        await projectService.createProjectTask(storyId, payload);
      }
      setShowTaskModal(false);
      fetchAllData();
    } catch (err) {
      setTaskError(err.message || 'Failed to save task.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleStatusQuickChange = async (taskId, newStatusId) => {
    try {
      await projectService.updateProjectTaskStatus(taskId, parseInt(newStatusId));
      fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await projectService.deleteProjectTask(taskId);
      fetchAllData();
    } catch (err) {
      alert('Failed to delete task.');
    }
  };

  // ── Story Member Assignment ──────────────────────────────────────────────
  const handleAddStoryMember = async (e) => {
    e.preventDefault();
    if (!selectedProjectMember) return;
    try {
      setSubmittingMember(true);
      setMemberError('');
      await projectService.addStoryMember(storyId, parseInt(selectedProjectMember));
      setSelectedProjectMember('');
      fetchAllData();
    } catch (err) {
      setMemberError(err.message || 'Failed to assign member to story.');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleRemoveStoryMember = async (storyMemberId) => {
    if (!confirm('Remove member from this section?')) return;
    try {
      await projectService.removeStoryMember(storyId, storyMemberId);
      fetchAllData();
    } catch (err) {
      alert('Failed to remove member from section.');
    }
  };

  const handleBackNav = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/projects/${projectId}/stories/${storyId}`);
    }
  };

  // ── Filtered Tasks ────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status_category === statusFilter || t.status_name === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <PageWrapper title="Section Tasks" requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>Loading section tasks...</div>
      </PageWrapper>
    );
  }

  if (!story || !project) {
    return (
      <PageWrapper title="Section Tasks" requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
        <div style={{ padding: 40, textAlign: 'center' }}>Section or Project not found.</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`${story.title} - Tasks`} requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
      <div className="tasks-page">

        {/* Breadcrumb & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBackNav}
            className="btn-white-text"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 15px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} color="#0f172a" />
            <span style={{ color: '#0f172a', fontWeight: 700 }}>Back</span>
          </button>
          <div className="breadcrumb" style={{ margin: 0 }}>
            <Link href="/projects" className="bread-link">Projects</Link>
            <span className="bread-sep">›</span>
            <Link href={`/projects/${projectId}`} className="bread-link">{project.name}</Link>
            <span className="bread-sep">›</span>
            <Link href={`/projects/${projectId}/stories/${storyId}`} className="bread-link">{story.title}</Link>
            <span className="bread-sep">›</span>
            <span className="bread-current">Tasks</span>
          </div>
        </div>

        {/* Section Header */}
        <div className="header-card">
          <div className="header-left">
            <div className="title-row">
              <h2>{story.title}</h2>
              <StatusBadge name={story.status_name} category={story.status_category} />
              {story.department && <span className="dept-chip">{story.department}</span>}
            </div>
            {story.description && (
              <div className="story-desc">
                <TiptapReadOnly content={story.description} />
              </div>
            )}
          </div>

          <div className="header-actions">
            {canManageStoryMembers && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}>
                👥 Manage Section Members ({storyMembers.length})
              </button>
            )}
            {canCreateTask && (
              <button className="btn btn-primary btn-add" onClick={openCreateTask}>
                + New Task
              </button>
            )}
          </div>
        </div>

        {/* Section Assigned Members */}
        <div className="story-members-bar">
          <span className="members-bar-label">Assigned Members:</span>
          {storyMembers.map(sm => (
            <span key={sm.id} className="story-member-badge">
              👤 {sm.user_name} ({sm.project_role})
            </span>
          ))}
          {storyMembers.length === 0 && (
            <span className="no-members-text">No members assigned to this section yet. Team Leads or PMs must assign project members before tasks can be assigned.</span>
          )}
        </div>

        {/* Filters and Task Table */}
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="status-tabs">
            <button onClick={() => setStatusFilter('ALL')} className={`tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}>All</button>
            {statuses.map(s => (
              <button key={s.id} onClick={() => setStatusFilter(s.category)} className={`tab-btn ${statusFilter === s.category ? 'active' : ''}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks Table */}
        <div className="tasks-table-card">
          {filteredTasks.length === 0 ? (
            <div className="empty-tasks">No tasks found for this section.</div>
          ) : (
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const prioStyle = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium;
                  const canUpdateThisTask = canUpdateAllTasks || (task.assigned_to === currentUser?.id && hasPermission('project_tasks:update_own'));

                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="task-title-cell">
                          <span className="task-name">{task.title}</span>
                          {task.description && (
                            <div className="task-desc-sub" style={{ fontSize: 12, color: '#64748b' }}>
                              {richTextToPlainText(task.description, 80)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="assignee-text">{task.assigned_to_name || 'Unassigned'}</span>
                      </td>
                      <td>
                        <span className="prio-badge" style={{ background: prioStyle.bg, color: prioStyle.color }}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        {canUpdateThisTask ? (
                          <select
                            className="status-select"
                            value={task.status || ''}
                            onChange={(e) => handleStatusQuickChange(task.id, e.target.value)}
                          >
                            {statuses.filter(s => s.scope === 'all' || s.scope === 'task').map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge name={task.status_name} category={task.status_category} />
                        )}
                      </td>
                      <td>
                        <span className="date-text">{task.due_date || '—'}</span>
                      </td>
                      <td>
                        <div className="action-row">
                          {canUpdateAllTasks && (
                            <button className="icon-btn" onClick={() => openEditTask(task)} title="Edit Task" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <EditIcon size={14} color="#2563eb" />
                            </button>
                          )}
                          {(isPM || isLead || hasPermission('project_tasks:delete')) && (
                            <button className="icon-btn delete-btn" onClick={() => handleDeleteTask(task.id)} title="Delete Task" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TrashIcon size={14} color="#dc2626" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Task Create / Edit Modal */}
        {showTaskModal && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTaskModal(false)}>
            <div className="modal-content modal-wide">
              <div className="modal-header">
                <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                <button className="modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
              </div>
              {taskError && <div className="error-banner">{taskError}</div>}
              <form onSubmit={handleTaskSubmit}>
                <div className="form-group">
                  <label>Task Title *</label>
                  <input type="text" required placeholder="e.g. Implement OAuth2 login"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Task Description</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="task"
                    taskId={editingTask?.id || null}
                    storyId={storyId}
                    value={taskForm.description}
                    onChange={(val) => setTaskForm({ ...taskForm, description: val })}
                    placeholder="Task details and expectations..."
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned Member (Section Members Only)</label>
                    <select
                      value={taskForm.assigned_to}
                      onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {storyMembers.map(sm => (
                        <option key={sm.id} value={sm.user_id}>
                          {sm.user_name} ({sm.project_role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    >
                      <option value="">Default (Pending)</option>
                      {statuses.filter(s => s.scope === 'all' || s.scope === 'task').map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={taskForm.start_date}
                      onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submittingTask}>
                    {submittingTask ? 'Saving...' : (editingTask ? 'Save Task' : 'Create Task')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Section Members Modal */}
        {showMemberModal && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMemberModal(false)}>
            <div className="modal-content">
              <div className="modal-header">
                <h3>Section Members ({story.title})</h3>
                <button className="modal-close" onClick={() => setShowMemberModal(false)}>✕</button>
              </div>

              <div className="members-modal-list">
                {storyMembers.map(sm => (
                  <div key={sm.id} className="member-item">
                    <span>👤 {sm.user_name} ({sm.project_role})</span>
                    <button className="icon-btn delete-btn" onClick={() => handleRemoveStoryMember(sm.id)}>✕</button>
                  </div>
                ))}
                {storyMembers.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No project members assigned to this section yet.</p>
                )}
              </div>

              {memberError && <div className="error-banner">{memberError}</div>}
              <form onSubmit={handleAddStoryMember} className="add-member-section-form">
                <h4>Assign Project Member to Section</h4>
                <div className="form-group">
                  <select
                    required
                    value={selectedProjectMember}
                    onChange={(e) => setSelectedProjectMember(e.target.value)}
                  >
                    <option value="">Select Project Member...</option>
                    {projectMembers
                      .filter(pm => pm.is_active && !storyMembers.some(sm => sm.member === pm.id))
                      .map(pm => (
                        <option key={pm.id} value={pm.id}>
                          {pm.user_name} ({pm.project_role})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={submittingMember}>
                    {submittingMember ? 'Assigning...' : 'Assign to Section'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Manage Statuses Modal ────────────────────────────────────────── */}
        <ManageStatusesModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onStatusesUpdated={fetchAllData}
        />

        <style jsx>{`
          .tasks-page { padding: 24px; max-width: 1200px; }

          .breadcrumb { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; font-size: 0.85rem; }
          .bread-link { color: var(--primary, #3b82f6); text-decoration: none; font-weight: 500; }
          .bread-sep { color: var(--text-secondary, #94a3b8); }
          .bread-current { color: var(--text-secondary, #64748b); }

          .header-card {
            background: var(--card-bg, white);
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 14px;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            gap: 16px;
          }
          .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
          .title-row h2 { margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary, #0f172a); }
          .dept-chip { font-size: 0.72rem; padding: 2px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-weight: 500; }
          .story-desc { color: var(--text-secondary, #64748b); font-size: 0.88rem; margin: 0; }
          .header-actions { display: flex; gap: 10px; flex-shrink: 0; }

          .story-members-bar {
            background: var(--table-bg, #f8fafc);
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 10px;
            padding: 12px 18px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 0.85rem;
          }
          .members-bar-label { font-weight: 600; color: var(--text-primary, #0f172a); }
          .story-member-badge {
            background: var(--card-bg, white);
            border: 1px solid var(--border, #cbd5e1);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.78rem;
            color: var(--text-primary, #334155);
          }
          .no-members-text { color: #d97706; font-size: 0.82rem; }

          .table-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
          .search-input {
            padding: 8px 14px;
            border: 1px solid var(--border, #cbd5e1);
            border-radius: 8px;
            min-width: 220px;
            font-size: 0.9rem;
            background: var(--card-bg, white);
            color: var(--text-primary, #0f172a);
          }
          .status-tabs { display: flex; gap: 6px; background: rgba(0,0,0,0.05); padding: 4px; border-radius: 8px; }
          .tab-btn { border: none; background: transparent; padding: 6px 12px; border-radius: 6px; font-size: 0.82rem; cursor: pointer; color: var(--text-secondary, #64748b); }
          .tab-btn.active { background: var(--card-bg, white); color: var(--text-primary, #0f172a); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

          .tasks-table-card {
            background: var(--card-bg, white);
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 12px;
            overflow: hidden;
          }
          .tasks-table { width: 100%; border-collapse: collapse; text-align: left; }
          .tasks-table th {
            background: var(--table-bg, #f8fafc);
            padding: 12px 16px;
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-secondary, #64748b);
            border-bottom: 1px solid var(--border, #e2e8f0);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .tasks-table td { padding: 14px 16px; border-bottom: 1px solid var(--border, #f1f5f9); font-size: 0.88rem; }
          .task-title-cell { display: flex; flex-direction: column; }
          .task-name { font-weight: 600; color: var(--text-primary, #0f172a); }
          .task-desc-sub { font-size: 0.78rem; color: var(--text-secondary, #64748b); }
          .assignee-text { color: var(--text-primary, #334155); }
          .prio-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
          .date-text { color: var(--text-secondary, #64748b); font-size: 0.82rem; }
          .status-select {
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid var(--border, #cbd5e1);
            font-size: 0.8rem;
            background: var(--input-bg, white);
          }

          .action-row { display: flex; gap: 6px; }
          .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px; border-radius: 4px; }
          .delete-btn:hover { background: #fee2e2; }
          .empty-tasks { padding: 40px; text-align: center; color: var(--text-secondary, #64748b); }

          /* Buttons & Modal */
          .btn { border: none; cursor: pointer; font-weight: 600; border-radius: 8px; padding: 8px 16px; font-size: 0.88rem; }
          .btn-sm { padding: 6px 12px; font-size: 0.82rem; }
          .btn-primary { background: var(--primary, #3b82f6); color: white; }
          .btn-secondary { background: var(--border, #e2e8f0); color: var(--text-primary, #0f172a); }

          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
          .modal-content { background: var(--card-bg, white); border-radius: 14px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
          .modal-wide { max-width: 620px; }
          .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
          .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-secondary); }
          .form-group { margin-bottom: 14px; flex: 1; }
          .form-group label { display: block; font-size: 0.82rem; font-weight: 500; margin-bottom: 5px; color: var(--text-secondary, #374151); }
          .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border, #cbd5e1); border-radius: 7px; font-size: 0.9rem; background: var(--input-bg, white); color: var(--text-primary, #0f172a); box-sizing: border-box; }
          .form-row { display: flex; gap: 12px; align-items: flex-start; }
          .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
          .error-banner { background: #fee2e2; color: #ef4444; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.85rem; }

          .members-modal-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; max-height: 180px; overflow-y: auto; }
          .member-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--table-bg, #f8fafc); border-radius: 6px; font-size: 0.85rem; }
          .add-member-section-form h4 { font-size: 0.9rem; font-weight: 600; margin: 0 0 10px; }

          /* ── Responsive Mobile Media Queries ────────────────────────────── */
          @media (max-width: 640px) {
            .tasks-page {
              padding: 12px !important;
            }
            .header-card {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 14px !important;
              padding: 16px !important;
            }
            .header-actions {
              width: 100% !important;
              flex-direction: column !important;
              gap: 8px !important;
            }
            .header-actions button {
              width: 100% !important;
              justify-content: center !important;
            }
            .filter-bar {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 10px !important;
            }
            .search-input {
              width: 100% !important;
              min-width: 0 !important;
            }
            .tabs-row {
              width: 100% !important;
              overflow-x: auto !important;
              flex-wrap: nowrap !important;
              padding: 4px !important;
            }
            .tabs-row::-webkit-scrollbar {
              display: none;
            }
            .modal-content {
              padding: 18px !important;
              max-width: 95vw !important;
            }
            .form-row {
              flex-direction: column !important;
              gap: 10px !important;
            }
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}
