'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { projectService } from '../../../lib/services/projectService';
import { getProjectCapabilities } from '../../../lib/permissions/projectPermissions';
import { useApp } from '../../../providers/AppProvider';
import {
  DashboardIcon,
  SprintIcon,
  StoryIcon,
  TasksIcon,
  BoardIcon,
  EmployeesIcon,
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  ActivityIcon,
  ShieldIcon,
  FolderIcon,
  UserCheckIcon,
} from '../../../components/Icons';
import ScrumGuidedWorkflow from '../../../components/scrum/ScrumGuidedWorkflow';
import ContextualScrumGuide from '../../../components/scrum/ContextualScrumGuide';
import AddProjectMemberModal from '../../../components/projects/AddProjectMemberModal';
import {
  useLearningMode,
  GlobalScrumHeader,
  ScrumWorkflowBar,
  ScrumHelpPanel
} from '../../../components/scrum/ScrumLearningComponents';
import { TiptapReadOnly, TiptapEditor } from '../../../components/rich-text';
import {
  FileText,
  Edit3,
  ShieldCheck,
  UserCheck as UserCheckLucide,
  User as UserLucide,
  Image as ImageIcon,
  Paperclip,
  ChevronRight,
  CheckCircle2,
  Folder,
  UserPlus,
  Rocket,
  PlusCircle,
  Play,
  Eye,
  Maximize2,
  X
} from 'lucide-react';

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const { currentUser } = useApp() || {};
  const { learningMode, setLearningMode } = useLearningMode();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [showCreatedSuccess, setShowCreatedSuccess] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [descErrorMsg, setDescErrorMsg] = useState('');
  const [showFullSpecModal, setShowFullSpecModal] = useState(false);

  const handleSaveDescription = async () => {
    try {
      setSavingDescription(true);
      setDescErrorMsg('');
      await projectService.updateProject(projectId, {
        description: descriptionValue,
      });

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          project_header: {
            ...prev.project_header,
            description: descriptionValue,
          },
        };
      });

      setIsEditingDescription(false);
    } catch (err) {
      console.error('Failed to update project description:', err);
      setDescErrorMsg(err.message || 'Failed to update description.');
    } finally {
      setSavingDescription(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('created') === 'true') {
        setShowCreatedSuccess(true);
      }
    }
  }, []);

  const fetchOverviewData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await projectService.getProjectOverview(projectId);
      setData(res);
    } catch (err) {
      console.error('Error loading project overview:', err);
      if (err.status === 403) {
        setError('Permission Denied: You do not belong to this project or lack viewing permissions.');
      } else {
        setError('Failed to load project overview data.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Project Overview...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 480, margin: '40px auto', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <ShieldIcon size={24} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>Access Restricted</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>{error || 'Project data could not be retrieved.'}</p>
        <Link href="/projects" className="btn-white-text" style={{ padding: '10px 20px', background: '#2563eb', color: '#ffffff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-block' }}>
          Back to Projects List
        </Link>
      </div>
    );
  }

  const {
    project_header,
    summary_cards,
    current_sprint,
    my_contribution,
    team_members,
    recent_activity,
    my_recent_tasks,
    user_role,
  } = data;

  const caps = getProjectCapabilities(currentUser, user_role, currentUser?.permissions || []);

  // Safe Resolution for Project Manager & Team Lead Names
  const pmMember = (typeof project_header?.project_manager === 'object' && project_header?.project_manager?.name)
    ? project_header.project_manager
    : (team_members?.find(m => (m.project_role || '').toUpperCase().includes('PROJECT MANAGER') || (m.project_role || '').toUpperCase().includes('PM')) || { name: typeof project_header?.project_manager === 'string' ? project_header.project_manager : '' });

  const pmName = pmMember?.name || (typeof project_header?.project_manager === 'string' ? project_header.project_manager : '') || 'Unassigned';

  const leadMember = (typeof project_header?.team_lead === 'object' && project_header?.team_lead?.name)
    ? project_header.team_lead
    : (team_members?.find(m => (m.project_role || '').toUpperCase().includes('TEAM LEAD') || (m.project_role || '').toUpperCase().includes('LEAD')) || { name: typeof project_header?.team_lead === 'string' ? project_header.team_lead : '' });

  const leadName = leadMember?.name || (typeof project_header?.team_lead === 'string' ? project_header.team_lead : '') || 'Unassigned';

  // Health badge styling with SVG indicators
  const healthConfig = {
    'On Track': { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', dotColor: '#16a34a' },
    'At Risk': { bg: '#fef3c7', color: '#b45309', border: '#fde68a', dotColor: '#d97706' },
    'Delayed': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', dotColor: '#dc2626' },
  };
  const health = healthConfig[project_header.health] || healthConfig['On Track'];

  const currentStepId = project_header.progress === 100 ? 13 : (project_header.active_sprint_name ? 12 : ((summary_cards?.total_stories || 0) > 0 ? 9 : 3));
  const progressPercentage = Math.round((currentStepId / 13) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── PROJECT CREATION SUCCESS BANNER ── */}
      {showCreatedSuccess && (
        <div style={{
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckIcon size={18} color="#166534" />
            <span>Project created. You can now add images and attachments.</span>
          </div>
          <button
            onClick={() => setShowCreatedSuccess(false)}
            style={{ background: 'none', border: 'none', color: '#166534', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 1. GLOBAL SCRUM HEADER ── */}
      <GlobalScrumHeader
        location="Project > Overview"
        title="Overview"
        icon={DashboardIcon}
        badge={project_header?.key}
        purpose="The Project Overview gives a high-level view of project health, sprint progress, team activity, and key metrics."
        whoUsesThis="Project Manager • Team Lead • Developers • Stakeholders"
        primaryGoal="Monitor overall team progress, active sprint health, and recent activities."
        nextStep="Review the Product Backlog and plan your next Sprint."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
      />

      {/* ── 2. LEARNING HELP PANEL ── */}
      {learningMode && (
        <ScrumHelpPanel
          title="Scrum Project Overview Guide"
          tipTitle="How to navigate this workspace?"
          tipDescription="Use the top workflow bar or section tabs to navigate between Backlog, Sprints, Scrum Board, My Tasks, and Reports. All data flows continuously through these steps."
          example="Backlog → Sprints → Active Sprint Board → Retrospective → Reports"
          whyAmIDoingThis="The Overview screen keeps the entire team aligned on current project health and sprint progress at a glance."
          definitions={[
            { term: 'Project Health', definition: 'On Track, At Risk, or Delayed status based on sprint delivery pace.' },
            { term: 'Overall Completion', definition: 'Percentage of total project story points completed to date.' },
            { term: 'Recent Activity', definition: 'Live feed of team actions (card moves, PR merges, comments).' },
          ]}
        />
      )}

      {/* ── 2-COLUMN ENTERPRISE SCRUM WORKSPACE LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        
        {/* LEFT COLUMN (MAIN WORKSPACE: HERO BANNER + DOCUMENTATION & SPECIFICATION) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Top Hero Banner Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4 }}>
                {project_header.key || 'PRJ'}
              </span>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                background: health.bg, color: health.color, border: `1px solid ${health.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: health.dotColor }} />
                Health: {project_header.health}
              </span>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                background: project_header.status?.category === 'completed' ? '#f3e8ff' : '#f1f5f9',
                color: project_header.status?.category === 'completed' ? '#7e22ce' : '#334155',
                border: `1px solid ${project_header.status?.category === 'completed' ? '#e9d5ff' : '#cbd5e1'}`
              }}>
                {project_header.status?.category === 'completed' ? 'Read-Only Workspace (Completed)' : (project_header.status?.name || 'Active Workspace')}
              </span>

              {project_header.active_sprint_name && (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <SprintIcon size={13} color="#2563eb" /> {project_header.active_sprint_name}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, color: '#0f172a', margin: '2px 0 0', letterSpacing: '-0.01em' }}>
              {project_header.name}
            </h1>
          </div>

          {/* Project Documentation & Specification Card */}
          {(() => {
            const roleNorm = (user_role || '').toString().toUpperCase().replace(/_/g, ' ').trim();
            const isSuper = Boolean(currentUser?.is_superuser || currentUser?.isSuperAdmin);
            const isProjectManagerOrTeamLead = isSuper ||
              ['ADMIN', 'SUPER ADMIN', 'PROJECT MANAGER', 'TEAM LEAD', 'MANAGER', 'LEAD'].includes(roleNorm) ||
              (project_header?.project_manager?.id === currentUser?.id) ||
              (project_header?.team_lead?.id === currentUser?.id) ||
              Boolean(caps?.canEditProject);

            return (
              <div style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {/* Documentation Header Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={17} color="#2563eb" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                          Specification
                        </h3>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '1px 6px',
                          borderRadius: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          SPECS
                        </span>
                      </div>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b' }}>
                        Scope, requirements & media assets
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {project_header.description && (
                      <button
                        type="button"
                        onClick={() => setShowFullSpecModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 11px',
                          borderRadius: 7,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="View Full Specification Lightbox"
                      >
                        <Eye size={13} color="#0f172a" />
                        <span>View Full</span>
                      </button>
                    )}

                    {isProjectManagerOrTeamLead && !isEditingDescription && (
                      <button
                        type="button"
                        onClick={() => {
                          setDescriptionValue(project_header.description || '');
                          setDescErrorMsg('');
                          setIsEditingDescription(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 11px',
                          borderRadius: 7,
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.06)'
                        }}
                        title="Edit Project Specification (Team Lead & Project Manager only)"
                      >
                        <Edit3 size={13} color="#2563eb" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Document Content Body */}
                {isEditingDescription ? (
                  <div style={{
                    padding: 18,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #cbd5e1'
                  }}>
                    <TiptapEditor
                      preset="standard"
                      targetType="project"
                      projectId={projectId}
                      value={descriptionValue}
                      onChange={(val) => setDescriptionValue(val)}
                      placeholder="Write project description, scope, architecture, paste screenshots, and attach files..."
                      minHeight={220}
                    />

                    {descErrorMsg && (
                      <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                        {descErrorMsg}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(false)}
                        disabled={savingDescription}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDescription}
                        disabled={savingDescription}
                        className="btn-primary"
                        style={{
                          padding: '8px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                        }}
                      >
                        {savingDescription ? 'Saving...' : 'Save Specification'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: project_header.description ? '#ffffff' : '#f8fafc',
                    padding: project_header.description ? '10px 14px' : '20px',
                    borderRadius: 10,
                    border: project_header.description ? '1px solid #f1f5f9' : '1px dashed #cbd5e1',
                    maxHeight: 165,
                    overflowY: 'auto',
                    boxShadow: project_header.description ? 'inset 0 1px 3px rgba(0, 0, 0, 0.02)' : 'none'
                  }}>
                    {project_header.description ? (
                      <TiptapReadOnly content={project_header.description} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', textAlign: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                          <FileText size={22} color="#64748b" />
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 4px' }}>
                          No documentation specification added yet
                        </p>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 460 }}>
                          Team Leads and Project Managers can click <strong>Edit</strong> above to document project scope, paste screenshots, and attach specification files.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

      {/* ── 2. KPI METRICS CARDS GRID ── */}
      <div className="project-kpi-grid">
        {/* Card 1: Stories */}
        <Link
          href={`/projects/${projectId}/backlog`}
          className="project-kpi-card"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', borderRadius: 14,
            border: '2px solid #bfdbfe', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)', textDecoration: 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s, boxShadow 0.15s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', lineHeight: 1.2 }}>Product Backlog</span>
            <div style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
              <StoryIcon size={16} color="#ffffff" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {summary_cards.completed_stories} / {summary_cards.total_stories} Stories
            </div>
            <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4, fontWeight: 700 }}>Open Product Backlog →</div>
          </div>
        </Link>

        {/* Card 2: Tasks Progress */}
        <div className="project-kpi-card" style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', lineHeight: 1.2 }}>Project Tasks</span>
            <div style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TasksIcon size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {summary_cards.completed_tasks} / {summary_cards.total_tasks}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Finished Tasks</div>
          </div>
        </div>

        {/* Card 3: My Tasks */}
        <div className="project-kpi-card" style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', lineHeight: 1.2 }}>My Assigned Work</span>
            <div style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckIcon size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {summary_cards.my_assigned_tasks}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Assigned to Me</div>
          </div>
        </div>

        {/* Card 4: Active Sprint */}
        <div className="project-kpi-card" style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', lineHeight: 1.2 }}>Sprint Progress</span>
            <div style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SprintIcon size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {summary_cards.sprint_progress}%
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Sprint Completion Rate</div>
          </div>
        </div>
      </div>

      {/* ── GUIDED QUICK START CTA BANNER FOR NEW PROJECTS ── */}
      {summary_cards.total_stories === 0 && (
        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', border: '1px solid #bfdbfe', borderRadius: 16, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Rocket size={20} color="#2563eb" />
              <span>Let's build your Scrum project!</span>
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#334155', maxWidth: 600 }}>
              Start by building your Product Backlog, breaking work into Epics and User Stories, and planning your first Sprint.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            <Link href={`/projects/${projectId}/backlog`} className="btn-white-text" style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)' }}>
              <PlusCircle size={15} color="#ffffff" />
              <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Backlog</span>
            </Link>
            <Link href={`/projects/${projectId}/team`} style={{ padding: '9px 16px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <UserPlus size={15} color="#2563eb" />
              <span>Invite Team</span>
            </Link>
            <Link href={`/projects/${projectId}/sprints`} style={{ padding: '9px 16px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Play size={15} color="#16a34a" />
              <span>Create Sprint</span>
            </Link>
          </div>
        </div>
      )}

        {/* LEFT COLUMN: ACTIVE SPRINT & MY CONTRIBUTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Sprint Section */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24,
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SprintIcon size={18} color="#2563eb" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Current Active Sprint</h3>
                </div>
                {current_sprint && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    Active
                  </span>
                )}
              </div>

              {current_sprint ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                      {current_sprint.name}
                    </h4>
                    {current_sprint.goal && (
                      <p style={{ fontSize: 13, color: '#475569', margin: 0, fontStyle: 'italic', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
                        Goal: "{current_sprint.goal}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748b' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CalendarIcon size={14} color="#64748b" /> Sprint Timeline
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {current_sprint.start_date || 'N/A'} → {current_sprint.end_date || 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748b' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ClockIcon size={14} color="#64748b" /> Remaining Time
                    </span>
                    <span style={{ fontWeight: 700, color: current_sprint.remaining_days < 3 ? '#dc2626' : '#2563eb', background: current_sprint.remaining_days < 3 ? '#fee2e2' : '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                      {current_sprint.remaining_days !== null ? `${current_sprint.remaining_days} Days Left` : 'Ongoing'}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      <span>Story Points Completed</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {current_sprint.completed_story_points} / {current_sprint.total_story_points} SP ({current_sprint.progress_percent}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${current_sprint.progress_percent}%`, height: '100%', background: '#2563eb', borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '30px 10px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <SprintIcon size={20} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#334155', margin: '0 0 4px' }}>No Active Sprint</h4>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Sprint planning has not been started for this workspace.
                  </p>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 16 }}>
              <Link href={`/projects/${projectId}/board`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#2563eb', textDecoration: 'none'
              }}>
                Open Scrum Execution Board →
              </Link>
            </div>
          </div>

          {/* My Contribution Section */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24,
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheckIcon size={18} color="#9333ea" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Contribution</h3>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9333ea', background: '#faf5ff', padding: '2px 8px', borderRadius: 10 }}>
                  {my_contribution.completion_percent}% Done
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Assigned Stories</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{my_contribution.assigned_stories_count}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Assigned Tasks</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{my_contribution.assigned_tasks_count}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Completed</span>
                  <strong style={{ color: '#0f172a' }}>{my_contribution.completed_tasks_count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>In Progress</span>
                  <strong style={{ color: '#0f172a' }}>{my_contribution.in_progress_tasks_count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Blocked / Pending</span>
                  <strong style={{ color: '#0f172a' }}>{my_contribution.blocked_tasks_count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#ca8a04', fontWeight: 600 }}>Pending Review</span>
                  <strong style={{ color: '#0f172a' }}>{my_contribution.pending_review_tasks_count}</strong>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 16 }}>
              <Link href={`/projects/${projectId}/my-tasks`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#9333ea', textDecoration: 'none'
              }}>
                View My Assigned Tasks ({my_contribution.assigned_tasks_count}) →
              </Link>
            </div>
          </div>
        </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Unified Overview Sidebar Card (Progress & Leadership) */}
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* Top Section: Progress & Dates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overall Completion</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{project_header.progress}%</span>
            </div>
            
            <div style={{ width: '100%', height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, project_header.progress)}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            
            <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={13} color="#64748b" />
              <span>{project_header.start_date || 'TBD'} → {project_header.end_date || 'TBD'}</span>
            </div>

            <Link
              href={`/projects/${projectId}/backlog`}
              className="btn-white-text"
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff', textDecoration: 'none', fontWeight: 800, fontSize: 12.5,
                boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)', display: 'flex', alignItems: 'center', gap: 6,
                justifyContent: 'center', transition: 'all 0.2s'
              }}
            >
              <Folder size={14} color="#ffffff" />
              <span style={{ color: '#ffffff', fontWeight: 800 }}>Go to Product Backlog</span>
              <ChevronRight size={14} color="#ffffff" />
            </Link>

            {/* Divider & Leadership Section */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              <h4 style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={13} color="#2563eb" />
                <span>Project Leadership</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                {/* Project Manager */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', background: pmName !== 'Unassigned' ? '#eff6ff' : '#f8fafc', borderRadius: 7, border: pmName !== 'Unassigned' ? '1px solid #bfdbfe' : '1px solid #f1f5f9' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
                    {pmName !== 'Unassigned' ? pmName[0].toUpperCase() : <UserLucide size={12} color="#ffffff" />}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 9, color: pmName !== 'Unassigned' ? '#1e40af' : '#64748b', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>PM</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pmName}
                    </div>
                  </div>
                </div>

                {/* Team Lead */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', background: leadName !== 'Unassigned' ? '#f3e8ff' : '#f8fafc', borderRadius: 7, border: leadName !== 'Unassigned' ? '1px solid #e9d5ff' : '1px solid #f1f5f9' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
                    {leadName !== 'Unassigned' ? leadName[0].toUpperCase() : <UserCheckLucide size={12} color="#ffffff" />}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 9, color: leadName !== 'Unassigned' ? '#6b21a8' : '#64748b', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>Lead</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {leadName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: TEAM DIRECTORY, ACTIVITY STREAM & MY RECENT TASKS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Team Members Section */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24,
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmployeesIcon size={18} color="#2563eb" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Project Team ({team_members.length})
                </h3>
              </div>

              {caps.canManageMembers && project_header.status?.category !== 'completed' && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn-white-text"
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  <UserPlus size={14} color="#ffffff" />
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Add Team Members</span>
                </button>
              )}
            </div>

            {showAddMemberModal && (
              <AddProjectMemberModal
                projectId={projectId}
                onClose={() => setShowAddMemberModal(false)}
                onMemberAdded={fetchOverviewData}
              />
            )}

            {team_members.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {team_members.map((member) => {
                  const isPM = (project_header?.project_manager?.id === member.id) || (member.project_role || '').toUpperCase().includes('PROJECT MANAGER');
                  const isTL = (project_header?.team_lead?.id === member.id) || (member.project_role || '').toUpperCase().includes('TEAM LEAD');
                  const isLeader = isPM || isTL;

                  return (
                    <div key={member.id} style={{
                      background: isPM ? '#eff6ff' : (isTL ? '#f3e8ff' : '#f8fafc'),
                      borderRadius: 12,
                      border: isPM ? '1.5px solid #93c5fd' : (isTL ? '1.5px solid #d8b4fe' : '1px solid #e2e8f0'),
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: isLeader ? '0 2px 8px rgba(37, 99, 235, 0.08)' : 'none'
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: isPM ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : (isTL ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'),
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, overflow: 'hidden', flexShrink: 0
                      }}>
                        {member.profile_photo ? (
                          <img src={member.profile_photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>

                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.name}
                          </span>
                          {isPM && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#1e40af', background: '#dbeafe', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>
                              PM
                            </span>
                          )}
                          {isTL && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#6b21a8', background: '#f3e8ff', border: '1px solid #e9d5ff', padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>
                              LEAD
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: isPM ? '#1d4ed8' : (isTL ? '#6d28d9' : '#64748b'), fontWeight: 600 }}>
                          {member.project_role || (isPM ? 'Project Manager' : (isTL ? 'Team Lead' : 'Team Member'))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                No team members currently assigned.
              </div>
            )}
          </div>

          {/* Activity Stream Section */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24,
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ActivityIcon size={18} color="#2563eb" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Activity Stream</h3>
            </div>

            {recent_activity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recent_activity.map((act) => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{act.user_name}</span>{' '}
                      <span style={{ color: '#475569' }}>
                        {typeof act.details === 'string'
                          ? act.details
                          : (act.details && typeof act.details === 'object'
                              ? (act.details.title || act.details.name || act.details.key || act.action)
                              : act.action)}
                      </span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(act.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                No recent activity logs recorded yet.
              </div>
            )}
          </div>

          {/* My Recent Tasks Section */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24,
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TasksIcon size={18} color="#2563eb" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Recent Tasks</h3>
              </div>
              <Link href={`/projects/${projectId}/my-tasks`} style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>

            {my_recent_tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {my_recent_tasks.map((task) => (
                  <div key={task.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', marginRight: 6 }}>{task.task_key}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{task.title}</span>
                    </div>
                    <Link href={`/projects/${projectId}/board`} style={{
                      fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff',
                      padding: '2px 8px', borderRadius: 6, textDecoration: 'none'
                    }}>
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                No tasks currently assigned to you.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* ── FULL SCREEN SPECIFICATION LIGHTBOX MODAL ── */}
      {showFullSpecModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setShowFullSpecModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 920,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={17} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {project_header.name} — Full Project Specification
                  </h2>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Full view of scope, requirements, rich media & attachments</span>
                </div>
              </div>
              <button
                onClick={() => setShowFullSpecModal(false)}
                style={{
                  border: 'none', background: '#f1f5f9', width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <TiptapReadOnly content={project_header.description} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
