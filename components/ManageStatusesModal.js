'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { projectService } from '../lib/services/projectService';
import ConfirmModal from './ConfirmModal';

const CATEGORY_STYLES = {
  pending:   { bg: '#e0f2fe', color: '#075985' },
  active:    { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#f3e8ff', color: '#6b21a8' },
};

const autoCode = (name) => name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export default function ManageStatusesModal({ isOpen, onClose, onStatusesUpdated }) {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deletion confirm modal state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state for creating/editing
  const [editingId, setEditingId] = useState(null);
  const [statusForm, setStatusForm] = useState({
    name: '',
    code: '',
    scope: 'all',
    order: 0,
    progress_percentage: 0,
  });

  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjectStatuses();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setStatuses(list);
      if (onStatusesUpdated) onStatusesUpdated(list);
    } catch (err) {
      console.error('Error fetching statuses in modal:', err);
    } finally {
      setLoading(false);
    }
  }, [onStatusesUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
      resetForm();
    }
  }, [isOpen, fetchStatuses]);

  const resetForm = () => {
    setEditingId(null);
    setStatusForm({ name: '', code: '', scope: 'all', order: 0, progress_percentage: 0 });
    setErrorMsg('');
  };

  const handleEditClick = (status) => {
    setEditingId(status.id);
    setStatusForm({
      name: status.name,
      code: status.code,
      scope: status.scope,
      order: status.order || 0,
      progress_percentage: status.progress_percentage ?? (status.category === 'completed' ? 100 : status.category === 'active' ? 50 : 0),
    });
    setErrorMsg('');
  };

  const deriveCategory = (pct) => {
    const p = Number(pct) || 0;
    if (p <= 0) return 'pending';
    if (p >= 100) return 'completed';
    return 'active';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!statusForm.name.trim() || !statusForm.code.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      const pct = Math.min(100, Math.max(0, Number(statusForm.progress_percentage) || 0));
      const derivedCategory = deriveCategory(pct);

      const payload = {
        ...statusForm,
        category: derivedCategory,
        progress_percentage: pct
      };

      if (editingId) {
        await projectService.updateProjectStatus(editingId, payload);
      } else {
        await projectService.createProjectStatus(payload);
      }

      resetForm();
      fetchStatuses();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      setErrorMsg('');
      await projectService.deleteProjectStatus(deleteId);
      if (editingId === deleteId) resetForm();
      setDeleteId(null);
      fetchStatuses();
    } catch (err) {
      setErrorMsg(err.message || 'Cannot delete this status option. It may be in use.');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content modal-wide" style={{ maxWidth: '680px', width: '95%', margin: '16px auto', padding: '24px 20px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Manage Project & Task Statuses</h3>
          <button className="modal-close" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <p className="modal-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '6px 0 16px', lineHeight: 1.4 }}>
          Define reusable status labels for projects, sections, and tasks. System statuses (🔒) cannot be renamed or deleted.
        </p>

        {/* Existing Statuses List */}
        <div className="status-list" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Loading statuses...</div>}
          {!loading && statuses.map(s => {
            const catStyle = CATEGORY_STYLES[s.category] || { bg: '#f1f5f9', color: '#475569' };
            const isEditingThis = editingId === s.id;
            const pct = s.progress_percentage ?? (s.category === 'completed' ? 100 : s.category === 'active' ? 50 : 0);
            return (
              <div
                key={s.id}
                className="sm-status-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: isEditingThis ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  background: isEditingThis ? '#eff6ff' : '#ffffff',
                  fontSize: '0.875rem',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: catStyle.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</span>
                  <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {s.code}
                  </span>
                  <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                    Scope: {s.scope}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                    {pct}%
                  </span>
                </div>
                <div className="sm-status-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: catStyle.bg, color: catStyle.color }}>
                    {s.category}
                  </span>
                  {s.is_system ? (
                    <span title="System status — protected" style={{ opacity: 0.7, padding: '0 4px' }}>🔒</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEditClick(s)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                      >
                        ✏ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => setDeleteId(s.id)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer' }}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && statuses.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No status options defined yet.</p>
          )}
        </div>

        {/* Add / Edit Form */}
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              {editingId ? 'Edit Status Option' : 'Add Custom Status Option'}
            </h4>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Cancel Edit
              </button>
            )}
          </div>

          <div className="sm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. In QA Review"
                value={statusForm.name}
                onChange={(e) => setStatusForm({
                  ...statusForm,
                  name: e.target.value,
                  code: editingId ? statusForm.code : autoCode(e.target.value)
                })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Slug Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. in_qa_review"
                value={statusForm.code}
                onChange={(e) => setStatusForm({ ...statusForm, code: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div className="sm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Progress Percentage *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  placeholder="0-100"
                  value={statusForm.progress_percentage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setStatusForm({
                      ...statusForm,
                      progress_percentage: isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
                    });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>%</span>
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Applicable Scope *</label>
              <select
                value={statusForm.scope}
                onChange={(e) => setStatusForm({ ...statusForm, scope: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="all">All (Projects, Sections, Tasks)</option>
                <option value="project">Project Only</option>
                <option value="story">Section/Story Only</option>
                <option value="task">Task Only</option>
              </select>
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
              Done
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {submitting ? 'Saving...' : (editingId ? 'Update Status' : 'Add Status')}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for status deletion */}
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Status Option"
        message="Are you sure you want to delete this status option? It cannot be deleted if in use by active projects or tasks."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Status'}
        danger={true}
        isLoading={isDeleting}
        onCancel={() => { if (!isDeleting) setDeleteId(null); }}
        onConfirm={handleDeleteConfirm}
      />

      <style jsx>{`
        @media (max-width: 576px) {
          .sm-form-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .sm-status-item {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .sm-status-actions {
            width: 100% !important;
            justify-content: flex-end !important;
          }
        }
      `}</style>
    </div>
  );
}

