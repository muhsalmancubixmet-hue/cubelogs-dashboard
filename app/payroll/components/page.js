'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { apiFetch } from '@/lib/api/apiClient';
import { SearchIcon, PlusIcon, EditIcon, CloseIcon, CheckIcon } from '@/components/Icons';

const COMPONENT_TYPES = ['Earning', 'Deduction'];

function SalaryComponentsContent() {
  const { currentUser, hasPermission } = useApp();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add, object = edit
  const [form, setForm] = useState({ name: '', code: '', component_type: 'Earning', is_proratable: true, is_taxable: true, description: '' });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManage = currentUser?.isSuperAdmin || hasPermission('salary:manage');

  const fetchComponents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/payroll/components/');
      setComponents(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load salary components.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComponents(); }, []);

  const filtered = useMemo(() => {
    let list = components;
    if (typeFilter !== 'ALL') list = list.filter(c => c.component_type === typeFilter);
    const q = searchQuery.toLowerCase().trim();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q));
    return list;
  }, [components, searchQuery, typeFilter]);

  const earnings = filtered.filter(c => c.component_type === 'Earning');
  const deductions = filtered.filter(c => c.component_type === 'Deduction');

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ name: '', code: '', component_type: 'Earning', is_proratable: true, is_taxable: true, description: '' });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (comp) => {
    setEditTarget(comp);
    setForm({
      name: comp.name,
      code: comp.code || '',
      component_type: comp.component_type,
      is_proratable: comp.is_proratable,
      is_taxable: comp.is_taxable,
      description: comp.description || '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setModalError('Component name is required.'); return; }
    setSubmitting(true);
    setModalError('');
    try {
      if (editTarget) {
        await apiFetch(`/payroll/components/${editTarget.id}/`, { method: 'PATCH', body: JSON.stringify(form) });
        setSuccessMsg(`"${form.name}" updated.`);
      } else {
        await apiFetch('/payroll/components/', { method: 'POST', body: JSON.stringify(form) });
        setSuccessMsg(`"${form.name}" created.`);
      }
      setShowModal(false);
      fetchComponents();
    } catch (err) {
      setModalError(err.message || 'Failed to save component.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (comp) => {
    try {
      await apiFetch(`/payroll/components/${comp.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !comp.is_active }),
      });
      setSuccessMsg(`"${comp.name}" ${comp.is_active ? 'deactivated' : 'activated'}.`);
      fetchComponents();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update component status.');
    }
  };

  const renderTable = (rows, label) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          background: label === 'Earning' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: label === 'Earning' ? 'var(--success)' : 'var(--danger)',
        }}>
          {label}s ({rows.length})
        </span>
      </div>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Code', 'Proratable', 'Taxable', 'Status', ...(canManage ? ['Actions'] : [])].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No {label.toLowerCase()} components found.
                  </td>
                </tr>
              ) : rows.map((comp, idx) => (
                <tr key={comp.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-elevated)', opacity: comp.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{comp.name}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-light)' }}>{comp.code || '—'}</td>
                  <td style={{ padding: '10px 16px', color: comp.is_proratable ? 'var(--success)' : 'var(--text-light)' }}>
                    {comp.is_proratable ? '✓ Yes' : 'No'}
                  </td>
                  <td style={{ padding: '10px 16px', color: comp.is_taxable ? 'var(--warning)' : 'var(--text-light)' }}>
                    {comp.is_taxable ? '✓ Yes' : 'No'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                      background: comp.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                      color: comp.is_active ? 'var(--success)' : 'var(--text-light)',
                    }}>
                      {comp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.76rem', padding: '3px 10px' }}
                          onClick={() => openEditModal(comp)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${comp.is_active ? 'btn-danger' : 'btn-success'}`}
                          style={{ fontSize: '0.76rem', padding: '3px 10px' }}
                          onClick={() => handleToggleActive(comp)}
                        >
                          {comp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Salary Components</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Manage earning and deduction components used in employee salary structures.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex' }}>
              <SearchIcon size={15} />
            </span>
            <input
              id="components-search"
              type="text"
              placeholder="Search components…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', width: '100%' }}
              className="form-control"
            />
          </div>
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="form-control"
            style={{ minWidth: '130px' }}
          >
            <option value="ALL">All Types</option>
            <option value="Earning">Earnings</option>
            <option value="Deduction">Deductions</option>
          </select>
          {canManage && (
            <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <PlusIcon size={16} /> Add Component
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="panel alert-box alert-box-danger" style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.88rem' }}>{errorMsg}</div>}
      {successMsg && <div className="panel alert-box alert-box-success" style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.88rem' }}>{successMsg}<button onClick={() => setSuccessMsg('')} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}>✕</button></div>}

      {loading ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Loading components…
          </div>
        </div>
      ) : (
        <>
          {(typeFilter === 'ALL' || typeFilter === 'Earning') && renderTable(earnings, 'Earning')}
          {(typeFilter === 'ALL' || typeFilter === 'Deduction') && renderTable(deductions, 'Deduction')}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{editTarget ? 'Edit Component' : 'Add Salary Component'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex' }}>
                <CloseIcon size={20} />
              </button>
            </div>
            {modalError && <div className="alert-box alert-box-danger" style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '8px', fontSize: '0.85rem' }}>{modalError}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Component Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Basic Salary" required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Component Code</label>
                <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. BASIC" />
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-light)' }}>
                  Internal short code used to identify this salary component. Example: BASIC, HRA, PF.
                </p>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Type *</label>
                <select className="form-control" value={form.component_type} onChange={e => setForm(f => ({ ...f, component_type: e.target.value }))}>
                  {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--surface-elevated, #f8fafc)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.is_proratable} onChange={e => setForm(f => ({ ...f, is_proratable: e.target.checked }))} />
                    Reduce for unpaid absence (Proratable)
                  </label>
                  <p style={{ margin: '2px 0 0 24px', fontSize: '0.76rem', color: 'var(--text-light)' }}>
                    When enabled, this earning is reduced if the employee has unpaid absence or unpaid leave.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.is_taxable} onChange={e => setForm(f => ({ ...f, is_taxable: e.target.checked }))} />
                    Taxable
                  </label>
                  <p style={{ margin: '2px 0 0 24px', fontSize: '0.76rem', color: 'var(--text-light)' }}>
                    Marks this component as taxable for future statutory payroll calculations.
                  </p>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : (editTarget ? 'Save Changes' : 'Add Component')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalaryComponentsPage() {
  return (
    <PageWrapper
      title="Salary Components"
      requiredPermission={['salary:view', 'salary:manage']}
    >
      <SalaryComponentsContent />
    </PageWrapper>
  );
}
