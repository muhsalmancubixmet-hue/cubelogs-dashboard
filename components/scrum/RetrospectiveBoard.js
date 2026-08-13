'use client';

import React, { useState, useEffect } from 'react';
import { projectService } from '../../lib/services/projectService';
import { TiptapEditor, TiptapReadOnly } from '../rich-text';
import {
  RotateCcw,
  CheckCircle2,
  Circle,
  ThumbsUp,
  CheckCheck,
  Zap,
  Lightbulb,
  AlertTriangle,
  PartyPopper,
  Meh,
  Frown,
  Smile,
  SmilePlus,
  Rocket,
} from 'lucide-react';

export default function RetrospectiveBoard({ projectId, sprint, onStoryCreated }) {
  const [retro, setRetro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [happiness, setHappiness] = useState(3.5);

  // New Item State per category
  const [newItemText, setNewItemText] = useState({ went_well: '', didnt_go_well: '', action_item: '', lesson_learned: '' });
  const [submittingCat, setSubmittingCat] = useState('');

  const loadRetro = async (pId, sprintId) => {
    if (!pId || !sprintId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await projectService.getRetrospectives(pId, sprintId);
      const retroList = Array.isArray(data) ? data : (data?.results || []);
      let activeRetro = retroList.length > 0 ? retroList[0] : null;

      if (!activeRetro) {
        // Auto initialize
        activeRetro = await projectService.createRetrospective({
          project: pId,
          sprint: sprintId,
          happiness_score: 3.5,
        });
      }

      setRetro(activeRetro);
      if (activeRetro) setHappiness(activeRetro.happiness_score || 3.5);
    } catch (err) {
      console.error('Error loading retrospective:', err);
      setErrorMsg('Failed to load retrospective board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetro(projectId, sprint?.id);
  }, [projectId, sprint?.id]);

  const handleAddItem = async (category) => {
    const text = (newItemText[category] || '').trim();
    if (!text || !retro?.id) return;

    try {
      setSubmittingCat(category);
      await projectService.addRetroItem(retro.id, { category, text });
      setNewItemText(prev => ({ ...prev, [category]: '' }));
      loadRetro();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item.');
    } finally {
      setSubmittingCat('');
    }
  };

  const handleVote = async (itemId) => {
    try {
      await projectService.voteRetroItem(itemId);
      loadRetro();
    } catch (err) {
      console.error('Error voting item:', err);
    }
  };

  const handleConvertToStory = async (itemId) => {
    try {
      const story = await projectService.convertRetroItemToStory(itemId);
      setSuccessBanner(`Converted to Backlog Story: ${story.title}`);
      setTimeout(() => setSuccessBanner(''), 4000);
      loadRetro();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      console.error('Error converting to story:', err);
      alert('Failed to convert action item to story.');
    }
  };

  const handleCloseRetro = async () => {
    if (!retro?.id) return;
    try {
      await projectService.closeRetrospective(retro.id);
      setSuccessBanner('Retrospective completed & closed.');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadRetro();
    } catch (err) {
      console.error('Error closing retrospective:', err);
      alert('Failed to close retrospective.');
    }
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading Retrospective Board...</div>;
  }

  const items = retro?.items || [];
  const categorized = {
    went_well: items.filter(i => i.category === 'went_well'),
    didnt_go_well: items.filter(i => i.category === 'didnt_go_well'),
    action_item: items.filter(i => i.category === 'action_item'),
    lesson_learned: items.filter(i => i.category === 'lesson_learned'),
  };

  const categories = [
    {
      key: 'went_well',
      title: 'Went Well',
      Icon: PartyPopper,
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    },
    {
      key: 'didnt_go_well',
      title: "Didn't Go Well",
      Icon: AlertTriangle,
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
    },
    {
      key: 'action_item',
      title: 'Action Items',
      Icon: Zap,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      key: 'lesson_learned',
      title: 'Lessons Learned',
      Icon: Lightbulb,
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
    },
  ];

  const happinessOptions = [
    { score: 1.0, Icon: Frown,    label: 'Poor' },
    { score: 2.0, Icon: Meh,      label: 'Fair' },
    { score: 3.5, Icon: Smile,    label: 'Good' },
    { score: 4.5, Icon: SmilePlus,label: 'Great' },
    { score: 5.0, Icon: Rocket,   label: 'Excellent' },
  ];

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <RotateCcw size={16} color="#6366f1" strokeWidth={2} />
            <h3 style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.1rem)', fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              Sprint Retrospective
            </h3>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: retro?.status === 'completed' ? '#dcfce7' : '#dbeafe',
              color: retro?.status === 'completed' ? '#166534' : '#1e40af',
              flexShrink: 0
            }}>
              {retro?.status === 'completed'
                ? <><CheckCircle2 size={11} /> Completed</>
                : <><Circle size={11} /> Active</>
              }
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
            {sprint?.name}
          </p>
        </div>

        {/* Happiness + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Team Mood</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {happinessOptions.map(h => {
                const active = happiness === h.score;
                return (
                  <button
                    key={h.score}
                    onClick={() => setHappiness(h.score)}
                    type="button"
                    title={h.label}
                    style={{
                      border: active ? '1.5px solid #6366f1' : '1.5px solid transparent',
                      background: active ? '#ede9fe' : 'transparent',
                      borderRadius: 6,
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 30,
                      minHeight: 30,
                      opacity: active ? 1 : 0.45,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <h.Icon size={15} color={active ? '#6366f1' : '#475569'} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </div>

          {retro?.status !== 'completed' && (
            <button
              onClick={handleCloseRetro}
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', background: '#16a34a', color: '#ffffff',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', minHeight: 36, whiteSpace: 'nowrap'
              }}
            >
              <CheckCheck size={13} strokeWidth={2.5} />
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', background: '#dcfce7', color: '#166534',
          borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500
        }}>
          <CheckCircle2 size={14} color="#16a34a" />
          {successBanner}
        </div>
      )}

      {errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', background: '#fef2f2', color: '#991b1b',
          borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500
        }}>
          <AlertTriangle size={14} color="#dc2626" />
          {errorMsg}
        </div>
      )}

      {/* 4 Category Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 14 }}>
        {categories.map(cat => {
          const CatIcon = cat.Icon;
          return (
            <div key={cat.key} style={{ background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Category Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: cat.color }}>
                  <CatIcon size={14} strokeWidth={2.5} color={cat.color} />
                  {cat.title}
                </div>
                <span style={{
                  padding: '2px 7px', borderRadius: 10,
                  background: '#ffffff', fontSize: 11, fontWeight: 700,
                  color: cat.color, border: `1px solid ${cat.border}`
                }}>
                  {categorized[cat.key].length}
                </span>
              </div>

              {/* Input Box */}
              {retro?.status !== 'completed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <TiptapEditor
                    preset="compact"
                    minHeight={80}
                    value={newItemText[cat.key]}
                    onChange={val => setNewItemText({ ...newItemText, [cat.key]: val })}
                    placeholder={`Add feedback...`}
                    projectId={projectId}
                  />
                  <button
                    onClick={() => handleAddItem(cat.key)}
                    disabled={submittingCat === cat.key || !newItemText[cat.key].trim()}
                    type="button"
                    style={{
                      alignSelf: 'flex-end', padding: '5px 12px',
                      background: cat.color, color: '#ffffff',
                      border: 'none', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: newItemText[cat.key].trim() ? 1 : 0.5,
                      minHeight: 32
                    }}
                  >
                    + Add
                  </button>
                </div>
              )}

              {/* Item Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {categorized[cat.key].map(item => (
                  <div key={item.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <TiptapReadOnly content={item.text} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: '1px dashed #f1f5f9', paddingTop: 6 }}>
                      <button
                        onClick={() => handleVote(item.id)}
                        disabled={item.votes >= 5}
                        type="button"
                        title={item.votes >= 5 ? 'Maximum 5 votes reached' : 'Upvote'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          border: '1px solid #cbd5e1',
                          background: item.votes >= 5 ? '#f1f5f9' : '#f8fafc',
                          borderRadius: 20, padding: '4px 10px',
                          fontSize: 11, fontWeight: 600,
                          color: item.votes >= 5 ? '#94a3b8' : '#475569',
                          cursor: item.votes >= 5 ? 'not-allowed' : 'pointer',
                          minHeight: 28,
                        }}
                      >
                        <ThumbsUp size={11} strokeWidth={2} />
                        {item.votes} / 5
                      </button>

                      {cat.key === 'action_item' && (
                        item.converted_story ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                            <CheckCircle2 size={11} color="#16a34a" /> Converted
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertToStory(item.id)}
                            type="button"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 9px', background: '#eff6ff',
                              color: '#2563eb', border: '1px solid #bfdbfe',
                              borderRadius: 6, fontSize: 11, fontWeight: 600,
                              cursor: 'pointer', minHeight: 28
                            }}
                            title="Convert to Backlog Story"
                          >
                            <Zap size={11} strokeWidth={2.5} />
                            Convert to Story
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}

                {categorized[cat.key].length === 0 && (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '14px 0' }}>
                    No items yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
