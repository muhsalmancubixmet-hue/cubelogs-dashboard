'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export const SCRUM_STEPS = [
  { id: 1, title: 'Project Created', link: '/projects', desc: 'Initialize project parameters & default workflow statuses.' },
  { id: 2, title: 'Add Project Members', link: 'team', desc: 'Invite engineers, PMs, and team leads to your project workspace.' },
  { id: 3, title: 'Define Project Goals', link: 'settings', desc: 'Establish project scope, target dates, and key business outcomes.' },
  { id: 4, title: 'Create Product Backlog', link: 'backlog', desc: 'Central repository of all planned product requirements.' },
  { id: 5, title: 'Create Epics', link: 'epics', desc: 'Group related features into high-level strategic Epics.' },
  { id: 6, title: 'Create User Stories', link: 'stories', desc: 'Break Epics down into user-centric functional Stories.' },
  { id: 7, title: 'Estimate Story Points', link: 'stories', desc: 'Assign Fibonacci complexity points (1, 2, 3, 5, 8, 13, 21).' },
  { id: 8, title: 'Prioritize Backlog', link: 'backlog', desc: 'Order stories by urgency, ROI, and technical dependencies.' },
  { id: 9, title: 'Create Sprint', link: 'sprints', desc: 'Set up timeboxed iteration (e.g. 2-week Sprint).' },
  { id: 10, title: 'Move Stories into Sprint', link: 'sprints', desc: 'Commit estimated stories into the planned Sprint Backlog.' },
  { id: 11, title: 'Start Sprint', link: 'sprints', desc: 'Formally activate sprint and start execution.' },
  { id: 12, title: 'Daily Stand-up & Board', link: 'board', desc: 'Track progress daily via Scrum Board and Stand-up check-ins.' },
  { id: 13, title: 'Sprint Review & Retrospective', link: 'sprints', desc: 'Review sprint deliverables, inspect performance, and capture action items.' },
];

export default function ScrumGuidedWorkflow({ projectId, currentStepId = 1, progressPercentage = 0, onToggleLearnMode }) {
  const [learnMode, setLearnMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('scrum_learn_mode');
    if (saved !== null) {
      setLearnMode(saved === 'true');
    }
  }, []);

  const handleToggle = () => {
    const next = !learnMode;
    setLearnMode(next);
    localStorage.setItem('scrum_learn_mode', String(next));
    if (onToggleLearnMode) onToggleLearnMode(next);
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)', marginBottom: 24 }}>
      {/* Header & Learn Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            🚀
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Guided Scrum Workflow</h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Standard Agile Execution Lifecycle</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Progress: <strong style={{ color: '#2563eb' }}>{progressPercentage}%</strong>
          </span>
          <button
            onClick={handleToggle}
            type="button"
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: learnMode ? '1px solid #3b82f6' : '1px solid #cbd5e1',
              background: learnMode ? '#eff6ff' : '#f8fafc',
              color: learnMode ? '#1d4ed8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease'
            }}
          >
            <span>{learnMode ? '📖 Learn Scrum: ON' : '🎓 Learn Scrum: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {/* Workflow Steps Horizontal Carousel / Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {SCRUM_STEPS.map((step) => {
          const isDone = step.id < currentStepId || progressPercentage === 100;
          const isCurrent = step.id === currentStepId && progressPercentage < 100;
          const targetUrl = step.link.startsWith('/') ? step.link : `/projects/${projectId}/${step.link}`;

          return (
            <Link
              key={step.id}
              href={targetUrl}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '10px 12px',
                borderRadius: 8,
                border: isCurrent ? '1.5px solid #3b82f6' : (isDone ? '1px solid #bbf7d0' : '1px solid #f1f5f9'),
                background: isCurrent ? '#eff6ff' : (isDone ? '#f0fdf4' : '#fafafa'),
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#1d4ed8' : (isDone ? '#166534' : '#94a3b8') }}>
                  STEP {step.id}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#2563eb' : (isDone ? '#16a34a' : '#cbd5e1') }}>
                  {isDone ? '✓' : (isCurrent ? '→ Active' : '•')}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? '#1e40af' : (isDone ? '#15803d' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
