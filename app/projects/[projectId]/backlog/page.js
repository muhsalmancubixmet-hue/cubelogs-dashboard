'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '../../../../context/AppContext';
import { projectService } from '../../../../lib/services/projectService';
import { getProjectCapabilities } from '../../../../lib/permissions/projectPermissions';
import { FIBONACCI_STORY_POINTS } from '../../../../lib/constants';
import { TiptapEditor } from '../../../../components/rich-text';
import AssignedMembersSelector from '../../../../components/projects/AssignedMembersSelector';
import {
  EpicIcon,
  StoryIcon,
  TasksIcon,
  SprintIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  WarningIcon,
  CheckIcon,
} from '../../../../components/Icons';
import ContextualScrumGuide from '../../../../components/scrum/ContextualScrumGuide';
import {
  useLearningMode,
  GlobalScrumHeader,
  ScrumWorkflowBar,
  ScrumHelpPanel,
  ScrumSectionBanner,
  ScrumEmptyState
} from '../../../../components/scrum/ScrumLearningComponents';
import { generateUUID } from '../../../../lib/api/apiClient';

const WORK_TYPE_OPTIONS = ['Feature', 'Bug', 'Improvement', 'Research'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const DEFAULT_LABELS = ['Authentication', 'Frontend', 'Backend', 'API', 'Testing'];

export default function ProductBacklogPage() {
  const params = useParams();
  const projectId = params?.projectId;
  const searchParams = useSearchParams();
  const { currentUser } = useApp() || {};
  const { learningMode, setLearningMode } = useLearningMode();
  const initialFilterParam = (searchParams?.get('filter') || 'ALL').toUpperCase();
  const [project, setProject] = useState(null);
  const [userRole, setUserRole] = useState('DEVELOPER');

  const [backlogStories, setBacklogStories] = useState([]);
  const [allStories, setAllStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'tree' (Hierarchy: Epic -> Story -> Task -> Subtask) or 'flat'
  const [viewMode, setViewMode] = useState('tree');

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState(initialFilterParam); // ALL, EPICS, STORIES, TASKS, SUBTASKS, UNASSIGNED, ASSIGNED_TO_ME
  const [searchQuery, setSearchQuery] = useState('');
  const [epicFilter, setEpicFilter] = useState('ALL');
  const [sprintFilter, setSprintFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Tree Expansion state
  const [expandedEpics, setExpandedEpics] = useState({});
  const [expandedStories, setExpandedStories] = useState({});

  // Banners & Notifications
  const [successBanner, setSuccessBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Creation Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStory, setNewStory] = useState({
    title: '',
    work_type: 'Feature',
    epic: '',
    priority: 'Medium',
    story_points: 3,
    due_date: '',
    selected_members: [],
    selected_labels: ['Authentication', 'API'],
    acceptance_criteria: '',
    description: '',
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    story: '',
    priority: 'Medium',
    estimated_hours: 4,
    assigned_to: '',
    due_date: '',
    description: ''
  });

  const [showEpicModal, setShowEpicModal] = useState(false);
  const [newEpic, setNewEpic] = useState({ title: '', description: '', color: '#3b82f6', priority: 'Medium' });

  const [showSprintModal, setShowSprintModal] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: 'Sprint 1', goal: '', start_date: '', end_date: '', capacity: 20 });

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [storyDraftToken, setStoryDraftToken] = useState(() => generateUUID());

  // Capabilities
  const caps = useMemo(() => getProjectCapabilities(currentUser, userRole, currentUser?.permissions || []), [currentUser, userRole]);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorBanner('');
      const [pData, bData, stData, tData, eData, sData, mData] = await Promise.all([
        projectService.getProject(projectId).catch(() => null),
        projectService.getBacklog(projectId).catch(() => []),
        projectService.getProjectStories(projectId).catch(() => []),
        projectService.getProjectTasks({ project_id: projectId }).catch(() => []),
        projectService.getEpics(projectId).catch(() => []),
        projectService.getSprints(projectId).catch(() => []),
        projectService.getProjectMembers(projectId).catch(() => []),
      ]);

      if (pData) {
        setProject(pData);
        if (pData.user_role) setUserRole(pData.user_role);
      }
      setBacklogStories(Array.isArray(bData) ? bData : (bData?.results || []));
      setAllStories(Array.isArray(stData) ? stData : (stData?.results || []));
      setTasks(Array.isArray(tData) ? tData : (tData?.results || []));
      setEpics(Array.isArray(eData) ? eData : (eData?.results || []));
      setSprints(Array.isArray(sData) ? sData : (sData?.results || []));
      setProjectMembers(Array.isArray(mData) ? mData : (mData?.results || []));

      // Auto expand all epics by default for rich tree view
      if (Array.isArray(eData)) {
        const initEpics = {};
        eData.forEach(e => { initEpics[e.id] = true; });
        setExpandedEpics(initEpics);
      }
      if (Array.isArray(stData)) {
        const initStories = {};
        stData.forEach(s => { initStories[s.id] = true; });
        setExpandedStories(initStories);
      }
    } catch (err) {
      console.error('Error loading backlog data:', err);
      setErrorBanner(err.message || 'Failed to load project backlog.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleEpicExpand = (epicId) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const toggleStoryExpand = (storyId) => {
    setExpandedStories(prev => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  // Story Creation
  const openCreateStoryModal = (presetEpicId = '') => {
    setFieldErrors({});
    setNewStory({
      title: '',
      work_type: 'Feature',
      epic: presetEpicId || '',
      priority: 'Medium',
      story_points: 3,
      due_date: project?.end_date || '',
      selected_members: [],
      selected_labels: ['Authentication', 'API'],
      acceptance_criteria: '- Feature functionality works as expected\n- Unit test coverage passes\n- User documentation updated',
      description: 'Describe the user story goals, technical specifications, and expected behavior.',
    });
    setShowCreateModal(true);
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!newStory.title.trim()) return setFieldErrors({ title: 'Story Title is required.' });

    try {
      setSubmitting(true);
      const payload = {
        project: Number(projectId),
        title: newStory.title.trim(),
        work_type: newStory.work_type,
        epic: newStory.epic ? Number(newStory.epic) : undefined,
        priority: newStory.priority,
        story_points: Number(newStory.story_points),
        due_date: newStory.due_date || undefined,
        members: newStory.selected_members,
        labels: newStory.selected_labels,
        acceptance_criteria: newStory.acceptance_criteria.trim(),
        description: newStory.description.trim(),
        sprint: null,
      };

      const created = await projectService.createProjectStory(payload);
      setShowCreateModal(false);
      setSuccessBanner(`Story '${created.title || newStory.title}' created in Backlog!`);
      setTimeout(() => setSuccessBanner(''), 4000);
      loadData();
    } catch (err) {
      console.error('Failed to create story:', err);
      setFieldErrors(err.data || { detail: err.message || 'Failed to create story.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Task Creation
  const openCreateTaskModal = (presetStoryId = '') => {
    setNewTask({
      title: '',
      story: presetStoryId || '',
      priority: 'Medium',
      estimated_hours: 4,
      assigned_to: '',
      assigned_members: [],
      due_date: project?.end_date || '',
      description: ''
    });
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      setSubmitting(true);
      const selectedMembers = (newTask.assigned_members && newTask.assigned_members.length > 0)
        ? newTask.assigned_members
        : (newTask.assigned_to ? [Number(newTask.assigned_to)] : []);

      await projectService.createProjectTask({
        story: newTask.story ? Number(newTask.story) : undefined,
        title: newTask.title.trim(),
        priority: newTask.priority,
        estimated_hours: Number(newTask.estimated_hours) || 4,
        assigned_to: selectedMembers.length > 0 ? selectedMembers[0] : undefined,
        assigned_members: selectedMembers,
        members: selectedMembers,
        due_date: newTask.due_date || undefined,
        description: newTask.description.trim() || undefined,
      });

      setShowTaskModal(false);
      setSuccessBanner('Task created successfully!');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadData();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Epic Creation
  const handleCreateEpic = async (e) => {
    e.preventDefault();
    if (!newEpic.title.trim()) return;
    try {
      setSubmitting(true);
      await projectService.createEpic(projectId, newEpic);
      setShowEpicModal(false);
      setNewEpic({ title: '', description: '', color: '#3b82f6', priority: 'Medium' });
      setSuccessBanner('Epic created successfully!');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create epic.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sprint Creation
  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!newSprint.name.trim()) return;
    try {
      setSubmitting(true);
      await projectService.createSprint({
        project: Number(projectId),
        name: newSprint.name.trim(),
        goal: newSprint.goal.trim() || undefined,
        start_date: newSprint.start_date || new Date().toISOString().split('T')[0],
        end_date: newSprint.end_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        capacity: Number(newSprint.capacity) || 20,
      });
      setShowSprintModal(false);
      setSuccessBanner('Sprint created successfully!');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create sprint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveToSprint = async (storyId, sprintId) => {
    try {
      await projectService.moveStorySprint(storyId, sprintId ? Number(sprintId) : null);
      setSuccessBanner(sprintId ? 'Story assigned to sprint.' : 'Story moved to backlog.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      alert('Failed to move story.');
    }
  };

  const handleDeleteStory = async (storyId, title) => {
    if (!confirm(`Are you sure you want to delete story '${title}'?`)) return;
    try {
      await projectService.deleteStory(storyId);
      setSuccessBanner('Story deleted.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete story.');
    }
  };

  const handleDeleteTask = async (taskId, title) => {
    if (!confirm(`Are you sure you want to delete task '${title}'?`)) return;
    try {
      await projectService.deleteTask(taskId);
      setSuccessBanner('Task deleted.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  // Filter application
  const filteredStories = useMemo(() => {
    return allStories.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (s.title || '').toLowerCase().includes(q);
        const matchKey = (s.story_key || s.key || '').toLowerCase().includes(q);
        if (!matchTitle && !matchKey) return false;
      }
      // Entity Type Filter
      if (typeFilter === 'STORIES' && s.epic) return true; // keep
      if (typeFilter === 'UNASSIGNED' && s.sprint) return false;
      if (typeFilter === 'ASSIGNED_TO_ME') {
        const isAssigned = Array.isArray(s.story_members) && s.story_members.some(m => m.member?.user === currentUser?.id);
        if (!isAssigned) return false;
      }
      // Epic Filter
      if (epicFilter !== 'ALL' && String(s.epic) !== String(epicFilter)) return false;
      // Sprint Filter
      if (sprintFilter === 'BACKLOG' && s.sprint) return false;
      if (sprintFilter !== 'ALL' && sprintFilter !== 'BACKLOG' && String(s.sprint) !== String(sprintFilter)) return false;
      // Priority Filter
      if (priorityFilter !== 'ALL' && s.priority !== priorityFilter) return false;
      // Status Filter
      if (statusFilter !== 'ALL' && s.status_detail?.name !== statusFilter && s.status !== statusFilter) return false;

      return true;
    });
  }, [allStories, searchQuery, typeFilter, epicFilter, sprintFilter, priorityFilter, statusFilter, currentUser?.id]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchKey = (t.task_key || '').toLowerCase().includes(q);
        if (!matchTitle && !matchKey) return false;
      }
      if (typeFilter === 'ASSIGNED_TO_ME' && t.assigned_to !== currentUser?.id) return false;
      if (typeFilter === 'UNASSIGNED' && t.assigned_to) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, typeFilter, priorityFilter, currentUser?.id]);

  const totalStoryPoints = useMemo(() => {
    return allStories.reduce((acc, s) => acc + (Number(s.story_points) || 0), 0);
  }, [allStories]);

  const readyStoriesCount = useMemo(() => {
    return allStories.filter(s => !s.sprint && s.story_points > 0).length;
  }, [allStories]);

  const backlogOnlyCount = useMemo(() => {
    return allStories.filter(s => !s.sprint).length;
  }, [allStories]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* ── 1. GLOBAL SCRUM HEADER (5 CORE QUESTIONS) ── */}
      <GlobalScrumHeader
        location="Project > Backlog"
        title="Backlog"
        icon={StoryIcon}
        badge={allStories.length}
        purpose="The Product Backlog contains every feature, enhancement, and requirement planned for this project."
        whoUsesThis="Project Manager • Product Owner • Team Lead • Developers"
        primaryGoal="Organize, prioritize, and estimate upcoming user requirements before Sprint Planning."
        nextStep="Move estimated and prioritized Stories into a planned Sprint."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
        actionButtons={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={viewMode === 'tree' ? 'btn-white-text' : ''}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: viewMode === 'tree' ? '#2563eb' : 'transparent',
                  color: viewMode === 'tree' ? '#ffffff' : '#64748b', minHeight: 32
                }}
              >
                Tree View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={viewMode === 'flat' ? 'btn-white-text' : ''}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: viewMode === 'flat' ? '#2563eb' : 'transparent',
                  color: viewMode === 'flat' ? '#ffffff' : '#64748b', minHeight: 32
                }}
              >
                Flat List
              </button>
            </div>

            {caps.canCreateEpic && (
              <button
                type="button"
                onClick={() => setShowEpicModal(true)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
              >
                <EpicIcon size={13} color="#2563eb" /> + Epic
              </button>
            )}

            {caps.canCreateStory && (
              <button
                type="button"
                onClick={() => openCreateStoryModal()}
                className="btn-primary"
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
              >
                <PlusIcon size={13} color="#ffffff" /> + Story
              </button>
            )}

            {caps.canCreateTask && (
              <button
                type="button"
                onClick={() => openCreateTaskModal()}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
              >
                <TasksIcon size={13} color="#2563eb" /> + Task
              </button>
            )}

            {caps.canCreateSprint && (
              <button
                type="button"
                onClick={() => setShowSprintModal(true)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
              >
                <SprintIcon size={13} color="#2563eb" /> + Sprint
              </button>
            )}
          </div>
        )}
      />

      {/* Success/Error Banners */}
      {successBanner && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckIcon size={14} color="#166534" />
          <span>{successBanner}</span>
        </div>
      )}
      {errorBanner && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon size={14} color="#991b1b" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Quick Category Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'EPICS', label: `Epics (${epics.length})` },
              { id: 'STORIES', label: `Stories (${allStories.length})` },
              { id: 'TASKS', label: `Tasks (${tasks.length})` },
              { id: 'UNASSIGNED', label: 'Unassigned Sprint' },
              { id: 'ASSIGNED_TO_ME', label: 'Assigned to Me' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: typeFilter === f.id ? 700 : 600,
                  border: typeFilter === f.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: typeFilter === f.id ? '#eff6ff' : '#ffffff',
                  color: typeFilter === f.id ? '#2563eb' : '#475569',
                  cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 36
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search backlog titles or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', background: '#f8fafc', minHeight: 36, boxSizing: 'border-box' }}
          />
        </div>

        {/* Advanced Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', width: 'auto' }}>
            <label style={{ fontWeight: 600, color: '#64748b', minWidth: 50 }}>Epic:</label>
            <select value={epicFilter} onChange={(e) => setEpicFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, flex: 1, minHeight: 36, background: '#ffffff', boxSizing: 'border-box' }}>
              <option value="ALL">All Epics</option>
              {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', width: 'auto' }}>
            <label style={{ fontWeight: 600, color: '#64748b', minWidth: 50 }}>Sprint:</label>
            <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, flex: 1, minHeight: 36, background: '#ffffff', boxSizing: 'border-box' }}>
              <option value="ALL">All Sprints</option>
              <option value="BACKLOG">Product Backlog Only</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', width: 'auto' }}>
            <label style={{ fontWeight: 600, color: '#64748b', minWidth: 50 }}>Priority:</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, flex: 1, minHeight: 36, background: '#ffffff', boxSizing: 'border-box' }}>
              <option value="ALL">All Priorities</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {(typeFilter !== 'ALL' || searchQuery || epicFilter !== 'ALL' || sprintFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <button
              onClick={() => { setTypeFilter('ALL'); setSearchQuery(''); setEpicFilter('ALL'); setSprintFilter('ALL'); setPriorityFilter('ALL'); setStatusFilter('ALL'); }}
              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 0', minHeight: 36 }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Backlog Content View */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Loading Product Backlog hierarchy...
        </div>
      ) : viewMode === 'tree' ? (
        /* TREE HIERARCHY VIEW: EPIC -> STORY -> TASK -> SUBTASK */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Epics Accordion Sections */}
          {epics.map((epic) => {
            const isExpanded = !!expandedEpics[epic.id];
            const epicStories = filteredStories.filter(s => String(s.epic) === String(epic.id));

            return (
              <div key={epic.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                {/* Epic Bar */}
                <div
                  onClick={() => toggleEpicExpand(epic.id)}
                  style={{
                    padding: '14px 18px', background: '#f8fafc', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>{isExpanded ? '▼' : '►'}</span>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: epic.color || '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                      {epic.key || `EPC-${epic.id}`}
                    </span>
                    <strong style={{ fontSize: 14, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{epic.title}</strong>
                    <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontWeight: 600, flexShrink: 0 }}>
                      {epicStories.length} Stories
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                    {caps.canCreateStory && (
                      <button
                        onClick={() => openCreateStoryModal(epic.id)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36 }}
                      >
                        + Add Story
                      </button>
                    )}
                  </div>
                </div>

                {/* Epic Stories Children */}
                {isExpanded && (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: '#ffffff' }}>
                    {epicStories.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                        No stories linked to this epic yet.
                      </div>
                    ) : (
                      epicStories.map(story => (
                        <StoryItemRow
                          key={story.id}
                          story={story}
                          tasks={filteredTasks.filter(t => String(t.story) === String(story.id))}
                          sprints={sprints}
                          caps={caps}
                          expanded={!!expandedStories[story.id]}
                          onToggleExpand={() => toggleStoryExpand(story.id)}
                          onMoveSprint={handleMoveToSprint}
                          onDeleteStory={handleDeleteStory}
                          onDeleteTask={handleDeleteTask}
                          onCreateTask={openCreateTaskModal}
                          projectId={projectId}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned Epic Stories Block */}
          {(() => {
            const unassignedStories = filteredStories.filter(s => !s.epic);
            if (unassignedStories.length === 0) return null;
            return (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Stories Without Epic ({unassignedStories.length})</span>
                  </div>
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {unassignedStories.map(story => (
                    <StoryItemRow
                      key={story.id}
                      story={story}
                      tasks={filteredTasks.filter(t => String(t.story) === String(story.id))}
                      sprints={sprints}
                      caps={caps}
                      expanded={!!expandedStories[story.id]}
                      onToggleExpand={() => toggleStoryExpand(story.id)}
                      onMoveSprint={handleMoveToSprint}
                      onDeleteStory={handleDeleteStory}
                      onDeleteTask={handleDeleteTask}
                      onCreateTask={openCreateTaskModal}
                      projectId={projectId}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* FLAT LIST VIEW */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>Key / Type</th>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px' }}>Sprint</th>
                <th style={{ padding: '12px 16px' }}>Priority</th>
                <th style={{ padding: '12px 16px' }}>Points / Est</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStories.map(story => (
                <tr key={story.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                      {story.story_key || `ST-${story.id}`}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/projects/${projectId}/stories/${story.id}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {story.title}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={story.sprint || ''}
                      onChange={(e) => handleMoveToSprint(story.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    >
                      <option value="">Product Backlog</option>
                      {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: story.priority === 'Critical' ? '#fef2f2' : '#f1f5f9', color: story.priority === 'Critical' ? '#dc2626' : '#475569' }}>
                      {story.priority || 'Medium'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{story.story_points || 0} pts</strong>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link href={`/projects/${projectId}/stories/${story.id}`} style={{ color: '#2563eb', marginRight: 12, textDecoration: 'none', fontWeight: 600, fontSize: 12 }}>
                      View →
                    </Link>
                    {caps.canDeleteStory && (
                      <button onClick={() => handleDeleteStory(story.id, story.title)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE STORY MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>+ Create Product Backlog Story</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateStory} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Story Title *</label>
                  <input
                    type="text"
                    required
                    value={newStory.title}
                    onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                    placeholder="e.g. As a user, I want to filter backlog by epics"
                    style={inputStyle}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Work Type</label>
                    <select value={newStory.work_type} onChange={(e) => setNewStory({ ...newStory, work_type: e.target.value })} style={inputStyle}>
                      {WORK_TYPE_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Epic</label>
                    <select value={newStory.epic} onChange={(e) => setNewStory({ ...newStory, epic: e.target.value })} style={inputStyle}>
                      <option value="">No Epic (Unassigned)</option>
                      {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={newStory.priority} onChange={(e) => setNewStory({ ...newStory, priority: e.target.value })} style={inputStyle}>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Story Points</label>
                    <select value={newStory.story_points} onChange={(e) => setNewStory({ ...newStory, story_points: Number(e.target.value) })} style={inputStyle}>
                      {FIBONACCI_STORY_POINTS.map(pt => <option key={pt} value={pt}>{pt} points</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: 6, display: 'block' }}>Assign Members / Team</label>
                  <AssignedMembersSelector
                    projectId={projectId}
                    selectedIds={newStory.selected_members || []}
                    onChange={(selectedIds) => setNewStory({ ...newStory, selected_members: selectedIds })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    value={newStory.acceptance_criteria}
                    onChange={(e) => setNewStory({ ...newStory, acceptance_criteria: e.target.value })}
                    style={{ ...inputStyle, fontFamily: 'sans-serif' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="story"
                    storyId={null}
                    draftToken={storyDraftToken}
                    projectId={projectId}
                    value={newStory.description}
                    onChange={(val) => setNewStory({ ...newStory, description: val })}
                    minHeight={100}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-white-text" style={submitBtnStyle}>
                  {submitting ? 'Creating Story...' : 'Create Backlog Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>+ Create Task</h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, flex: 1, overflowY: 'auto' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Implement API endpoint for backlog filtering"
                    style={inputStyle}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Parent Story</label>
                    <select value={newTask.story} onChange={(e) => setNewTask({ ...newTask, story: e.target.value })} style={inputStyle}>
                      <option value="">No Parent Story</option>
                      {allStories.map(s => <option key={s.id} value={s.id}>{s.story_key || `ST-${s.id}`} - {s.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} style={inputStyle}>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Estimated Hours</label>
                  <input type="number" min={1} value={newTask.estimated_hours} onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: 6, display: 'block' }}>Assign Developers / Team Members</label>
                  <AssignedMembersSelector
                    projectId={projectId}
                    selectedIds={newTask.assigned_members || (newTask.assigned_to ? [Number(newTask.assigned_to)] : [])}
                    onChange={(selectedIds) => setNewTask({
                      ...newTask,
                      assigned_members: selectedIds,
                      assigned_to: selectedIds.length > 0 ? selectedIds[0] : ''
                    })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 'auto', paddingTop: 16 }}>
                <button type="button" onClick={() => setShowTaskModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-white-text" style={submitBtnStyle}>
                  {submitting ? 'Creating Task...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EPIC MODAL */}
      {showEpicModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>+ Create Epic</h3>
              <button onClick={() => setShowEpicModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateEpic} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Epic Title *</label>
                  <input
                    type="text"
                    required
                    value={newEpic.title}
                    onChange={(e) => setNewEpic({ ...newEpic, title: e.target.value })}
                    placeholder="e.g. Authentication & Security Revamp"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea rows={3} value={newEpic.description} onChange={(e) => setNewEpic({ ...newEpic, description: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEpicModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-white-text" style={submitBtnStyle}>
                  {submitting ? 'Creating Epic...' : 'Create Epic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SPRINT MODAL */}
      {showSprintModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>+ Create Sprint</h3>
              <button onClick={() => setShowSprintModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Sprint Name *</label>
                  <input
                    type="text"
                    required
                    value={newSprint.name}
                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                    placeholder="e.g. Sprint 1 - Core Foundations"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sprint Goal</label>
                  <textarea rows={2} value={newSprint.goal} onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })} style={inputStyle} />
                </div>
                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" value={newSprint.start_date} onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Date</label>
                    <input type="date" value={newSprint.end_date} onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowSprintModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-white-text" style={submitBtnStyle}>
                  {submitting ? 'Creating Sprint...' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component Row for Story in Tree View ──
function StoryItemRow({ story, tasks, sprints, caps, expanded, onToggleExpand, onMoveSprint, onDeleteStory, onDeleteTask, onCreateTask, projectId }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <button onClick={onToggleExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748b', minWidth: 24, minHeight: 24 }}>
            {expanded ? '▼' : '►'}
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
            {story.story_key || `ST-${story.id}`}
          </span>
          <Link href={`/projects/${projectId}/stories/${story.id}`} style={{ color: '#0f172a', fontWeight: 600, fontSize: 13, textDecoration: 'none', minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {story.title}
          </Link>
          <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>
            {tasks.length} tasks
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={story.sprint || ''}
            onChange={(e) => onMoveSprint(story.id, e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
          >
            <option value="">Backlog</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {caps.canCreateTask && (
            <button
              onClick={() => onCreateTask(story.id)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
            >
              + Task
            </button>
          )}

          {caps.canDeleteStory && (
            <button
              onClick={() => onDeleteStory(story.id, story.title)}
              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, cursor: 'pointer', padding: '5px' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {expanded && tasks.length > 0 && (
        <div style={{ padding: '8px 14px 12px 24px', display: 'flex', flexDirection: 'column', gap: 6, background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                  {task.task_key || `TASK-${task.id}`}
                </span>
                <Link href={`/projects/${projectId}/stories/${story.id}/tasks/${task.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 500, minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {task.title}
                </Link>
                {task.assigned_to_name && (
                  <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>({task.assigned_to_name})</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: task.priority === 'Critical' ? '#fef2f2' : '#ffffff', color: task.priority === 'Critical' ? '#dc2626' : '#64748b', border: '1px solid #e2e8f0' }}>
                  {task.priority || 'Medium'}
                </span>
                {caps.canDeleteTask && (
                  <button onClick={() => onDeleteTask(task.id, task.title)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, cursor: 'pointer', padding: 4 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ──
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', minHeight: 44 };
const cancelBtnStyle = { padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 };
const submitBtnStyle = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 };
