'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { projectService } from '../../../../lib/services/projectService';
import { BoardIcon, SprintIcon, CheckIcon, CloseIcon, WarningIcon } from '../../../../components/Icons';
import {
  useLearningMode,
  GlobalScrumHeader,
  ScrumHelpPanel,
} from '../../../../components/scrum/ScrumLearningComponents';

export default function ScrumBoardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const { learningMode, setLearningMode } = useLearningMode();

  const [boardData, setBoardData] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [boardView, setBoardView] = useState('tasks'); // 'tasks' or 'stories'
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchBoard = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const [data, statusList] = await Promise.all([
        projectService.getBoardData(projectId, selectedSprintId || null),
        projectService.getProjectStatuses(),
      ]);
      setBoardData(data);
      const normStatuses = Array.isArray(statusList) ? statusList : (statusList?.results || []);
      setStatuses(normStatuses);
    } catch (err) {
      console.error('Error fetching board data:', err);
      setErrorMsg('Failed to load Scrum board.');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSprintId]);

  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await projectService.getSprints(projectId);
      setSprints(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error('Error fetching sprints:', err);
    }
  }, [projectId]);

  useEffect(() => { fetchSprints(); }, [fetchSprints]);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Handle Task status transition
  const handleTaskStatusChange = async (taskId, newStatusId) => {
    try {
      setErrorMsg('');
      await projectService.updateProjectTaskStatus(taskId, newStatusId);
      setSuccessBanner('Task status updated.');
      setTimeout(() => setSuccessBanner(''), 3000);
      fetchBoard();
    } catch (err) {
      console.error('Failed to update task status:', err);
      setErrorMsg(err.message || 'Failed to update task status.');
      fetchBoard();
    }
  };

  // Handle Story status move (Story-Based Board)
  const handleStoryStatusChange = async (storyId, newStatusId, currentStatusId) => {
    if (newStatusId === currentStatusId) return;
    const prevBoardData = JSON.parse(JSON.stringify(boardData));

    setBoardData((prev) => {
      if (!prev) return prev;
      let movedStory = null;
      const newColumns = (prev.columns || []).map((col) => {
        const remainingStories = (col.stories || []).filter((s) => {
          if (s.id === storyId) {
            movedStory = { ...s, status: newStatusId };
            return false;
          }
          return true;
        });
        return { ...col, stories: remainingStories };
      });

      if (movedStory) {
        return {
          ...prev,
          columns: newColumns.map((col) => {
            if (col.status.id === newStatusId) {
              return { ...col, stories: [...(col.stories || []), movedStory] };
            }
            return col;
          }),
        };
      }
      return prev;
    });

    try {
      await projectService.updateStory(storyId, { status: newStatusId });
      setSuccessBanner('Story status updated.');
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (err) {
      console.error('Server side validation failed, reverting UI state:', err);
      setErrorMsg('Failed to update story status. Transition reverted.');
      setBoardData(prevBoardData);
    }
  };

  if (!boardData && !loading) {
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

  const activeSprint = boardData?.active_sprint ?? sprints.find((s) => s.status === 'active') ?? null;
  const boardStatuses = statuses.length > 0 ? statuses : (boardData?.columns?.map(c => c.status) || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. GLOBAL SCRUM HEADER */}
      <GlobalScrumHeader
        location="Project > Board"
        title="Board"
        icon={BoardIcon}
        badge={activeSprint?.name || 'Product Backlog'}
        purpose="The Scrum Board shows work currently being developed in the active sprint."
        whoUsesThis="Developers • QA Engineers • Team Lead • Scrum Master"
        primaryGoal="Track story and task status movements in real-time from To Do to Done."
        nextStep="Complete QA testing and finish the active Sprint."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
      />

      {/* 2. LEARNING HELP PANEL */}
      {learningMode && (
        <ScrumHelpPanel
          title="Scrum Board Workflow & Rules Guide"
          tipTitle="How do cards move on the Board?"
          tipDescription="Work cards progress left-to-right through distinct stages: To Do → In Progress → Review → Testing → Done. Developers update statuses daily."
          example="Alex moves FDA-0005 'Add items to cart' from In Progress to Review → Emily tests in Testing → Mark Done"
          whyAmIDoingThis="The board provides full real-time transparency into who is working on what and identifies bottlenecks early."
          definitions={[
            { term: 'To Do', definition: 'Work planned for active sprint, ready for developer pick up.' },
            { term: 'In Progress', definition: 'Currently under active coding or design development.' },
            { term: 'Review / Testing', definition: 'Peer code review and QA testing on staging environment.' },
            { term: 'Done', definition: 'Fully tested, approved, and ready for deployment.' },
          ]}
        />
      )}

      {/* Board Guidance Banner */}
      {!activeSprint ? (
        <div style={{
          background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 10, padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#c2410c' }}>
              No Active Sprint
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#9a3412', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              No Active Sprint currently running.
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#ea580c', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              Go to Sprint Planning to assign stories from the Backlog and start a sprint.
            </p>
          </div>

          <Link
            href={`/projects/${projectId}/sprints`}
            className="btn-white-text"
            style={{
              padding: '9px 16px', borderRadius: 8, border: 'none', background: '#ea580c',
              color: '#ffffff', fontWeight: 600, fontSize: 13, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            Go to Sprint Planning →
          </Link>
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SprintIcon size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#15803d' }}>
                Active Sprint Scrum Board
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#166534', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {activeSprint.name} {activeSprint.goal ? `— ${activeSprint.goal}` : ''}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
              Timeline: {activeSprint.start_date} to {activeSprint.end_date}
            </span>
            <Link
              href={`/projects/${projectId}/sprints`}
              style={{ fontSize: 12, fontWeight: 600, color: '#15803d', textDecoration: 'underline' }}
            >
              Sprint Details →
            </Link>
          </div>
        </div>
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
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
            <CloseIcon size={14} color="#991b1b" />
          </button>
        </div>
      )}

      {/* Board Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', fontWeight: 700, color: '#0f172a' }}>
            Scrum Board
          </h2>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {boardData?.active_sprint
              ? `Current Sprint: ${boardData.active_sprint.name}`
              : 'Product Backlog Cards'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: '1 1 300px', width: 'auto' }}>
          {/* Board View Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, border: '1px solid #cbd5e1', flex: '1 1 200px' }}>
            <button
              onClick={() => setBoardView('tasks')}
              className={boardView === 'tasks' ? 'btn-white-text' : ''}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 1, minHeight: 36,
                background: boardView === 'tasks' ? '#2563eb' : 'transparent',
                color: boardView === 'tasks' ? '#ffffff' : '#475569',
              }}
            >
              <span style={{ color: boardView === 'tasks' ? '#ffffff' : '#475569', fontWeight: 700 }}>Task Card Board</span>
            </button>
            <button
              onClick={() => setBoardView('stories')}
              className={boardView === 'stories' ? 'btn-white-text' : ''}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 1, minHeight: 36,
                background: boardView === 'stories' ? '#2563eb' : 'transparent',
                color: boardView === 'stories' ? '#ffffff' : '#475569',
              }}
            >
              <span style={{ color: boardView === 'stories' ? '#ffffff' : '#475569', fontWeight: 700 }}>Story Cards Board</span>
            </button>
          </div>

          {sprints.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px' }}>
              <label style={{ fontSize: 13, color: '#475569', fontWeight: 600, flexShrink: 0 }}>Sprint:</label>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', width: '100%', minHeight: 36, boxSizing: 'border-box' }}
              >
                <option value="">Default (Active Sprint)</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Scrum Board...</div>
      ) : boardView === 'tasks' ? (
        /* TASK-BASED SCRUM BOARD (STORY ROW LEFT + TASK STATUS COLUMNS RIGHT) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(!boardData?.story_groups || boardData.story_groups.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#334155' }}>No Stories in Active Sprint</h3>
              <p style={{ margin: '8px 0 16px', color: '#64748b', fontSize: 13 }}>
                Assign backlog user stories to the active sprint to view task breakdown swimlanes.
              </p>
              <Link href={`/projects/${projectId}/sprints`} style={{ color: '#2563eb', fontWeight: 600, fontSize: 13 }}>
                + Add Stories from Sprint Planning →
              </Link>
            </div>
          ) : (
            boardData.story_groups.map((group) => (
              <div
                key={group.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 16,
                  alignItems: 'start'
                }}
              >
                {/* STORY COLUMN (LEFT SIDE COMPACT CARD) */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 160
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                        {group.story_key || `ST-${group.id}`}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '2px 8px', borderRadius: 6 }}>
                        {group.story_points || 0} pts
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.35, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {group.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                      Tasks: {(group.tasks || []).length}
                    </span>
                    <Link href={`/projects/${projectId}/stories/${group.id}`} style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                      Open Story →
                    </Link>
                  </div>
                </div>

                {/* TASK STATUS COLUMNS (RIGHT SIDE GRID) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${boardStatuses.length || 1}, minmax(210px, 1fr))`,
                  gap: 12,
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: 4
                }}>
                  {boardStatuses.map((statusObj) => {
                    const colTasks = (group.tasks || []).filter((t) => {
                      const tStatusId = typeof t.status === 'object' ? t.status?.id : t.status;
                      const tStatusDetailId = t.status_detail?.id;
                      const tStatusName = (t.status_detail?.name || t.status_name || '').toString().toLowerCase();
                      const colStatusName = (statusObj.name || '').toString().toLowerCase();

                      return (
                        Number(tStatusId) === Number(statusObj.id) ||
                        Number(tStatusDetailId) === Number(statusObj.id) ||
                        (tStatusName && colStatusName && tStatusName === colStatusName)
                      );
                    });

                    return (
                      <div
                        key={statusObj.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const rawData = e.dataTransfer.getData('text/plain');
                            if (!rawData) return;
                            const data = JSON.parse(rawData);
                            if (data && data.taskId && Number(data.storyId) === Number(group.id)) {
                              if (Number(data.currentStatusId) !== Number(statusObj.id)) {
                                handleTaskStatusChange(data.taskId, statusObj.id);
                              }
                            }
                          } catch (err) {
                            console.error('Error handling task drag drop:', err);
                          }
                        }}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 160
                        }}
                      >
                        {/* Status Column Header */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: 8, paddingBottom: 6,
                          borderBottom: `2px solid ${statusObj.color || '#3b82f6'}`
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            {statusObj.name}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: 10 }}>
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Column Tasks List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                          {colTasks.length === 0 ? (
                            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '20px 0', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                              Drop task here
                            </div>
                          ) : (
                            colTasks.map((task) => {
                              const totalSub = task.subtasks?.length || 0;
                              const completedSub = task.subtasks?.filter((s) => s.is_completed).length || 0;
                              const subPct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                              const currentTaskStatusId = typeof task.status === 'object' ? (task.status?.id || task.status_detail?.id) : (task.status_detail?.id || task.status);

                              return (
                                <div
                                  key={task.id}
                                  draggable="true"
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                      taskId: task.id,
                                      storyId: group.id,
                                      currentStatusId: currentTaskStatusId
                                    }));
                                  }}
                                  onClick={() => router.push(`/projects/${projectId}/stories/${group.id}/tasks/${task.id}`)}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    cursor: 'grab',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{task.task_key}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>
                                      {task.priority || 'Medium'}
                                    </span>
                                  </div>
                                  <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                    {task.title}
                                  </h5>

                                  {totalSub > 0 && (
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                                        <span>Subtasks: {completedSub}/{totalSub}</span>
                                        <span>{subPct}%</span>
                                      </div>
                                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ width: `${subPct}%`, height: '100%', background: subPct === 100 ? '#16a34a' : '#2563eb' }} />
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                                        {task.assigned_to_photo ? (
                                          <img src={task.assigned_to_photo} alt={task.assigned_to_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          (task.assigned_to_name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                        )}
                                      </span>
                                      <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{task.assigned_to_name || 'Unassigned'}</span>
                                    </span>
                                    <select
                                      value={currentTaskStatusId || ''}
                                      onChange={(e) => handleTaskStatusChange(task.id, Number(e.target.value))}
                                      style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, minHeight: 28 }}
                                    >
                                      {boardStatuses.map((st) => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* STORY-BASED SCRUM BOARD (COLUMNS WITH TOUCH HORIZONTAL SCROLL) */
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${boardData?.columns?.length || 1}, minmax(min(280px, 100%), 1fr))`,
          gap: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 16
        }}>
          {boardData?.columns?.map((column) => (
            <div
              key={column.status.id}
              style={{
                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14,
                display: 'flex', flexDirection: 'column', minHeight: 400,
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
                borderBottom: `3px solid ${column.status.color || '#3b82f6'}`, paddingBottom: 8
              }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{column.status.name}</h3>
                <span style={{ fontSize: 12, fontWeight: 700, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: 12 }}>
                  {column.stories?.length || 0}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {!column.stories || column.stories.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                    Empty Column
                  </div>
                ) : (
                  column.stories.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => router.push(`/projects/${projectId}/stories/${story.id}`)}
                      style={{
                        background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{story.story_key || `ST-${story.id}`}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 8 }}>{story.story_points || 0} pts</span>
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{story.title}</h4>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={story.status || ''}
                          onChange={(e) => handleStoryStatusChange(story.id, Number(e.target.value), story.status)}
                          style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', minHeight: 36, width: '100%' }}
                        >
                          {boardData.columns.map((col) => (
                            <option key={col.status.id} value={col.status.id}>{col.status.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
