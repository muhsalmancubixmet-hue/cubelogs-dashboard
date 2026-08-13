'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

// --------------------------------------------------------------------------------
// 1. Hook for persistent Learning Mode state
// --------------------------------------------------------------------------------
export function useLearningMode() {
  const [learningMode, setLearningMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cubelogs_learning_mode');
    if (saved !== null) {
      setLearningMode(saved === 'true');
    }
  }, []);

  const toggleLearningMode = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !learningMode;
    setLearningMode(nextVal);
    localStorage.setItem('cubelogs_learning_mode', String(nextVal));
  };

  return { learningMode, setLearningMode: toggleLearningMode };
}

// --------------------------------------------------------------------------------
// 2. Learning Mode Toggle Button Component
// --------------------------------------------------------------------------------
export function LearningModeToggle({ learningMode, onToggle }) {
  return (
    <div
      onClick={() => onToggle(!learningMode)}
      role="button"
      tabIndex={0}
      title="Toggle interactive Scrum learning guides and workflow tips"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '5px 12px 5px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        border: learningMode ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
        background: learningMode ? '#eff6ff' : '#f8fafc',
        color: learningMode ? '#1e3a8a' : '#475569',
        boxShadow: learningMode ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
        transition: 'all 0.25s ease',
        userSelect: 'none'
      }}
    >
      <span>Learning Mode</span>
      
      {/* Smooth Swipe Switch Knob */}
      <div style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: learningMode ? '#2563eb' : '#cbd5e1',
        position: 'relative',
        transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px'
      }}>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
          transform: learningMode ? 'translateX(16px)' : 'translateX(0px)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. Scrum Lifecycle Workflow Bar
// --------------------------------------------------------------------------------
export const SCRUM_LIFECYCLE_STEPS = [
  { id: 'setup', name: 'Project Setup', route: '' },
  { id: 'backlog', name: 'Backlog', route: '/backlog' },
  { id: 'sprints', name: 'Sprint Planning', route: '/sprints' },
  { id: 'active_sprint', name: 'Active Sprint', route: '/sprints' },
  { id: 'board', name: 'Board', route: '/board' },
  { id: 'testing', name: 'Testing', route: '/board' },
  { id: 'retro', name: 'Retrospective', route: '/sprints' },
  { id: 'completed', name: 'Completed', route: '/sprints' },
];

export function ScrumWorkflowBar() {
  return null;
}

