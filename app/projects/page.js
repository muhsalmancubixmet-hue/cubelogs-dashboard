'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '../../components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { projectService } from '../../lib/services/projectService';
import { TasksIcon, BoardIcon, SprintIcon, StoryIcon, SettingsIcon, EmployeesIcon, EditIcon, DeleteIcon } from '../../components/Icons';
import ManageStatusesModal from '../../components/ManageStatusesModal';
import ConfirmModal from '../../components/ConfirmModal';
import { TiptapEditor, richTextToPlainText } from '../../components/rich-text';

const CATEGORY_STYLES = {
  pending: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  active: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  completed: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
};

const SearchIcon = ({ size = 15, color = "#94a3b8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon = ({ size = 13, color = "#94a3b8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function ProjectActionButton({ onClick, title, children, isIconOnly = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: isIconOnly ? '6px 10px' : '6px 12px',
        borderRadius: 8,
        border: hovered ? '1px solid #2563eb' : '1px solid #bfdbfe',
        background: hovered ? '#2563eb' : '#eff6ff',
        color: hovered ? '#ffffff' : '#1d4ed8',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.2s ease',
        boxShadow: hovered ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function SearchableEmployeeSelect({
  employees,
  selectedId,
  onChange,
  placeholder = "Select Team Lead...",
  photoMap = {},
  isLoading = false,
  errorMsg = null,
  onRetry = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const selectedEmp = employees.find(e => String(e.id) === String(selectedId));

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.name || emp.full_name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const role = (emp.role || emp.designation || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });

  const getPhoto = (emp) => emp.profilePhoto || emp.profile_image || photoMap[String(emp.id)] || photoMap[emp.name?.toLowerCase().trim()];
  const getInitials = (name) => (name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
          background: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {selectedEmp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="avatar-circle" style={{
              width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0
            }}>
              {getPhoto(selectedEmp) ? (
                <img src={getPhoto(selectedEmp)} alt={selectedEmp.name || selectedEmp.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(selectedEmp.name || selectedEmp.email)
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{selectedEmp.name || selectedEmp.email}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{selectedEmp.role || selectedEmp.designation || 'Employee'} • {selectedEmp.email}</div>
            </div>
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>{placeholder}</span>
        )}
        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
          zIndex: 1100,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SearchIcon size={15} color="#94a3b8" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team lead by name, email, or role..."
              style={{
                width: '100%', border: 'none', background: 'transparent',
                outline: 'none', fontSize: 13, color: '#0f172a'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              >
                <CloseIcon size={13} color="#94a3b8" />
              </button>
            )}
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
            {isLoading ? (
              <div style={{ padding: '16px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                Loading eligible team leads...
              </div>
            ) : errorMsg ? (
              <div style={{ padding: '16px', fontSize: 13, color: '#ef4444', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <span>{errorMsg}</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ padding: '16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                {search ? 'No matching team leads found for search.' : 'No eligible employees found for this company.'}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = String(emp.id) === String(selectedId);
                const photo = getPhoto(emp);
                const initials = getInitials(emp.name || emp.email);

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      onChange(emp.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar-circle" style={{
                        width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0
                      }}>
                        {photo ? (
                          <img src={photo} alt={emp.name || emp.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          {emp.name || emp.email}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {emp.role || emp.designation || 'Employee'} • <span style={{ color: '#94a3b8' }}>{emp.email}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 14 }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

import { generateUUID } from '../../lib/api/apiClient';

export default function ProjectsPage() {
  const router = useRouter();
  const { currentUser, hasPermission, showAlert } = useApp();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [statuses, setStatuses] = useState([]);
  const [orgEmployees, setOrgEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [photoMap, setPhotoMap] = useState({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '', description: '', project_type: 'Internal', priority: 'Medium',
    start_date: '', end_date: '', team_lead: '', selected_members: [],
  });

  const [editProject, setEditProject] = useState({
    id: null, name: '', description: '', project_type: 'Internal',
    team_lead: '', start_date: '', end_date: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hoveredCardId, setHoveredCardId] = useState(null);

  const canCreate = currentUser?.isSuperAdmin || hasPermission('projects:create');
  const canUpdate = currentUser?.isSuperAdmin || hasPermission('projects:update');
  const canDelete = currentUser?.isSuperAdmin || hasPermission('projects:delete');
  const canManageMembers = currentUser?.isSuperAdmin || hasPermission('projects:members_manage');
  const canManageStatuses = currentUser?.isSuperAdmin || hasPermission('project_statuses:create') || hasPermission('projects:create');

  const fetchCompanyEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      const res = await projectService.getCompanyEligibleEmployees();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.results)) {
        list = res.results;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && Array.isArray(res.employees)) {
        list = res.employees;
      }
      setOrgEmployees(list);
    } catch (err) {
      console.error('Error fetching company employees:', err);
      setEmployeesError('Unable to load employees. Please try again.');
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      const projList = Array.isArray(data) ? data : (data.results || []);
      setProjects(projList);
    } catch (err) {
      if (err?.status !== 403 && !err?.message?.includes('subscription plan') && !err?.message?.includes('Permission denied')) {
        console.error('Error fetching projects:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await projectService.getProjectStatuses();
      setStatuses(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.status !== 403 && !err?.message?.includes('Permission denied')) {
        console.error('Error fetching statuses:', err);
      }
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);
  useEffect(() => { fetchCompanyEmployees(); }, [fetchCompanyEmployees]);

  const [draftToken, setDraftToken] = useState(() => generateUUID());

  const openCreateModal = () => {
    setErrorMsg('');
    fetchCompanyEmployees();
    const newToken = generateUUID();
    setDraftToken(newToken);
    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const endStr = nextMonth.toISOString().split('T')[0];

    setNewProject({
      name: '', description: '', project_type: 'Internal', priority: 'Medium',
      start_date: todayStr, end_date: endStr, team_lead: '', selected_members: [],
    });
    setShowCreateModal(true);
  };

  const openEditModal = (p, e) => {
    e.stopPropagation();
    setErrorMsg('');
    fetchCompanyEmployees();
    setEditProject({
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      project_type: p.project_type || 'Internal',
      team_lead: p.team_lead || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
    });
    setShowEditModal(true);
  };

  const openMembersModal = async (p, e) => {
    e.stopPropagation();
    setSelectedProject(p);
    setShowMembersModal(true);
  };

  const handleDeleteProjectClick = (p, e) => {
    e.stopPropagation();
    setProjectToDelete(p);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || !projectToDelete.id) return;
    try {
      setIsDeletingProject(true);
      await projectService.deleteProject(projectToDelete.id);
      
      // Immediately remove project from UI state
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

      // Close modal
      setDeleteModalOpen(false);
      setProjectToDelete(null);

      // Background refetch to sync counters and backend state
      fetchProjects();

      // Success toast
      showAlert('Project deleted successfully.', 'Success', 'success');
    } catch (err) {
      console.error('Failed to delete project:', err);
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      showAlert(err.message || 'Failed to delete project.', 'Delete Failed', 'error');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return setErrorMsg('Project Name is required.');
    if (!newProject.team_lead) return setErrorMsg('Team Lead selection is required.');
    if (!newProject.start_date || !newProject.end_date) return setErrorMsg('Start and End Dates are required.');

    try {
      setSubmitting(true);
      setErrorMsg('');
      const payload = {
        name: newProject.name.trim(),
        project_type: newProject.project_type,
        description: newProject.description.trim() || undefined,
        start_date: newProject.start_date,
        end_date: newProject.end_date,
        team_lead: Number(newProject.team_lead),
        members: newProject.selected_members,
        draft_token: draftToken,
      };

      const created = await projectService.createProject(payload);
      setShowCreateModal(false);
      if (created && created.id) router.push(`/projects/${created.id}?created=true`);
      else fetchProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      setErrorMsg(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProject.name.trim()) return setErrorMsg('Project Name is required.');
    try {
      setSubmitting(true);
      setErrorMsg('');
      await projectService.updateProject(editProject.id, {
        name: editProject.name.trim(),
        description: editProject.description.trim() || undefined,
        project_type: editProject.project_type,
        team_lead: editProject.team_lead ? Number(editProject.team_lead) : undefined,
        start_date: editProject.start_date || undefined,
        end_date: editProject.end_date || undefined,
      });
      setShowEditModal(false);
      fetchProjects();
    } catch (err) {
      console.error('Failed to update project:', err);
      setErrorMsg(err.message || 'Failed to update project.');
    } finally {
      setSubmitting(false);
    }
  };

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' or 'COMPLETED'

  const filteredProjects = projects.filter((p) => {
    const isCompleted = p.status_detail?.category === 'completed' || Math.round(p.progress || 0) === 100;
    const matchesTab = activeTab === 'COMPLETED' ? isCompleted : !isCompleted;

    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (p.status_detail && String(p.status_detail.id) === String(statusFilter));

    return matchesTab && matchesSearch && matchesStatus;
  });

  const isProjectCompleted = (p) => p.status_detail?.category === 'completed' || Math.round(p.progress || 0) === 100;
  const activeProjectsCount = projects.filter(p => p.status_detail?.category === 'active' && !isProjectCompleted(p)).length;
  const completedProjectsCount = projects.filter(isProjectCompleted).length;
  const inPlanningCount = projects.filter(p => (!p.status_detail || p.status_detail?.category === 'pending') && !isProjectCompleted(p)).length;

  return (
    <PageWrapper title="Project Management" requiredPermission={['projects:view', 'projects.overview.view', 'projects.board.view', 'projects.my_tasks.view', 'projects.backlog.view', 'projects.sprint.view', 'projects.story.view', 'projects.task.view']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Clean Blue Header Banner matching CubeLogs Theme */}
        <div className="pm-hero-card">
          <div className="pm-hero-left">
            <div className="pm-hero-icon">
              <TasksIcon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 12 }}>
                  Agile Scrum Platform
                </span>
              </div>
              <h1 className="pm-hero-title">
                Project Management Workspace
              </h1>
              <p className="pm-hero-desc">
                Manage projects, backlogs, sprints, task boards, and team execution.
              </p>
            </div>
          </div>

          <div className="pm-hero-actions">
            {canManageStatuses && (
              <button
                onClick={() => setShowStatusModal(true)}
                className="pm-hero-btn"
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#334155',
                }}
              >
                <SettingsIcon size={16} style={{ color: '#475569' }} /> Status Pool
              </button>
            )}

            {canCreate && (
              <button
                onClick={openCreateModal}
                className="btn-primary btn-white-text pm-hero-btn"
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                + Create Project
              </button>
            )}
          </div>
        </div>

        {/* Portfolio KPI Summary Grid */}
        <div className="pm-kpi-grid">
          <div className="pm-kpi-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <BoardIcon size={22} />
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block' }}>Total Projects</span>
              <strong style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{projects.length}</strong>
            </div>
          </div>

          <div className="pm-kpi-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <SprintIcon size={22} />
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'block' }}>Active Projects</span>
              <strong style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{activeProjectsCount}</strong>
            </div>
          </div>

          <div className="pm-kpi-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <StoryIcon size={22} />
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, display: 'block' }}>In Planning</span>
              <strong style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{inPlanningCount}</strong>
            </div>
          </div>

          <div className="pm-kpi-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <TasksIcon size={22} />
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, display: 'block' }}>Completed</span>
              <strong style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{completedProjectsCount}</strong>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pm-filter-bar">
          <div className="pm-filter-tabs">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'ACTIVE' ? '#ffffff' : 'transparent',
                color: activeTab === 'ACTIVE' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'ACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Active & Planning ({projects.length - completedProjectsCount})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'COMPLETED' ? '#ffffff' : 'transparent',
                color: activeTab === 'COMPLETED' ? '#7e22ce' : '#64748b',
                boxShadow: activeTab === 'COMPLETED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Completed ({completedProjectsCount})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search projects by name, key, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pm-search-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pm-status-select"
          >
            <option value="ALL">All Statuses ({statuses.length})</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
            ))}
          </select>
        </div>

        {/* Projects Cards Grid */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#334155' }}>No projects found</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Get started by creating your first Scrum project.</p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                + Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="pm-cards-grid">
            {filteredProjects.map((p) => {
              const isHovered = hoveredCardId === p.id;
              const progressPct = Math.round(p.progress || 0);
              const isCompleted = p.status_detail?.category === 'completed' || progressPct === 100;
              const effectiveCategory = isCompleted ? 'completed' : (p.status_detail?.category || 'pending');
              const statusStyle = CATEGORY_STYLES[effectiveCategory] || { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  onMouseEnter={() => setHoveredCardId(p.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  style={{
                    background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: isHovered ? '0 12px 24px -4px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                    borderColor: isHovered ? '#bfdbfe' : '#e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6 }}>
                          {p.key || `PRJ-${p.id}`}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                        background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`
                      }}>
                        {isCompleted ? 'Completed' : (p.status_detail?.name || 'In Progress')}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {p.name}
                    </h3>

                    {p.description && (
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {richTextToPlainText(p.description)}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        <span>Progress</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressPct}%`, background: isCompleted ? '#8b5cf6' : '#2563eb', borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Footer Info & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Lead: <strong style={{ color: '#334155' }}>{p.team_lead_name || 'Unassigned'}</strong>
                      </div>

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {canManageMembers && (
                          <ProjectActionButton
                            onClick={(e) => openMembersModal(p, e)}
                            title="Manage Members"
                          >
                            <EmployeesIcon size={14} />
                            <span>Team</span>
                          </ProjectActionButton>
                        )}
                        {canUpdate && (
                          <ProjectActionButton
                            onClick={(e) => openEditModal(p, e)}
                            title="Edit Project"
                          >
                            <EditIcon size={14} />
                            <span>Edit</span>
                          </ProjectActionButton>
                        )}
                        {canDelete && (
                          <ProjectActionButton
                            onClick={(e) => handleDeleteProjectClick(p, e)}
                            title="Delete Project"
                            isIconOnly
                          >
                            <DeleteIcon size={14} />
                          </ProjectActionButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Manage Statuses Modal */}
        {showStatusModal && (
          <ManageStatusesModal
            isOpen={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              fetchStatuses();
            }}
          />
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-shell" style={{ width: '100%', maxWidth: 520 }}>
              <div className="modal-header">
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Create Scrum Project</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#64748b', minWidth: 44, minHeight: 44 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="modal-body">
                  {errorMsg && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Project Name *</label>
                    <input
                      type="text"
                      required
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="e.g. CubeLogs HRMS"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                    />
                    <span style={{ fontSize: 11, color: '#2563eb', marginTop: 4, display: 'block' }}>
                      Auto-generated Key Preview: <strong>{generateKeyPreview(newProject.name)}</strong>
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Team Lead *</label>
                    <SearchableEmployeeSelect
                      employees={orgEmployees}
                      selectedId={newProject.team_lead}
                      onChange={(val) => setNewProject({ ...newProject, team_lead: val })}
                      placeholder="Select Team Lead..."
                      photoMap={photoMap}
                      isLoading={employeesLoading}
                      errorMsg={employeesError}
                      onRetry={fetchCompanyEmployees}
                    />
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      ℹ️ Automatically added as Team Lead for this Project. Team Lead access applies to this Project only without altering organization-wide System Role.
                    </span>
                  </div>

                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Start Date *</label>
                      <input
                        type="date"
                        required
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>End Date *</label>
                      <input
                        type="date"
                        required
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Project Description</label>
                    <TiptapEditor
                      preset="standard"
                      targetType="project"
                      draftToken={draftToken}
                      value={newProject.description}
                      onChange={(val) => setNewProject({ ...newProject, description: val })}
                      placeholder="Describe project scope, objectives, and acceptance guidelines..."
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                  >
                    {submitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-shell" style={{ width: '100%', maxWidth: 480 }}>
              <div className="modal-header">
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Edit Project</h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#64748b', minWidth: 44, minHeight: 44 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="modal-body">
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Project Name *</label>
                    <input type="text" required value={editProject.name} onChange={(e) => setEditProject({ ...editProject, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Team Lead</label>
                    <SearchableEmployeeSelect
                      employees={orgEmployees}
                      selectedId={editProject.team_lead}
                      onChange={(val) => setEditProject({ ...editProject, team_lead: val })}
                      placeholder="Select Team Lead..."
                      photoMap={photoMap}
                      isLoading={employeesLoading}
                      errorMsg={employeesError}
                      onRetry={fetchCompanyEmployees}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Project Description</label>
                    <TiptapEditor
                      preset="standard"
                      targetType="project"
                      value={editProject.description}
                      onChange={(val) => setEditProject({ ...editProject, description: val })}
                      placeholder="Describe project scope, objectives, and acceptance guidelines..."
                      projectId={editProject.id}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                  <button type="submit" disabled={submitting} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Project Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Delete Project"
          message={
            projectToDelete
              ? `Are you sure you want to permanently delete "${projectToDelete.name}"?\n\nThis action cannot be undone.`
              : 'Are you sure you want to permanently delete this project?\n\nThis action cannot be undone.'
          }
          confirmLabel={isDeletingProject ? 'Deleting...' : 'Delete Project'}
          danger={true}
          isLoading={isDeletingProject}
          onCancel={() => {
            if (!isDeletingProject) {
              setDeleteModalOpen(false);
              setProjectToDelete(null);
            }
          }}
          onConfirm={handleConfirmDeleteProject}
        />
      </div>

      <style jsx>{`
        .pm-hero-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .pm-hero-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }
        .pm-hero-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
        }
        .pm-hero-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.25;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .pm-hero-desc {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.4;
        }
        .pm-hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .pm-hero-btn {
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          min-height: 40px;
        }
        .pm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .pm-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .pm-filter-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .pm-filter-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 10px;
          flex-wrap: wrap;
        }
        .pm-search-input {
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          flex: 1;
          min-width: 220px;
          box-sizing: border-box;
        }
        .pm-status-select {
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background: #ffffff;
          cursor: pointer;
          font-weight: 600;
          color: #334155;
          min-width: 160px;
          box-sizing: border-box;
        }
        .pm-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .pm-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .pm-hero-card {
            padding: 14px 16px;
            border-radius: 12px;
            gap: 12px;
          }
          .pm-hero-left {
            gap: 10px;
          }
          .pm-hero-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
          }
          .pm-hero-title {
            font-size: 17px;
          }
          .pm-hero-desc {
            font-size: 12px;
            margin-top: 2px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .pm-hero-actions {
            width: 100%;
            gap: 8px;
          }
          .pm-hero-actions button {
            flex: 1;
            width: 100%;
            justify-content: center;
            font-size: 13px;
          }
          .pm-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .pm-kpi-card {
            padding: 10px 10px;
            gap: 8px;
            border-radius: 12px;
          }
          .pm-filter-bar {
            padding: 10px;
            flex-direction: column;
            align-items: stretch;
          }
          .pm-filter-tabs {
            width: 100%;
          }
          .pm-filter-tabs button {
            flex: 1;
            text-align: center;
            padding: 7px 8px;
            font-size: 12px;
          }
          .pm-search-input {
            width: 100%;
            min-width: 100%;
          }
          .pm-status-select {
            width: 100%;
            min-width: 100%;
          }
          .pm-cards-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
        }
      `}</style>
    </PageWrapper>
  );
}
