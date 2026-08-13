'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { projectService } from '../../../../lib/services/projectService';
import {
  StoryIcon,
  EpicIcon,
  SprintIcon,
  TasksIcon,
  SearchIcon,
  WarningIcon,
  ClockIcon,
  CloseIcon,
} from '../../../../components/Icons';
import { GlobalScrumHeader, useLearningMode } from '../../../../components/scrum/ScrumLearningComponents';

const STATUS_COLORS = {
  'To Do': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'In Progress': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'In Review': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'Testing': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  'Done': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Blocked': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
};

const PRIORITY_COLORS = {
  Low: { bg: '#f0fdf4', text: '#16a34a' },
  Medium: { bg: '#fefce8', text: '#ca8a04' },
  High: { bg: '#fff7ed', text: '#ea580c' },
  Critical: { bg: '#fef2f2', text: '#dc2626' },
  Urgent: { bg: '#fef2f2', text: '#dc2626' },
};

function StatusBadge({ name }) {
  const c = STATUS_COLORS[name] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {name || 'No Status'}
    </span>
  );
}

function PriorityBadge({ name }) {
  const c = PRIORITY_COLORS[name] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
    }}>
      {name || '—'}
    </span>
  );
}

export default function ProjectStoriesPage() {
  const params = useParams();
  const projectId = params?.projectId;
  const { learningMode, setLearningMode } = useLearningMode();

  const [stories, setStories] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [epicFilter, setEpicFilter] = useState('ALL');
  const [sprintFilter, setSprintFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_at_desc');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const [stData, eData, sData, stOptions] = await Promise.all([
        projectService.getProjectStories(projectId).catch(() => []),
        projectService.getEpics(projectId).catch(() => []),
        projectService.getSprints(projectId).catch(() => []),
        projectService.getProjectStatuses().catch(() => []),
      ]);
      setStories(Array.isArray(stData) ? stData : (stData?.results || []));
      setEpics(Array.isArray(eData) ? eData : (eData?.results || []));
      setSprints(Array.isArray(sData) ? sData : (sData?.results || []));
      setStatuses(Array.isArray(stOptions) ? stOptions : (stOptions?.results || []));
    } catch (err) {
      setErrorMsg('Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = [...stories];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.story_key?.toLowerCase().includes(q) ||
        s.epic_detail?.title?.toLowerCase().includes(q)
      );
    }
    if (epicFilter !== 'ALL') {
      list = list.filter(s => String(s.epic) === epicFilter || (epicFilter === 'NONE' && !s.epic));
    }
    if (sprintFilter !== 'ALL') {
      list = list.filter(s => String(s.sprint) === sprintFilter || (sprintFilter === 'NONE' && !s.sprint));
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(s => s.status_detail?.name === statusFilter || String(s.status) === statusFilter);
    }
    if (priorityFilter !== 'ALL') {
      list = list.filter(s => s.priority === priorityFilter);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc': return (a.title || '').localeCompare(b.title || '');
        case 'title_desc': return (b.title || '').localeCompare(a.title || '');
        case 'points_asc': return (a.story_points || 0) - (b.story_points || 0);
        case 'points_desc': return (b.story_points || 0) - (a.story_points || 0);
        case 'created_at_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'created_at_desc':
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return list;
  }, [stories, search, epicFilter, sprintFilter, statusFilter, priorityFilter, sortBy]);

  const uniqueStatuses = useMemo(() => {
    const seen = new Set();
    return stories
      .map(s => s.status_detail?.name)
      .filter(n => n && !seen.has(n) && seen.add(n));
  }, [stories]);

  const selectStyle = {
    padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
    fontSize: 13, background: '#ffffff', color: '#0f172a', minHeight: 36, cursor: 'pointer',
  };
  const inputStyle = {
    ...selectStyle,
    flex: 1, minWidth: 200, outline: 'none', paddingLeft: 36,
  };

  if (!loading && errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
        <p style={{ color: '#991b1b', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <WarningIcon size={14} color="#991b1b" />
          <span>{errorMsg}</span>
        </p>
        <button onClick={loadData} style={{ marginTop: 12, padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <GlobalScrumHeader
        location="Project > Stories"
        title="Stories"
        icon={StoryIcon}
        badge={loading ? null : stories.length}
        purpose="User Stories represent functional requirements or user-facing features to be completed."
        whoUsesThis="Product Owner • Project Manager • Developers • QA"
        primaryGoal="View, track, and filter all User Stories created for this project."
        nextStep="Click on any Story to view its tasks, details, and discussion."
        learningMode={learningMode}
        onToggleLearningMode={setLearningMode}
        actionButtons={(
          <Link
            href={`/projects/${projectId}/backlog`}
            className="btn-primary"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff',
              fontWeight: 600, fontSize: 13, textDecoration: 'none', minHeight: 36,
            }}
          >
            + Create Story (Backlog)
          </Link>
        )}
      />

      {/* Filters Bar */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center'
          }}>
            <SearchIcon size={14} color="#94a3b8" />
          </span>
          <input
            type="text"
            placeholder="Search stories by title, key, epic…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Epic Filter */}
        <select value={epicFilter} onChange={e => setEpicFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Epics</option>
          <option value="NONE">No Epic</option>
          {epics.map(ep => <option key={ep.id} value={String(ep.id)}>{ep.title}</option>)}
        </select>

        {/* Sprint Filter */}
        <select value={sprintFilter} onChange={e => setSprintFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Sprints</option>
          <option value="NONE">Backlog (No Sprint)</option>
          {sprints.map(sp => <option key={sp.id} value={String(sp.id)}>{sp.name} ({sp.status})</option>)}
        </select>

        {/* Status Filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Statuses</option>
          {uniqueStatuses.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Priority Filter */}
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Priorities</option>
          {['Low', 'Medium', 'High', 'Critical', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="title_asc">Title A–Z</option>
          <option value="title_desc">Title Z–A</option>
          <option value="points_desc">Points (High)</option>
          <option value="points_asc">Points (Low)</option>
        </select>

        {/* Clear Filters */}
        {(search || epicFilter !== 'ALL' || sprintFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setEpicFilter('ALL'); setSprintFilter('ALL'); setStatusFilter('ALL'); setPriorityFilter('ALL'); }}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #fecaca',
              background: '#fff1f2', color: '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer', minHeight: 36,
              display: 'inline-flex', alignItems: 'center', gap: 4
            }}
          >
            <CloseIcon size={12} color="#dc2626" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Stories List */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          Loading stories…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center', background: '#ffffff',
          borderRadius: 14, border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', margin: '0 auto 12px' }}>
            <StoryIcon size={32} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
            {stories.length === 0 ? 'No Stories Yet' : 'No Stories Match Filters'}
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
            {stories.length === 0
              ? 'Create your first user story from the Backlog.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {stories.length === 0 && (
            <Link href={`/projects/${projectId}/backlog`} style={{
              padding: '9px 18px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff',
              borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 40
            }}>
              Go to Backlog →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 130px 140px 100px 80px 120px',
            gap: 12, padding: '12px 18px',
            background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Key</span>
            <span>Title</span>
            <span>Status</span>
            <span>Epic</span>
            <span>Sprint</span>
            <span>Points</span>
            <span>Priority</span>
          </div>

          {/* Story Rows */}
          {filtered.map((story, idx) => {
            const statusName = story.status_detail?.name || 'To Do';
            const epicTitle = story.epic_detail?.title || (story.epic ? `Epic #${story.epic}` : '—');
            const sprintName = story.sprint_detail?.name || (story.sprint ? `Sprint #${story.sprint}` : 'Backlog');
            const taskCount = story.tasks?.length || 0;
            const isLast = idx === filtered.length - 1;

            return (
              <Link
                key={story.id}
                href={`/projects/${projectId}/stories/${story.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 130px 140px 100px 80px 120px',
                  gap: 12, padding: '14px 18px',
                  borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                  textDecoration: 'none',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Story Key */}
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#2563eb',
                  background: '#eff6ff', padding: '2px 8px', borderRadius: 4,
                  border: '1px solid #bfdbfe', display: 'inline-block', whiteSpace: 'nowrap',
                }}>
                  {story.story_key || `ST-${story.id}`}
                </span>

                {/* Title + task count */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: '#0f172a',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {story.title}
                  </div>
                  {taskCount > 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {taskCount} task{taskCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div><StatusBadge name={statusName} /></div>

                {/* Epic */}
                <div style={{
                  fontSize: 12, color: '#7c3aed', fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {story.epic ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <EpicIcon size={12} color="#7c3aed" />
                      {epicTitle}
                    </span>
                  ) : '—'}
                </div>

                {/* Sprint */}
                <div style={{
                  fontSize: 12, color: story.sprint ? '#15803d' : '#94a3b8',
                  fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {story.sprint ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <SprintIcon size={12} color="#15803d" />
                      {sprintName}
                    </span>
                  ) : 'Backlog'}
                </div>

                {/* Points */}
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#475569',
                  textAlign: 'center',
                }}>
                  {story.story_points ?? 0} <span style={{ fontSize: 10, fontWeight: 400 }}>pts</span>
                </span>

                {/* Priority */}
                <div><PriorityBadge name={story.priority} /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
