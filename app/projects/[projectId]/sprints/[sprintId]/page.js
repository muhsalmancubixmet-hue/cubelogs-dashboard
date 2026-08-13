'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { projectService } from '../../../../../lib/services/projectService';
import BurndownChart from '../../../../../components/scrum/BurndownChart';
import { TiptapReadOnly } from '../../../../../components/rich-text';

export default function SprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { projectId, sprintId } = params || {};

  const [sprint, setSprint] = useState(null);
  const [stories, setStories] = useState([]);
  const [burndownData, setBurndownData] = useState(null);
  const [planningSprints, setPlanningSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Complete Sprint Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [incompleteDestination, setIncompleteDestination] = useState('backlog'); // 'backlog' or sprintId
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const loadSprintDetail = useCallback(async () => {
    if (!sprintId || !projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');

      const [spList, stData] = await Promise.all([
        projectService.getSprints(projectId),
        projectService.getProjectStories(projectId),
      ]);

      const list = Array.isArray(spList) ? spList : (spList?.results || []);
      const current = list.find((s) => String(s.id) === String(sprintId));
      setSprint(current || null);

      const pSprints = list.filter((s) => s.status === 'planning' && String(s.id) !== String(sprintId));
      setPlanningSprints(pSprints);

      const allSt = Array.isArray(stData) ? stData : (stData?.results || []);
      const sprintSt = allSt.filter((s) => String(s.sprint) === String(sprintId));
      setStories(sprintSt);

      if (current?.id) {
        try {
          const bData = await projectService.getBurndownData(current.id);
          setBurndownData(bData);
        } catch (err) {
          console.error('Error fetching burndown:', err);
        }
      }
    } catch (err) {
      console.error('Error loading sprint detail:', err);
      setErrorMsg('Failed to load sprint detail.');
    } finally {
      setLoading(false);
    }
  }, [sprintId, projectId]);

  useEffect(() => { loadSprintDetail(); }, [loadSprintDetail]);

  const handleStartSprint = async () => {
    if (stories.length === 0) return alert('Cannot start sprint with 0 stories. Add stories first.');
    try {
      setErrorMsg('');
      await projectService.startSprint(sprintId);
      loadSprintDetail();
    } catch (err) {
      alert(err.message || 'Failed to start sprint.');
    }
  };

  const handleCompleteSprintSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingComplete(true);
      setErrorMsg('');
      const targetSprint = incompleteDestination === 'backlog' ? null : Number(incompleteDestination);
      await projectService.completeSprint(sprintId, targetSprint);
      setShowCompleteModal(false);
      loadSprintDetail();
    } catch (err) {
      alert(err.message || 'Failed to complete sprint.');
    } finally {
      setSubmittingComplete(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading sprint details...</div>;
  if (!sprint) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Sprint not found.</div>;

  const totalPoints = stories.reduce((acc, st) => acc + (st.story_points || 0), 0);
  const completedStories = stories.filter((st) => st.status_detail?.category === 'completed');
  const completedPoints = completedStories.reduce((acc, st) => acc + (st.story_points || 0), 0);
  const remainingPoints = totalPoints - completedPoints;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link href="/projects" style={{ color: '#2563eb', textDecoration: 'none' }}>Projects</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} style={{ color: '#2563eb', textDecoration: 'none' }}>Overview</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/sprints`} style={{ color: '#2563eb', textDecoration: 'none' }}>Sprints</Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{sprint.name}</span>
      </div>

      {/* Main Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)', fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {sprint.name}
              </h1>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 12,
                background: sprint.status === 'active' ? '#dcfce7' : sprint.status === 'completed' ? '#f3e8ff' : '#e0f2fe',
                color: sprint.status === 'active' ? '#166534' : sprint.status === 'completed' ? '#6b21a8' : '#075985',
                flexShrink: 0
              }}>
                {sprint.status}
              </span>
            </div>
            {sprint.goal && (
              <div style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>Goal:</strong>
                <TiptapReadOnly content={sprint.goal} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            {sprint.status === 'planning' && (
              <button
                onClick={handleStartSprint}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🚀 Start Sprint
              </button>
            )}

            {sprint.status === 'active' && (
              <>
                <Link
                  href={`/projects/${projectId}/board`}
                  style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  📋 Open Scrum Board
                </Link>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✓ Complete Sprint
                </button>
              </>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Capacity</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{sprint.capacity || 0} pts</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Scope</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginTop: 2 }}>{totalPoints} pts</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Completed</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#166534', marginTop: 2 }}>{completedPoints} pts</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c2410c', marginTop: 2 }}>{remainingPoints} pts</div>
          </div>
        </div>
      </div>

      {/* Sprint Stories List */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          Sprint Stories ({stories.length})
        </h3>
        {stories.length === 0 ? (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No stories in this sprint.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stories.map((st) => (
              <div
                key={st.id}
                onClick={() => router.push(`/projects/${projectId}/stories/${st.id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                  padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginRight: 8, flexShrink: 0 }}>
                    {st.story_key || `ST-${st.id}`}
                  </span>
                  <strong style={{ color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{st.title}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{st.story_points || 0} pts</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                    {st.status_detail?.name || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Burndown Chart */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          Burndown Telemetry
        </h3>
        {burndownData ? <BurndownChart data={burndownData} /> : <p style={{ fontSize: 13, color: '#64748b' }}>No burndown telemetry for this sprint yet.</p>}
      </div>

      {/* Complete Sprint Modal */}
      {showCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Complete Sprint '{sprint.name}'</h3>
              <button onClick={() => setShowCompleteModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>

            <form onSubmit={handleCompleteSprintSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Select where to move incomplete stories ({stories.length - completedStories.length} pending):
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dest"
                      value="backlog"
                      checked={incompleteDestination === 'backlog'}
                      onChange={() => setIncompleteDestination('backlog')}
                    />
                    Return to Product Backlog
                  </label>

                  {planningSprints.map((sp) => (
                    <label key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dest"
                        value={sp.id}
                        checked={String(incompleteDestination) === String(sp.id)}
                        onChange={() => setIncompleteDestination(sp.id)}
                      />
                      Move to '{sp.name}' (Planning)
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCompleteModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingComplete} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingComplete ? 'Completing...' : 'Complete Sprint'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
