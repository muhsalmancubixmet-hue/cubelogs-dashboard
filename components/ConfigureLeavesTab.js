'use client';

import React, { useState, useEffect } from 'react';
import { 
  EditIcon, 
  DeleteIcon, 
  CheckIcon, 
  WarningIcon, 
  CloseIcon 
} from '@/components/Icons';
import ConfirmModal from '@/components/ConfirmModal';
import { apiFetch, normalizeListResponse } from '@/lib/api';

export default function ConfigureLeavesTab() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaveTypes = async () => {
    try {
      const data = await apiFetch('/leave-types/');
      const list = normalizeListResponse(data);
      setLeaveTypes(list.map(lt => ({ ...lt, id: String(lt.id) })));
    } catch (e) {
      console.error('Error fetching leave types:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const saveLeaveType = async (leaveType) => {
    try {
      let saved;
      if (leaveType.id) {
        saved = await apiFetch(`/leave-types/${leaveType.id}/`, {
          method: 'PUT',
          body: JSON.stringify(leaveType),
        });
        setLeaveTypes(prev => prev.map(lt => lt.id === leaveType.id ? { ...saved, id: String(saved.id) } : lt));
      } else {
        saved = await apiFetch('/leave-types/', {
          method: 'POST',
          body: JSON.stringify(leaveType),
        });
        setLeaveTypes(prev => [...prev, { ...saved, id: String(saved.id) }]);
      }
    } catch (e) {
      console.error('Error saving leave type:', e);
      setErrorMsg(e.message || 'Error occurred while saving leave type.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const deleteLeaveType = async (id) => {
    try {
      await apiFetch(`/leave-types/${id}/`, { method: 'DELETE' });
      setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
    } catch (e) {
      console.error('Error deleting leave type:', e);
      setErrorMsg(e.message || 'Error occurred while deleting leave type.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minAdvanceDays, setMinAdvanceDays] = useState(0);
  const [limitPeriod, setLimitPeriod] = useState('Yearly'); // 'Monthly' or 'Yearly'
  const [maxLimit, setMaxLimit] = useState(12);
  const [carryForward, setCarryForward] = useState(false);
  const [maxCarryForward, setMaxCarryForward] = useState(0);
  const [isPaid, setIsPaid] = useState(true);
  const [status, setStatus] = useState('Active');

  // Restricted dates states
  const [restrictedDates, setRestrictedDates] = useState([]);
  const [newRestrictedDate, setNewRestrictedDate] = useState('');
  const [newRestrictedReason, setNewRestrictedReason] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, name: '' });

  // Synchronize edit fields when editing changes
  useEffect(() => {
    if (editingType) {
      setName(editingType.name || '');
      setDescription(editingType.description || '');
      setMinAdvanceDays(editingType.minAdvanceDays || 0);
      setLimitPeriod(editingType.limitPeriod || 'Yearly');
      setMaxLimit(editingType.maxLimit !== undefined && editingType.maxLimit !== null ? editingType.maxLimit : 12);
      setCarryForward(!!editingType.carryForward);
      setMaxCarryForward(editingType.maxCarryForward || 0);
      setIsPaid(editingType.is_paid !== undefined ? !!editingType.is_paid : true);
      setStatus(editingType.status || 'Active');
      setRestrictedDates(editingType.restrictedDates || []);
      setIsCreating(false);
    }
  }, [editingType]);

  const clearForm = () => {
    setName('');
    setDescription('');
    setMinAdvanceDays(0);
    setLimitPeriod('Yearly');
    setMaxLimit(12);
    setCarryForward(false);
    setMaxCarryForward(0);
    setIsPaid(true);
    setStatus('Active');
    setRestrictedDates([]);
    setNewRestrictedDate('');
    setNewRestrictedReason('');
    setEditingType(null);
    setIsCreating(false);
  };

  const handleAddRestrictedDate = () => {
    if (!newRestrictedDate || !newRestrictedReason.trim()) {
      setErrorMsg('Please specify both blocked date and its block reason.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    // Check duplication
    if (restrictedDates.some(rd => rd.date === newRestrictedDate)) {
      setErrorMsg('This date has already been restricted.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setRestrictedDates([...restrictedDates, { date: newRestrictedDate, reason: newRestrictedReason.trim() }]);
    setNewRestrictedDate('');
    setNewRestrictedReason('');
  };

  const handleRemoveRestrictedDate = (index) => {
    setRestrictedDates(restrictedDates.filter((_, idx) => idx !== index));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Leave Name is required.');
      return;
    }

    if (maxLimit < 0) {
      setErrorMsg('Maximum Leave Limit cannot be negative.');
      return;
    }

    if (minAdvanceDays < 0) {
      setErrorMsg('Minimum Advance Apply Days cannot be negative.');
      return;
    }

    if (carryForward && maxCarryForward < 0) {
      setErrorMsg('Maximum Carry Forward Days cannot be negative.');
      return;
    }

    const payload = {
      id: editingType ? editingType.id : null,
      name: name.trim(),
      description: description.trim(),
      minAdvanceDays: parseInt(minAdvanceDays, 10) || 0,
      limitPeriod,
      maxLimit: parseInt(maxLimit, 10),
      carryForward,
      maxCarryForward: carryForward ? parseInt(maxCarryForward, 10) : 0,
      is_paid: isPaid,
      status,
      restrictedDates,
    };

    saveLeaveType(payload);
    setSuccessMsg(editingType ? 'Leave type rules updated successfully.' : 'New leave type created successfully.');
    clearForm();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (id, typeName) => {
    setConfirmModal({ open: true, id, name: typeName });
  };

  const confirmDeleteLeaveType = () => {
    deleteLeaveType(confirmModal.id);
    setSuccessMsg('Leave type removed successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    if (editingType && editingType.id === confirmModal.id) {
      clearForm();
    }
    setConfirmModal({ open: false, id: null, name: '' });
  };

  const showForm = isCreating || !!editingType;

  return (
    <>
      <div className="leaves-config-container">
        {successMsg && (
          <div className="tab-alert success">
            <CheckIcon size={14} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="tab-alert danger">
            <WarningIcon size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {!showForm ? (
          /* View A: Configured Leave Types List with "+ Create Leave Type" Button */
          <div className="panel list-panel-card" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="list-top-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Configured Leave Types ({leaveTypes.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                  Manage leave allowances, carry forward policies, and blocked blackout dates.
                </p>
              </div>
              <button 
                type="button" 
                className="btn btn-primary btn-white-text"
                onClick={() => {
                  clearForm();
                  setIsCreating(true);
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>+ Create Leave Type</span>
              </button>
            </div>

            <div className="leave-types-stack" style={{ marginTop: '16px' }}>
              {leaveTypes.length === 0 ? (
                <p className="no-data">No leave types configured yet. Click &quot;+ Create Leave Type&quot; above to create one.</p>
              ) : (
                leaveTypes.map((type) => (
                  <div className={`leave-type-item-card ${type.status === 'Inactive' ? 'inactive' : ''}`} key={type.id}>
                    <div className="card-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4>{type.name}</h4>
                        <span className={`badge ${type.is_paid !== false ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: type.is_paid !== false ? '#2563eb' : '#f59e0b', color: '#ffffff' }}>
                          {type.is_paid !== false ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <span className={`badge ${type.status === 'Active' ? 'badge-success' : 'badge-danger'}`} style={{ color: '#ffffff' }}>
                        {type.status}
                      </span>
                    </div>

                    <div className="rules-details-list">
                      <div className="rule-item">
                        <strong>Max Limit:</strong> {type.maxLimit} Days/{type.limitPeriod || 'Year'}
                      </div>
                      <div className="rule-item">
                        <strong>Min Advance:</strong> {type.minAdvanceDays > 0 ? `${type.minAdvanceDays} Days` : 'None'}
                      </div>
                      <div className="rule-item">
                        <strong>Carry Forward:</strong> {type.carryForward ? `Yes (Max ${type.maxCarryForward} Days)` : 'No'}
                      </div>
                    </div>

                    {type.restrictedDates && type.restrictedDates.length > 0 && (
                      <div className="card-blocked-dates-preview">
                        <strong>Blocked Dates:</strong>
                        <div className="blocked-tags-container">
                          {type.restrictedDates.map((item, idx) => (
                            <span key={idx} className="blocked-mini-tag" title={item.reason}>
                              {item.date}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {type.description && (
                      <p className="rule-description">
                        <em>&quot;{type.description}&quot;</em>
                      </p>
                    )}

                    <div className="card-actions-row">
                      <button 
                        type="button"
                        className="btn btn-primary btn-white-text btn-sm" 
                        onClick={() => {
                          setEditingType(type);
                          setIsCreating(false);
                        }}
                        style={{ background: '#2563eb', color: '#ffffff', fontWeight: '600', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <EditIcon size={12} />
                        <span>Edit Rules</span>
                      </button>
                      <button 
                        type="button"
                        className="btn btn-danger btn-white-text btn-sm" 
                        onClick={() => handleDelete(type.id, type.name)}
                        style={{ background: '#ef4444', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <DeleteIcon size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* View B: The Form (shown only when clicking "+ Create Leave Type" or "Edit Rules") */
          <div className="panel form-panel-card fade-in" style={{ width: '100%', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
                  {editingType ? `Modify Leave Type: ${name || editingType.name}` : 'Create Leave Type'}
                </h3>
                <p className="panel-desc" style={{ margin: '4px 0 0 0' }}>
                  Set limits, restricted dates and rules for employee vacation scopes.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={clearForm}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                &larr; Back to Rules
              </button>
            </div>

            <form onSubmit={handleSave} className="config-form">
              <div className="form-group">
                <label className="form-label" htmlFor="leave-name">Leave Name</label>
                <input
                  id="leave-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Casual Leave (CL)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Min Advance Notice Days */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }} htmlFor="min-advance">Min Advance Notice Days (In Advance)</label>
                <input
                  id="min-advance"
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 2"
                  value={minAdvanceDays}
                  onChange={(e) => setMinAdvanceDays(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="leave-desc">Description / Rule Message</label>
                <textarea
                  id="leave-desc"
                  rows="3"
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="e.g. Medical certificate required for more than 3 days."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Leave Pay Type Toggle: Paid vs Unpaid (LWP) */}
              <div className="form-group">
                <label className="form-label">Compensation / Pay Type</label>
                <div className="limit-period-toggle">
                  <button 
                    type="button" 
                    data-white-text={isPaid ? "true" : undefined}
                    className={`toggle-btn ${isPaid ? 'active' : ''}`}
                    onClick={() => setIsPaid(true)}
                  >
                    Paid Leave
                  </button>
                  <button 
                    type="button" 
                    data-white-text={!isPaid ? "true" : undefined}
                    className={`toggle-btn ${!isPaid ? 'active' : ''}`}
                    onClick={() => setIsPaid(false)}
                  >
                    Unpaid (LWP)
                  </button>
                </div>
                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', display: 'block' }}>
                  {isPaid ? 'Employees receive normal attendance pay credit for approved leave days.' : 'Employees do not receive salary pay credit for approved leave days (Unpaid Leave).'}
                </span>
              </div>

              {/* Monthly vs Yearly Switch Toggle */}
              <div className="form-group">
                <label className="form-label">Leave Limit Accumulation Type</label>
                <div className="limit-period-toggle">
                  <button 
                    type="button" 
                    data-white-text={limitPeriod === 'Monthly' ? "true" : undefined}
                    className={`toggle-btn ${limitPeriod === 'Monthly' ? 'active' : ''}`}
                    onClick={() => setLimitPeriod('Monthly')}
                  >
                    Monthly
                  </button>
                  <button 
                    type="button" 
                    data-white-text={limitPeriod === 'Yearly' ? "true" : undefined}
                    className={`toggle-btn ${limitPeriod === 'Yearly' ? 'active' : ''}`}
                    onClick={() => setLimitPeriod('Yearly')}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="max-limit">
                  Max Leave Limit (Days/{limitPeriod === 'Monthly' ? 'Month' : 'Year'})
                </label>
                <input
                  id="max-limit"
                  type="number"
                  min="0"
                  className="form-input"
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  required
                />
              </div>

              {/* Restricted Blocked Dates configuration */}
              <div className="restricted-dates-section">
                <div className="section-title-sub">Restricted Dates (Blocked Days)</div>
                <p className="section-desc-sub">Select dates where employees cannot take this leave and add reasons.</p>

                <div className="blocked-inputs-row">
                  <div className="date-input-wrap">
                    <label className="form-label" htmlFor="blocked-date">Date</label>
                    <input
                      id="blocked-date"
                      type="date"
                      className="form-input"
                      value={newRestrictedDate}
                      onChange={(e) => setNewRestrictedDate(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="reason-input-wrap">
                    <label className="form-label" htmlFor="blocked-reason">Block Reason</label>
                    <input
                      id="blocked-reason"
                      type="text"
                      className="form-input" 
                      placeholder="e.g. Audit day / Product release"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      value={newRestrictedReason}
                      onChange={(e) => setNewRestrictedReason(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-white-text add-block-btn" 
                    onClick={handleAddRestrictedDate}
                    style={{ background: '#2563eb', color: '#ffffff', fontWeight: '700', border: 'none' }}
                  >
                    Block Day
                  </button>
                </div>

                {restrictedDates.length > 0 && (
                  <div className="blocked-dates-tags-list">
                    {restrictedDates.map((item, idx) => (
                      <div key={idx} className="blocked-date-tag">
                        <div className="tag-text">
                          <strong className="danger-text">{item.date}:</strong> <span>{item.reason}</span>
                        </div>
                        <button 
                          type="button" 
                          className="remove-tag-btn"
                          onClick={() => handleRemoveRestrictedDate(idx)}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group checkbox-group-wrapper">
                <label className="form-checkbox-container">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={carryForward}
                    onChange={(e) => setCarryForward(e.target.checked)}
                  />
                  <span>Carry Forward Allowed?</span>
                </label>
              </div>

              {carryForward && (
                <div className="form-group fade-in">
                  <label className="form-label" htmlFor="max-carry">Maximum Carry Forward Days</label>
                  <input
                    id="max-carry"
                    type="number"
                    min="0"
                    className="form-input"
                    value={maxCarryForward}
                    onChange={(e) => setMaxCarryForward(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="leave-status">Status</label>
                <select
                  id="leave-status"
                  className="form-input"
                  style={{ appearance: 'auto' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-actions-row">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-white-text"
                  style={{ background: '#2563eb', color: '#ffffff', fontWeight: '700', border: 'none', padding: '10px 20px' }}
                >
                  {editingType ? 'Save Changes' : 'Create Leave Type'}
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={clearForm}
                  style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', fontWeight: '600' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Leave Type"
        message={`Are you sure you want to delete "${confirmModal.name}"? Users will no longer be able to select this leave type.`}
        confirmLabel="Delete"
        danger={true}
        onConfirm={confirmDeleteLeaveType}
        onCancel={() => setConfirmModal({ open: false, id: null, name: '' })}
      />

      <style jsx>{`
        .leaves-config-container {
          width: 100%;
        }

        .page-subtitle {
          margin-bottom: 20px;
          color: var(--text-light);
          font-size: 0.88rem;
          line-height: 1.45;
        }

        .config-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .form-panel-card {
          flex: 1;
          min-width: 320px;
        }

        .list-panel-card {
          flex: 1.2;
          min-width: 380px;
        }

        .panel-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* limit switcher toggle styled segmented controls */
        .limit-period-toggle {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: var(--radius-md);
          border: 1px solid #cbd5e1;
          width: 100%;
          margin-top: 4px;
          gap: 4px;
        }

        .limit-period-toggle .toggle-btn {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569 !important;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          text-align: center;
        }

        .limit-period-toggle .toggle-btn:hover:not(.active) {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b !important;
        }

        .limit-period-toggle .toggle-btn.active {
          background: #2563eb !important;
          color: #ffffff !important;
          border-color: #2563eb !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
          font-weight: 700;
        }

        .limit-period-toggle .toggle-btn.active * {
          color: #ffffff !important;
        }

        /* Blocked Dates Layout styling */
        .restricted-dates-section {
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin-top: 8px;
        }

        .section-title-sub {
          font-size: 0.9rem;
          color: var(--text-main);
          font-weight: 700;
          margin-bottom: 4px;
        }

        .section-desc-sub {
          font-size: 0.78rem;
          color: var(--text-light);
          margin-bottom: 12px;
        }

        .blocked-inputs-row {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr auto;
          gap: 8px;
          align-items: end;
          margin-bottom: 12px;
        }

        .add-block-btn {
          padding: 9px 14px !important;
          font-size: 0.82rem !important;
          height: 38px;
        }

        .blocked-dates-tags-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .blocked-date-tag {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          animation: fadeIn 0.15s ease;
        }

        .tag-text {
          color: var(--text-muted);
          line-height: 1.3;
        }

        .danger-text {
          color: var(--primary);
        }

        .remove-tag-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: transform var(--transition-fast);
        }

        .remove-tag-btn:hover {
          transform: scale(1.15);
        }

        .checkbox-group-wrapper {
          padding: 4px 0;
        }

        .tab-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          margin-bottom: 12px;
          animation: fadeIn 0.2s ease;
        }

        .tab-alert.success {
          background-color: var(--success-light);
          border: 1px solid var(--primary-border);
          color: var(--success);
        }

        .tab-alert.danger {
          background-color: var(--danger-light);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #b91c1c;
        }

        .form-actions-row {
          display: flex;
          gap: 12px;
        }

        /* List stack card layouts */
        .leave-types-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .leave-type-item-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: var(--transition-normal);
        }

        .leave-type-item-card:hover {
          border-color: var(--primary-border);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }

        .leave-type-item-card.inactive {
          opacity: 0.7;
          border-style: dashed;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .card-top h4 {
          font-size: 1rem;
          color: var(--text-main);
          margin: 0;
          font-weight: 700;
        }

        .rules-details-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          background: var(--bg-app);
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .card-blocked-dates-preview {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .blocked-tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 2px;
        }

        .blocked-mini-tag {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #ef4444;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: help;
        }

        .rule-description {
          font-size: 0.82rem;
          color: var(--text-light);
          line-height: 1.4;
          margin: 0;
          border-left: 3px solid var(--primary-border);
          padding-left: 8px;
        }

        .card-actions-row {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .fade-in {
          animation: fadeIn 0.2s ease;
        }

        .no-data {
          font-size: 0.88rem;
          color: var(--text-light);
          text-align: center;
          padding: 40px 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .page-subtitle {
            margin-bottom: 12px;
            font-size: 0.8rem;
          }
          .config-grid {
            gap: 12px;
          }
          .form-panel-card, .list-panel-card {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
            padding: 14px 12px !important;
          }
          .form-panel-card h3, .list-panel-card h3 {
            font-size: 1.05rem;
            margin-bottom: 4px;
          }
          .panel-desc {
            font-size: 0.78rem;
            margin-bottom: 12px;
          }
          .config-form {
            gap: 10px;
          }
          .form-group {
            margin-bottom: 0;
          }
          .form-label {
            font-size: 0.78rem;
            margin-bottom: 4px;
          }
          .form-input {
            padding: 6px 10px;
            font-size: 0.82rem;
            height: 36px;
          }
          textarea.form-input {
            height: auto;
            min-height: 60px;
          }
          .limit-period-toggle {
            padding: 2px;
            margin-top: 2px;
          }
          .limit-period-toggle .toggle-btn {
            padding: 6px 8px;
            font-size: 0.78rem;
          }
          .field-hint {
            font-size: 0.72rem !important;
          }
          .form-grid-2 {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .restricted-dates-section {
            padding-top: 10px;
            margin-top: 6px;
          }
          .section-title-sub {
            font-size: 0.85rem;
          }
          .section-desc-sub {
            font-size: 0.74rem;
            margin-bottom: 8px;
          }
          .blocked-inputs-row {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-bottom: 8px;
          }
          .add-block-btn {
            width: 100%;
            height: 34px;
            padding: 6px 12px !important;
            font-size: 0.78rem !important;
          }
          .form-actions-row {
            gap: 8px;
          }
          .form-actions-row .btn {
            flex: 1;
            padding: 8px 12px;
            font-size: 0.8rem;
          }
          .leave-types-stack {
            gap: 10px;
          }
          .leave-type-item-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .card-top h4 {
            font-size: 0.9rem;
          }
          .rules-details-list {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            padding: 6px 8px;
            font-size: 0.74rem;
          }
          .card-actions-row .btn {
            padding: 4px 8px;
            font-size: 0.72rem;
          }
        }

        @media (max-width: 480px) {
          .page-subtitle {
            font-size: 0.76rem;
            margin-bottom: 10px;
          }
          .form-panel-card, .list-panel-card {
            padding: 10px 8px !important;
          }
          .form-input {
            font-size: 0.8rem;
            height: 34px;
            padding: 5px 8px;
          }
          .rules-details-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
