'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ContextualScrumGuide({
  pageTitle,
  whyText,
  whenText,
  nextText,
  nextLink,
  nextLinkText,
  learnTips = [],
  checklist = []
}) {
  const [learnMode, setLearnMode] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('scrum_learn_mode');
    if (saved !== null) {
      setLearnMode(saved === 'true');
    }
  }, []);

  const toggleCheck = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
      {/* Top Banner Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Scrum Context Guide
            </span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{pageTitle}</h4>
          </div>
        </div>
      </div>

      {/* 3 Core Guidance Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: checklist.length > 0 ? 14 : 0 }}>
        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>💡</span> Why this page exists
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{whyText}</p>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⏰</span> When to use it
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{whenText}</p>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span> What should happen next
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4, marginBottom: nextLink ? 8 : 0 }}>{nextText}</p>
          {nextLink && (
            <Link href={nextLink} style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {nextLinkText || 'Proceed to Next Step'} →
            </Link>
          )}
        </div>
      </div>

      {/* Guided Checklist (If provided) */}
      {checklist.length > 0 && (
        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋</span> Page Workflow Checklist
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {checklist.map((item, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: checkedItems[idx] ? '#94a3b8' : '#334155', cursor: 'pointer', textDecoration: checkedItems[idx] ? 'line-through' : 'none' }}>
                <input
                  type="checkbox"
                  checked={!!checkedItems[idx]}
                  onChange={() => toggleCheck(idx)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Learn Scrum Extra Educational Mode Tips */}
      {learnMode && learnTips.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📖</span> Learn Scrum Knowledge Tip
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
            {learnTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
