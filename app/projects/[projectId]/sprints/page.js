'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { projectService } from '../../../../lib/services/projectService';
import { useApp } from '../../../../providers/AppProvider';
import { getProjectCapabilities } from '../../../../lib/permissions/projectPermissions';
import BurndownChart from '../../../../components/scrum/BurndownChart';
import VelocityChart from '../../../../components/scrum/VelocityChart';
import { RocketIcon, EditIcon, TrashIcon, CheckIcon, ClockIcon, SprintIcon, CalendarIcon, BarChartIcon, PlusIcon, WarningIcon, CloseIcon } from '../../../../components/Icons';
import ContextualScrumGuide from '../../../../components/scrum/ContextualScrumGuide';
import RetrospectiveBoard from '../../../../components/scrum/RetrospectiveBoard';
import {
  useLearningMode,
  GlobalScrumHeader,
  ScrumWorkflowBar,
  ScrumHelpPanel,
  ScrumSectionBanner
} from '../../../../components/scrum/ScrumLearningComponents';

function calculateDaysBetween(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

export default function SprintsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const { learningMode, setLearningMode } = useLearningMode();

  const [sprints, setSprints] = useState([]);
  const [backlogStories, setBacklogStories] = useState([]);
  const [allStories, setAllStories] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [burndownData, setBurndownData] = useState(null);
  const [velocityData, setVelocityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Custom Delete Sprint Modal State
  const [deletingSprint, setDeletingSprint] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Custom Cancel Sprint Modal State
  const [cancellingSprint, setCancellingSprint] = useState(null);
  const [cancelForm, setCancelForm] = useState({ reason: '', move_incomplete_to: 'backlog', target_sprint_id: '' });
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Reopen Sprint State
  const [submittingReopenId, setSubmittingReopenId] = useState(null);
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  // Create Sprint Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '', capacity: 20 });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Sprint Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [editSprintForm, setEditSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', capacity: 20 });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Multi-select Add Stories Modal
  const [assigningSprint, setAssigningSprint] = useState(null);
  const [selectedStoryIds, setSelectedStoryIds] = useState([]);
  const [submittingAddStories, setSubmittingAddStories] = useState(false);

  const { currentUser } = useApp() || {};
  const [project, setProject] = useState(null);

  const caps = getProjectCapabilities(currentUser, project?.user_role || 'ADMIN', currentUser?.permissions || []);
  const userCapabilities = {
    canManage: caps.canCreateSprint || caps.canEditSprint || caps.canStartSprint,
    canDelete: caps.canDeleteSprint,
  };

  const loadSprintData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');

      const [sData, vData, bData, stData, pData] = await Promise.all([
        projectService.getSprints(projectId).catch(() => []),
        projectService.getVelocityData(projectId).catch(() => []),
        projectService.getBacklog(projectId).catch(() => []),
        projectService.getProjectStories(projectId).catch(() => []),
        projectService.getProject(projectId).catch(() => null),
      ]);

      const sprintList = Array.isArray(sData) ? sData : (sData?.results || []);
      setSprints(sprintList);
      setVelocityData(Array.isArray(vData) ? vData : (vData?.results || []));
      setBacklogStories(Array.isArray(bData) ? bData : (bData?.results || []));
      setAllStories(Array.isArray(stData) ? stData : (stData?.results || []));
      setProject(pData);

      const active = sprintList.find((s) => s.status === 'active');
      setActiveSprint(active || null);

      if (active?.id) {
        try {
          const burnData = await projectService.getBurndownData(active.id);
          setBurndownData(burnData);
        } catch (err) {
          console.error('Error fetching burndown:', err);
        }
      }
    } catch (err) {
      console.error('Error loading sprints page:', err);
      setErrorMsg('Failed to load sprints data.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadSprintData(); }, [loadSprintData]);

  // Open Delete Modal
  const openDeleteSprintModal = (sprint, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setModalErrorMsg('');
    setDeletingSprint(sprint);
  };

  const handleConfirmDeleteSprint = async () => {
    if (!deletingSprint) return;
    try {
      setSubmittingDelete(true);
      setModalErrorMsg('');
      const sprintName = deletingSprint.name;
      await projectService.deleteSprint(deletingSprint.id);
      setSprints((prev) => prev.filter((s) => s.id !== deletingSprint.id));
      setDeletingSprint(null);
      setSuccessBanner(`Sprint '${sprintName}' was permanently deleted. Assigned stories returned to Product Backlog.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadSprintData();
    } catch (err) {
      console.error('Failed to delete sprint:', err);
      setModalErrorMsg(err.message || 'Only Planning Sprints can be deleted.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Open Cancel Modal
  const openCancelSprintModal = (sprint, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setModalErrorMsg('');
    setCancellingSprint(sprint);
    setCancelForm({ reason: '', move_incomplete_to: 'backlog', target_sprint_id: '' });
  };

  const handleConfirmCancelSprint = async (e) => {
    e.preventDefault();
    if (!cancellingSprint) return;
    if (!cancelForm.reason.trim()) {
      setModalErrorMsg('Cancellation Reason is required.');
      return;
    }
    if (cancelForm.move_incomplete_to === 'sprint' && !cancelForm.target_sprint_id) {
      setModalErrorMsg('Please select a target Planning Sprint for incomplete stories.');
      return;
    }

    try {
      setSubmittingCancel(true);
      setModalErrorMsg('');
      const sprintName = cancellingSprint.name;
      await projectService.cancelSprint(cancellingSprint.id, {
        reason: cancelForm.reason.trim(),
        move_incomplete_to: cancelForm.move_incomplete_to,
        target_sprint_id: cancelForm.move_incomplete_to === 'sprint' ? Number(cancelForm.target_sprint_id) : null,
      });
      setCancellingSprint(null);
      setSuccessBanner(`Sprint '${sprintName}' has been cancelled.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadSprintData();
    } catch (err) {
      console.error('Failed to cancel sprint:', err);
      setModalErrorMsg(err.message || 'Failed to cancel sprint.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Reopen Sprint
  const handleReopenSprint = async (sprintId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      setSubmittingReopenId(sprintId);
      setErrorMsg('');
      const reopened = await projectService.reopenSprint(sprintId);
      setSuccessBanner(`Sprint '${reopened.name}' has been reopened and returned to Planning.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadSprintData();
    } catch (err) {
      console.error('Failed to reopen sprint:', err);
      setErrorMsg(err.message || 'Only Cancelled Sprints can be reopened.');
    } finally {
      setSubmittingReopenId(null);
    }
  };

  const openCreateSprintModal = () => {
    setErrorMsg('');
    const todayStr = new Date().toISOString().split('T')[0];
    let defaultStart = todayStr;

    if (project?.start_date && project.start_date > todayStr) {
      defaultStart = project.start_date;
    }

    const startDateObj = new Date(defaultStart);
    const sprintEndObj = new Date(startDateObj);
    sprintEndObj.setDate(sprintEndObj.getDate() + 14);
    const endStr = sprintEndObj.toISOString().split('T')[0];

    const nextNumber = sprints.length + 1;
    setNewSprint({
      name: `Sprint ${nextNumber}`,
      goal: 'Deliver high-priority backlog user stories',
      start_date: defaultStart,
      end_date: endStr,
      capacity: 20,
    });
    setShowCreateModal(true);
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!newSprint.name.trim()) {
      setErrorMsg('Sprint Name is required.');
      return;
    }
    if (!newSprint.goal.trim()) {
      setErrorMsg('Sprint Goal is required.');
      return;
    }
    if (!newSprint.start_date || !newSprint.end_date) {
      setErrorMsg('Start Date and End Date are required.');
      return;
    }
    if (newSprint.end_date <= newSprint.start_date) {
      setErrorMsg('End Date must be strictly after Start Date.');
      return;
    }
    if (Number(newSprint.capacity) <= 0) {
      setErrorMsg('Capacity must be greater than zero.');
      return;
    }

    try {
      setSubmittingCreate(true);
      setErrorMsg('');
      await projectService.createSprint({
        project: Number(projectId),
        name: newSprint.name.trim(),
        goal: newSprint.goal.trim(),
        start_date: newSprint.start_date,
        end_date: newSprint.end_date,
        capacity: Number(newSprint.capacity) || 20,
      });
      setShowCreateModal(false);
      setSuccessBanner('Planning Sprint created successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadSprintData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create sprint.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditSprintModal = (sprint, e) => {
    e.stopPropagation();
    setErrorMsg('');
    setEditingSprint(sprint);
    setEditSprintForm({
      name: sprint.name || '',
      goal: sprint.goal || '',
      start_date: sprint.start_date || '',
      end_date: sprint.end_date || '',
      capacity: sprint.capacity || 20,
    });
    setShowEditModal(true);
  };

  const handleEditSprint = async (e) => {
    e.preventDefault();
    if (!editingSprint) return;
    try {
      setSubmittingEdit(true);
      setErrorMsg('');
      await projectService.updateSprint(editingSprint.id, {
        name: editSprintForm.name.trim(),
        goal: editSprintForm.goal.trim(),
        start_date: editSprintForm.start_date,
        end_date: editSprintForm.end_date,
        capacity: Number(editSprintForm.capacity) || 20,
      });
      setShowEditModal(false);
      setSuccessBanner('Sprint updated successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadSprintData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update sprint.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleStartSprint = async (sprint, e) => {
    e.stopPropagation();
    const sprintStories = allStories.filter((st) => st.sprint === sprint.id);
    if (sprintStories.length === 0) {
      setErrorMsg(`Cannot start '${sprint.name}'. At least one story must be added from the Product Backlog first.`);
      return;
    }
    if (activeSprint && activeSprint.id !== sprint.id) {
      setErrorMsg(`Cannot start '${sprint.name}': Sprint '${activeSprint.name}' is currently active.`);
      return;
    }

    try {
      setErrorMsg('');
      await projectService.startSprint(sprint.id);
      setSuccessBanner(`🚀 Sprint '${sprint.name}' is now ACTIVE! Navigate to Scrum Board to track execution.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      loadSprintData();
    } catch (err) {
      console.error('Failed to start sprint:', err);
      setErrorMsg(err.message || 'Failed to start sprint.');
    }
  };

  const [completingSprint, setCompletingSprint] = useState(null);
  const [incompleteDestination, setIncompleteDestination] = useState('backlog');
  const [targetPlanningSprintId, setTargetPlanningSprintId] = useState('');
  const [submittingCompleteSprint, setSubmittingCompleteSprint] = useState(false);

  const openCompleteSprintModal = (sprint, e) => {
    if (e) e.stopPropagation();
    setCompletingSprint(sprint);
    setIncompleteDestination('backlog');
    setTargetPlanningSprintId('');
    setErrorMsg('');
  };

  const handleCompleteSprintSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!completingSprint) return;
    try {
      setSubmittingCompleteSprint(true);
      setErrorMsg('');
      const targetId = incompleteDestination === 'next_sprint' ? (targetPlanningSprintId ? Number(targetPlanningSprintId) : undefined) : undefined;
      await projectService.completeSprint(completingSprint.id, targetId);
      setCompletingSprint(null);
      setSuccessBanner(`Sprint '${completingSprint.name}' completed successfully.`);
      setTimeout(() => setSuccessBanner(''), 3000);
      loadSprintData();
    } catch (err) {
      console.error('Failed to complete sprint:', err);
      setErrorMsg(err.message || 'Failed to complete sprint.');
    } finally {
      setSubmittingCompleteSprint(false);
    }
  };

  // Add Stories Modal Open
  const openAddStoriesModal = (sprint, e) => {
    e.stopPropagation();
    setAssigningSprint(sprint);
    setSelectedStoryIds([]);
  };

  const handleAddStoriesSubmit = async (e) => {
    e.preventDefault();
    if (!assigningSprint || selectedStoryIds.length === 0) return;
    try {
      setSubmittingAddStories(true);
      setErrorMsg('');
      await projectService.addStoriesToSprint(assigningSprint.id, selectedStoryIds);
      setAssigningSprint(null);
      setSelectedStoryIds([]);
      setSuccessBanner(`Added ${selectedStoryIds.length} story/stories to '${assigningSprint.name}'.`);
      setTimeout(() => setSuccessBanner(''), 3000);
      loadSprintData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add stories to sprint.');
    } finally {
      setSubmittingAddStories(false);
    }
  };

  const handleRemoveStoryFromSprint = async (sprintId, storyId, e) => {
    e.stopPropagation();
    try {
      setErrorMsg('');
      await projectService.removeStoryFromSprint(sprintId, storyId);
      setSuccessBanner('Story returned to Product Backlog.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadSprintData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove story from sprint.');
    }
  };

  // Categorize Sprints
  const planningSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');
  const cancelledSprints = sprints.filter(s => s.status === 'cancelled');

  // Multi-select live telemetry
  const assigningSprintCurrentPoints = assigningSprint ? (allStories.filter(st => st.sprint === assigningSprint.id).reduce((acc, st) => acc + (st.story_points || 0), 0)) : 0;
  const selectedStoriesPoints = backlogStories.filter(st => selectedStoryIds.includes(st.id)).reduce((acc, st) => acc + (st.story_points || 0), 0);
  const totalPointsWithSelected = assigningSprintCurrentPoints + selectedStoriesPoints;
  const sprintCapacity = assigningSprint?.capacity || 20;
  const remainingCapacityWithSelected = sprintCapacity - totalPointsWithSelected;
  const isOverCapacity = totalPointsWithSelected > sprintCapacity;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading sprints...</p>
        </div>
      </div>
    );
  }

  if (!project && !loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 480, margin: '60px auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a', fontWeight: 600 }}>Project Not Found</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>This project does not exist or was removed during cleanup.</p>
        <Link href="/projects" className="btn-white-text" style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'inline-block' }}>
          Back to Projects List
        </Link>
      </div>
    );
  }

  const activeOrCompletedSprint = activeSprint || sprints.find(s => s.status === 'completed') || (sprints.length > 0 ? sprints[0] : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── 1. GLOBAL SCRUM HEADER ── */}
      <GlobalScrumHeader
        location="Project > Sprints"
        title="Sprints"
        icon={SprintIcon}
        badge={sprints.length}
        purpose="A Sprint is a fixed 1-4 week timebox where the team commits to complete a prioritized subset of User Stories."
        whoUsesThis="Scrum Master • Project Manager • Team Lead • Development Team"
        primaryGoal="Plan, start, and manage timeboxed Scrum iterations to deliver working software."
        nextStep="Activate the planned Sprint and track daily story execution on the Scrum Board."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
        actionButtons={userCapabilities.canManage && (
          <button
            type="button"
            onClick={openCreateSprintModal}
            className="btn-primary"
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36 }}
          >
            <PlusIcon size={13} color="#fff" /> + Create Sprint
          </button>
        )}
      />

      {/* ── 2. LEARNING HELP PANEL ── */}
      {learningMode && (
        <ScrumHelpPanel
          title="Sprint Management & Lifecycle Guide"
          tipTitle="What is Sprint Capacity & Goal?"
          tipDescription="Sprint Capacity is the maximum Story Points the team can finish in a sprint based on historical velocity. The Sprint Goal defines the single core objective for the iteration."
          example="Goal: Implement Checkout & Cart Customization (Capacity: 35 Story Points)"
          whyAmIDoingThis="Timeboxing work into sprints creates focus, predictable team velocity, and rapid feedback loops with stakeholders."
          definitions={[
            { term: 'Sprint Goal', definition: 'High-level objective that met requirements achieved during the iteration.' },
            { term: 'Sprint Capacity', definition: 'Total estimated story points committed for the sprint duration.' },
            { term: 'Active Sprint', definition: 'Currently running iteration (only 1 sprint can be active at a time).' },
            { term: 'Burndown Chart', definition: 'Visual graph showing remaining story points day-by-day during sprint.' },
          ]}
        />
      )}

      {/* Retrospective Section if completed or active sprint exists */}
      {activeOrCompletedSprint && (
        <RetrospectiveBoard
          projectId={projectId}
          sprint={activeOrCompletedSprint}
          onStoryCreated={loadSprintData}
        />
      )}

      {successBanner && (
        <div style={{ padding: '10px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckIcon size={14} color="#166534" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningIcon size={14} color="#991b1b" />
            <span>{errorMsg}</span>
          </span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
            <CloseIcon size={14} color="#991b1b" />
          </button>
        </div>
      )}

      {/* 1. ACTIVE SPRINT SECTION */}
      {activeSprint && (
        <div style={{ background: '#ffffff', border: '2px solid #2563eb', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                  ACTIVE SPRINT
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{activeSprint.sprint_key || `SPR-${activeSprint.id}`}</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{activeSprint.name}</h2>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <strong>Goal:</strong> {activeSprint.goal || 'No goal set'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <Link
                href={`/projects/${projectId}/board`}
                className="btn-white-text"
                style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Open Scrum Board →
              </Link>
              {userCapabilities.canManage && (
                <>
                  <button
                    onClick={(e) => openCompleteSprintModal(activeSprint, e)}
                    style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
                  >
                    <CheckIcon size={14} color="#16a34a" /> Complete Sprint
                  </button>
                  <button
                    onClick={(e) => openCancelSprintModal(activeSprint, e)}
                    style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                  >
                    Cancel Sprint
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            <div><span style={{ color: '#64748b' }}>Duration:</span> <strong>{calculateDaysBetween(activeSprint.start_date, activeSprint.end_date) || 14} days</strong></div>
            <div><span style={{ color: '#64748b' }}>Dates:</span> <strong>{activeSprint.start_date} to {activeSprint.end_date}</strong></div>
            <div><span style={{ color: '#64748b' }}>Committed Points:</span> <strong style={{ color: '#2563eb' }}>{activeSprint.total_story_points || 0} pts</strong></div>
            <div><span style={{ color: '#64748b' }}>Capacity:</span> <strong>{activeSprint.capacity || 20} pts</strong></div>
          </div>
        </div>
      )}

      {/* 2. PLANNING SPRINTS SECTION */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Planning Sprints ({planningSprints.length})
            </h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>Sprints being planned before start.</span>
          </div>

          {userCapabilities.canManage && (
            <button
              onClick={openCreateSprintModal}
              style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 40 }}
            >
              + New Planning Sprint
            </button>
          )}
        </div>

        {planningSprints.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>
              No sprints currently in Planning. Create a Sprint to group backlog stories for upcoming iterations.
            </p>
            {userCapabilities.canManage && (
              <button
                onClick={openCreateSprintModal}
                className="btn-white-text"
                style={{ padding: '9px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                + Create Planning Sprint
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {planningSprints.map((sprint) => {
              const sprintStories = allStories.filter((st) => st.sprint === sprint.id);
              const currentPoints = sprintStories.reduce((acc, st) => acc + (st.story_points || 0), 0);
              const cap = sprint.capacity || 20;
              const remainingCap = Math.max(0, cap - currentPoints);
              const durationDays = calculateDaysBetween(sprint.start_date, sprint.end_date) || 14;
              const canStart = sprintStories.length > 0 && (!activeSprint || activeSprint.id === sprint.id);

              return (
                <div
                  key={sprint.id}
                  style={{
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Card Top */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                          {sprint.sprint_key || `SPR-${sprint.id}`}
                        </span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{sprint.name}</h3>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 12, flexShrink: 0 }}>
                          Planning
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        <strong>Goal:</strong> {sprint.goal || 'No goal set'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                      {userCapabilities.canManage && (
                        <>
                          <button
                            onClick={(e) => openAddStoriesModal(sprint, e)}
                            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                          >
                            + Add Stories ({backlogStories.length} available)
                          </button>

                          <button
                            disabled={!canStart}
                            onClick={(e) => handleStartSprint(sprint, e)}
                            className="btn-white-text"
                            style={{
                              padding: '8px 14px', borderRadius: 6, border: 'none',
                              background: canStart ? '#16a34a' : '#94a3b8',
                              color: '#fff', fontSize: 13, fontWeight: 600,
                              cursor: canStart ? 'pointer' : 'not-allowed',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44
                            }}
                            title={!canStart ? (sprintStories.length === 0 ? 'Add stories before starting' : `Sprint '${activeSprint?.name}' is active`) : 'Start Sprint'}
                          >
                            <RocketIcon size={14} /> Start Sprint
                          </button>

                          <button
                            onClick={(e) => openEditSprintModal(sprint, e)}
                            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 }}
                          >
                            <EditIcon size={13} /> Edit
                          </button>
                          <button
                            onClick={(e) => openCancelSprintModal(sprint, e)}
                            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontSize: 12, cursor: 'pointer', minHeight: 44 }}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {userCapabilities.canDelete && (
                        <button
                          onClick={(e) => openDeleteSprintModal(sprint, e)}
                          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 }}
                        >
                          <TrashIcon size={13} color="#dc2626" /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                    <div><span style={{ color: '#64748b' }}>Duration:</span> <strong>{durationDays} days</strong></div>
                    <div><span style={{ color: '#64748b' }}>Dates:</span> <strong>{sprint.start_date} to {sprint.end_date}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Capacity:</span> <strong>{cap} pts</strong></div>
                    <div><span style={{ color: '#64748b' }}>Assigned Points:</span> <strong style={{ color: currentPoints > cap ? '#dc2626' : '#2563eb' }}>{currentPoints} pts</strong></div>
                    <div><span style={{ color: '#64748b' }}>Remaining:</span> <strong style={{ color: '#166534' }}>{remainingCap} pts</strong></div>
                    <div><span style={{ color: '#64748b' }}>Story Count:</span> <strong>{sprintStories.length}</strong></div>
                  </div>

                  {/* Guided Empty Message or Story List */}
                  {sprintStories.length === 0 ? (
                    <div style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: 8, padding: 12, fontSize: 13, color: '#1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span>No Stories have been added yet. Add Stories from the Product Backlog before starting this Sprint.</span>
                      {userCapabilities.canManage && (
                        <button
                          onClick={(e) => openAddStoriesModal(sprint, e)}
                          className="btn-white-text"
                          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36 }}
                        >
                          + Add Stories
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sprintStories.map((st) => (
                        <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginRight: 8, flexShrink: 0 }}>{st.story_key || `ST-${st.id}`}</span>
                            <strong style={{ color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{st.title}</strong>
                            {st.epic_detail?.title && (
                              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, marginLeft: 8 }}>
                                {st.epic_detail.title}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{st.story_points || 0} pts</span>
                            {userCapabilities.canManage && (
                              <button
                                onClick={(e) => handleRemoveStoryFromSprint(sprint.id, st.id, e)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. HISTORICAL COMPLETED SPRINTS SECTION */}
      {completedSprints.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Completed Sprints ({completedSprints.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completedSprints.map((sprint) => (
              <div key={sprint.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 8, flexShrink: 0 }}>{sprint.sprint_key || `SPR-${sprint.id}`}</span>
                  <strong style={{ color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{sprint.name}</strong>
                  <span style={{ fontSize: 11, color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>Completed</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  <strong>{sprint.stories_count || 0}</strong> Stories ({sprint.completed_story_points || 0} pts finished)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
        {activeSprint && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Active Sprint Burndown</h3>
            {burndownData ? <BurndownChart data={burndownData} /> : <p style={{ fontSize: 13, color: '#64748b' }}>No telemetry data recorded.</p>}
          </div>
        )}

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Historical Velocity</h3>
          <VelocityChart data={velocityData} />
        </div>
      </div>

      {/* CREATE SPRINT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Create Planning Sprint</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                 {errorMsg && (
                   <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                     <WarningIcon size={14} color="#991b1b" />
                     <span>{errorMsg}</span>
                   </div>
                 )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Sprint Name *</label>
                  <input
                    type="text"
                    required
                    value={newSprint.name}
                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                    placeholder="e.g. Sprint 1"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Sprint Goal *</label>
                  <input
                    type="text"
                    required
                    value={newSprint.goal}
                    onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                    placeholder="e.g. Implement User Authentication and Dashboard"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={newSprint.start_date}
                      onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>End Date *</label>
                    <input
                      type="date"
                      required
                      value={newSprint.end_date}
                      onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                    />
                  </div>
                </div>

                {/* Duration Preview */}
                {newSprint.start_date && newSprint.end_date && (
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                    Calculated Sprint Duration: {calculateDaysBetween(newSprint.start_date, newSprint.end_date) || 0} days
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Sprint Capacity (Story Points) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSprint.capacity}
                    onChange={(e) => setNewSprint({ ...newSprint, capacity: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="btn-white-text"
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                >
                  {submittingCreate ? 'Creating...' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SPRINT MODAL */}
      {showEditModal && editingSprint && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Edit Sprint</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleEditSprint} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Sprint Name *</label>
                  <input type="text" required value={editSprintForm.name} onChange={(e) => setEditSprintForm({ ...editSprintForm, name: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Sprint Goal *</label>
                  <input type="text" required value={editSprintForm.goal} onChange={(e) => setEditSprintForm({ ...editSprintForm, goal: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>
                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Start Date *</label>
                    <input type="date" required value={editSprintForm.start_date} onChange={(e) => setEditSprintForm({ ...editSprintForm, start_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>End Date *</label>
                    <input type="date" required value={editSprintForm.end_date} onChange={(e) => setEditSprintForm({ ...editSprintForm, end_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Capacity (Story Points) *</label>
                  <input type="number" required min="1" value={editSprintForm.capacity} onChange={(e) => setEditSprintForm({ ...editSprintForm, capacity: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingEdit} className="btn-white-text" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingEdit ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-SELECT ADD STORIES TO SPRINT MODAL */}
      {assigningSprint && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Add Stories from Product Backlog</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Target Sprint: <strong>{assigningSprint.sprint_key || `SPR-${assigningSprint.id}`} - {assigningSprint.name}</strong></span>
              </div>
              <button onClick={() => setAssigningSprint(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Live Telemetry Summary Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(90px, 100%), 1fr))', gap: 8, fontSize: 12, textAlign: 'center' }}>
                <div><span style={{ color: '#64748b', display: 'block' }}>Selected</span><strong>{selectedStoryIds.length}</strong></div>
                <div><span style={{ color: '#64748b', display: 'block' }}>Points</span><strong style={{ color: '#2563eb' }}>{selectedStoriesPoints} pts</strong></div>
                <div><span style={{ color: '#64748b', display: 'block' }}>Capacity</span><strong>{sprintCapacity} pts</strong></div>
                <div><span style={{ color: '#64748b', display: 'block' }}>Remaining</span><strong style={{ color: remainingCapacityWithSelected < 0 ? '#dc2626' : '#166534' }}>{remainingCapacityWithSelected} pts</strong></div>
              </div>

              {/* Over Capacity Warning */}
              {isOverCapacity && (
                <div style={{ padding: '8px 12px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WarningIcon size={14} color="#c2410c" />
                  <span>Warning: Total selected Story Points ({totalPointsWithSelected} pts) exceed Sprint Capacity ({sprintCapacity} pts).</span>
                </div>
              )}

              {/* Stories List */}
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, maxHeight: 240 }}>
                {backlogStories.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No unassigned stories available in Product Backlog.
                  </div>
                ) : (
                  backlogStories.map((story) => {
                    const isChecked = selectedStoryIds.includes(story.id);
                    return (
                      <label
                        key={story.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                          padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                          background: isChecked ? '#eff6ff' : 'transparent', borderRadius: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedStoryIds(prev => prev.filter(id => id !== story.id));
                              } else {
                                setSelectedStoryIds(prev => [...prev, story.id]);
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{story.story_key || `ST-${story.id}`}</span>
                              <strong style={{ fontSize: 13, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{story.title}</strong>
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              Priority: {story.priority || 'Medium'} {story.epic_detail ? `· Epic: ${story.epic_detail.title}` : ''}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0', flexShrink: 0 }}>
                          {story.story_points || 0} pts
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setAssigningSprint(null)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedStoryIds.length === 0 || submittingAddStories}
                onClick={handleAddStoriesSubmit}
                className="btn-white-text"
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                {submittingAddStories ? 'Adding...' : `Add Selected (${selectedStoryIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE PLANNING SPRINT MODAL */}
      {deletingSprint && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Delete {deletingSprint.sprint_key || `SPR-${deletingSprint.id}`} - {deletingSprint.name}?
              </h3>
              <button onClick={() => setDeletingSprint(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>This permanently deletes the Planning Sprint.</p>
                <p style={{ margin: 0 }}>
                  All assigned Stories will return to the Product Backlog. Stories, Tasks, Comments, and Attachments will not be deleted.
                </p>
              </div>

              {modalErrorMsg && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WarningIcon size={14} color="#991b1b" />
                  <span>{modalErrorMsg}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setDeletingSprint(null)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                Keep Sprint
              </button>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={handleConfirmDeleteSprint}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                {submittingDelete ? 'Deleting...' : 'Delete Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CANCEL SPRINT MODAL */}
      {cancellingSprint && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Cancel Sprint: {cancellingSprint.sprint_key || `SPR-${cancellingSprint.id}`} - {cancellingSprint.name}
              </h3>
              <button onClick={() => setCancellingSprint(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleConfirmCancelSprint} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Sprint history and completed stories will be retained for historical reporting.
                </p>

                {modalErrorMsg && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <WarningIcon size={14} color="#991b1b" />
                    <span>{modalErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Cancellation Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cancelForm.reason}
                    onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                    placeholder="e.g. Scope changed, client priority shift, or emergency reallocation."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Incomplete Stories Destination
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="destination"
                        value="backlog"
                        checked={cancelForm.move_incomplete_to === 'backlog'}
                        onChange={() => setCancelForm({ ...cancelForm, move_incomplete_to: 'backlog' })}
                      />
                      Return incomplete stories to <strong>Product Backlog</strong>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="destination"
                        value="sprint"
                        checked={cancelForm.move_incomplete_to === 'sprint'}
                        onChange={() => setCancelForm({ ...cancelForm, move_incomplete_to: 'sprint' })}
                      />
                      Move incomplete stories to another <strong>Planning Sprint</strong>
                    </label>
                  </div>

                  {cancelForm.move_incomplete_to === 'sprint' && (
                    <div style={{ marginTop: 10 }}>
                      <select
                        required
                        value={cancelForm.target_sprint_id}
                        onChange={(e) => setCancelForm({ ...cancelForm, target_sprint_id: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                      >
                        <option value="">-- Select Target Planning Sprint --</option>
                        {planningSprints.filter(s => s.id !== cancellingSprint.id).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.sprint_key || `SPR-${s.id}`} - {s.name} ({s.capacity || 20} pts capacity)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setCancellingSprint(null)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                >
                  Keep Sprint
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                >
                  {submittingCancel ? 'Cancelling...' : 'Cancel Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM COMPLETE SPRINT MODAL */}
      {completingSprint && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Complete Sprint: {completingSprint.sprint_key || `SPR-${completingSprint.id}`} - {completingSprint.name}
              </h3>
              <button onClick={() => setCompletingSprint(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCompleteSprintSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Completing this iteration will finalize story execution. Select where incomplete stories should be moved.
                </p>

                {modalErrorMsg && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <WarningIcon size={14} color="#991b1b" />
                    <span>{modalErrorMsg}</span>
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Incomplete Stories Destination
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="complete_destination"
                        value="backlog"
                        checked={incompleteDestination === 'backlog'}
                        onChange={() => setIncompleteDestination('backlog')}
                      />
                      Move incomplete stories to <strong>Product Backlog</strong>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="complete_destination"
                        value="next_sprint"
                        checked={incompleteDestination === 'next_sprint'}
                        onChange={() => setIncompleteDestination('next_sprint')}
                      />
                      Move incomplete stories to another <strong>Planning Sprint</strong>
                    </label>
                  </div>

                  {incompleteDestination === 'next_sprint' && (
                    <div style={{ marginTop: 10 }}>
                      <select
                        value={targetPlanningSprintId}
                        onChange={(e) => setTargetPlanningSprintId(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                      >
                        <option value="">-- Select Target Planning Sprint --</option>
                        {planningSprints.filter(s => s.id !== completingSprint.id).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.sprint_key || `SPR-${s.id}`} - {s.name} ({s.capacity || 20} pts capacity)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setCompletingSprint(null)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCompleteSprint}
                  className="btn-white-text"
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
                >
                  {submittingCompleteSprint ? 'Completing...' : 'Complete Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