// --------------------------------------------------------------------------------
// 4. Global Page Header Component (Answers 5 Core Questions)
// --------------------------------------------------------------------------------
export function GlobalScrumHeader({
  location = "Project > Backlog",
  title = "Product Backlog",
  icon: IconComponent = null,
  badge = null,
  purpose = "The Product Backlog contains every feature that will be built in this project.",
  whoUsesThis = "Project Manager • Product Owner • Team Lead",
  primaryGoal = "Organize upcoming work before Sprint Planning.",
  nextStep = "Move prioritized stories into a Sprint.",
  learningMode = true,
  onToggleLearningMode = null,
  actionButton = null,
  actionButtons = null
}) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: '20px 24px',
      marginBottom: 20,
      boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)'
    }}>
      {/* Top Location & Learning Toggle Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
          <MapPin size={13} color="#2563eb" />
          <span style={{ color: '#475569', fontWeight: 600 }}>{location}</span>
        </div>

        {onToggleLearningMode && (
          <LearningModeToggle learningMode={learningMode} onToggle={onToggleLearningMode} />
        )}
      </div>

      {/* Main Title & Action Button Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {IconComponent && (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0
            }}>
              <IconComponent size={18} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', flexShrink: 0 }}>
            <h1 style={{
              fontSize: 19,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              wordBreak: 'keep-all',
              flexShrink: 0
            }}>
              {title}
            </h1>
            {badge !== null && badge !== undefined && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid #bfdbfe',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {badge}
              </span>
            )}
          </div>
        </div>

        {(actionButtons || actionButton) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {actionButtons || actionButton}
          </div>
        )}
      </div>

      {/* Purpose paragraph - only when learningMode is active */}
      {learningMode && purpose && (
        <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0', fontWeight: 500, borderLeft: '3px solid #2563eb', paddingLeft: 10 }}>
          {purpose}
        </p>
      )}

      {/* Educational 4-Question Cards (Shown when Learning Mode is ON) */}
      {learningMode && purpose && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
              Why does this exist?
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
              {purpose}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
              Primary Goal
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
              {primaryGoal}
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 2 }}>
              Next Step
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
              {nextStep}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
              Primary Roles
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
              {whoUsesThis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 5. Collapsible Right Side Scrum Help Panel
// --------------------------------------------------------------------------------
export function ScrumHelpPanel({
  title = "Scrum Helper & Workflow Guide",
  tipTitle = "What is an Epic?",
  tipDescription = "An Epic is a large feature that will later be divided into smaller Stories.",
  example = "Epic: Payments → Stories: UPI Payment, Credit Card, Wallet",
  whyAmIDoingThis = "Organizing features into Epics ensures clear project scope and modular sprint delivery.",
  definitions = [],
  isOpenDefault = true
}) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
      marginBottom: 20
    }}>
      {/* Panel Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: '#eff6ff',
          border: 'none',
          borderBottom: isOpen ? '1px solid #bfdbfe' : 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{title}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
          {isOpen ? '▲ Collapse Guide' : '▼ Expand Guide'}
        </span>
      </button>

      {/* Panel Body */}
      {isOpen && (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Today's Scrum Tip */}
          <div style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '12px 14px', borderRadius: '0 8px 8px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 }}>
              Today's Tip: {tipTitle}
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 8 }}>
              {tipDescription}
            </div>
            {example && (
              <div style={{ fontSize: 12, background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: 6, color: '#475569', fontWeight: 600 }}>
                <strong>Real Example (Food Delivery App):</strong><br />
                <span style={{ color: '#0f172a' }}>{example}</span>
              </div>
            )}
          </div>

          {/* Why Am I Doing This */}
          {whyAmIDoingThis && (
            <div style={{ fontSize: 12, color: '#475569', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 8 }}>
              <strong style={{ color: '#166534' }}>Why am I doing this?</strong><br />
              <span style={{ color: '#15803d' }}>{whyAmIDoingThis}</span>
            </div>
          )}

          {/* Key Definitions List */}
          {definitions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Key Glossary & Definitions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {definitions.map((def, idx) => (
                  <div key={idx} style={{ fontSize: 12, background: '#fafafa', border: '1px solid #f1f5f9', padding: '8px 10px', borderRadius: 6 }}>
                    <strong style={{ color: '#2563eb' }}>{def.term}: </strong>
                    <span style={{ color: '#475569' }}>{def.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 6. Section Explanation Banner Component
// --------------------------------------------------------------------------------
export function ScrumSectionBanner({
  title = "User Stories",
  description = "Stories describe user requirements in plain business language.",
  example = '"As a customer, I want to login using OTP so I can access my account."',
  actionButton = null
}) {
  return (
    <div style={{
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 16
    }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1e40af' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#1e3a8a' }}>
          {description}
        </p>
        {example && (
          <div style={{ fontSize: 12, color: '#3b82f6', fontStyle: 'italic', fontWeight: 600 }}>
            Example: {example}
          </div>
        )}
      </div>

      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 7. Scrum Educational Empty State Component
// --------------------------------------------------------------------------------
export function ScrumEmptyState({
  icon = null,
  title = "No Stories Yet",
  description = "Stories describe features users need. Start by creating your first Story.",
  example = 'Example: "As a user, I want to search restaurants by cuisine so I can find food fast."',
  actionText = "Create Story",
  onAction = null
}) {
  return (
    <div style={{
      background: '#ffffff',
      border: '2px dashed #cbd5e1',
      borderRadius: 14,
      padding: '40px 24px',
      textAlign: 'center',
      margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#64748b', maxWidth: 480, margin: '0 auto 12px', lineHeight: 1.5 }}>
        {description}
      </p>

      {example && (
        <div style={{
          fontSize: 12,
          background: '#eff6ff',
          color: '#1e40af',
          border: '1px solid #bfdbfe',
          padding: '8px 14px',
          borderRadius: 8,
          maxWidth: 460,
          margin: '0 auto 20px',
          fontWeight: 600
        }}>
          <strong>Example:</strong> {example}
        </div>
      )}

      {onAction && (
        <button
          onClick={onAction}
          type="button"
          style={{
            padding: '10px 22px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
          }}
        >
          + {actionText}
        </button>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 8. Board Column Header Guide Component
// --------------------------------------------------------------------------------
export function BoardColumnGuide({ statusName, code }) {
  const columnGuides = {
    pending: { title: "To Do", desc: "Work items prioritized for this Sprint but not yet started by developers." },
    in_progress: { title: "In Progress", desc: "Items currently being actively coded and implemented." },
    review: { title: "Review", desc: "Code complete. Awaiting peer code review and pull request approval." },
    testing: { title: "Testing", desc: "Deployed to staging. QA team is running verification and acceptance tests." },
    completed: { title: "Done", desc: "Verified, tested, and ready/released to production." },
  };

  const guide = columnGuides[code] || { title: statusName, desc: "Status column in Scrum workflow." };

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '6px 10px',
      marginBottom: 10,
      fontSize: 11,
      color: '#475569',
      lineHeight: 1.3
    }}>
      <strong style={{ color: '#0f172a' }}>{guide.title}:</strong> {guide.desc}
    </div>
  );
}
