'use client';

import React, { useState, useEffect } from 'react';
import { projectService } from '../../lib/services/projectService';
import { 
  EmployeesIcon, 
  CloseIcon, 
  WarningIcon, 
  TasksIcon, 
  CheckIcon, 
  DeclineIcon 
} from '@/components/Icons';

export default function AddProjectMemberModal({ projectId, onClose, onMemberAdded }) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [projectRole, setProjectRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadEligible() {
      try {
        setLoadingEmployees(true);
        setErrorMsg('');
        let list = [];
        try {
          const res = await projectService.getEligibleProjectEmployees(projectId);
          list = Array.isArray(res) ? res : (res?.results || []);
        } catch (e) {
          const res = await projectService.getCompanyEligibleEmployees();
          list = Array.isArray(res) ? res : (res?.results || []);
        }
        setEmployees(list);
      } catch (err) {
        console.error('Failed to load eligible employees:', err);
        setErrorMsg('Failed to load employee list.');
      } finally {
        setLoadingEmployees(false);
      }
    }
    if (projectId) loadEligible();
  }, [projectId]);

  const toggleSelectUser = (id) => {
    const numId = Number(id);
    setSelectedUserIds((prev) =>
      prev.includes(numId) ? prev.filter((i) => i !== numId) : [...prev, numId]
    );
  };

  const toggleSelectAll = () => {
    const filtered = filteredEmployees.map((e) => Number(e.id || e.user_id));
    const allSelected = filtered.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filtered.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filtered])));
    }
  };

  const handleRoleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomRole(true);
      setProjectRole('');
    } else {
      setIsCustomRole(false);
      setProjectRole(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setErrorMsg('Please select at least one employee.');
      return;
    }
    const effectiveRole = isCustomRole ? (customRole.trim() || 'Contributor') : (projectRole || 'Contributor');
    try {
      setSubmitting(true);
      setErrorMsg('');
      await projectService.addProjectMember(projectId, {
        user_ids: selectedUserIds,
        members: selectedUserIds,
        project_role: effectiveRole,
      });
      if (onMemberAdded) onMemberAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add project members:', err);
      setErrorMsg(err.message || 'Failed to add project members.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRolePreview = (role) => {
    switch (role) {
      case 'Team Lead':
        return {
          can: 'Plan Stories & Tasks, assign team work, start/complete Sprints, manage Scrum Board & Retrospectives.',
          cannot: 'Delete Project or alter company settings.',
          bg: '#eff6ff',
          border: '#bfdbfe',
        };
      case 'Project Manager':
        return {
          can: 'Full project planning, member management, sprint lifecycle, board, settings, and retrospectives.',
          cannot: 'Delete organization account or access external billing.',
          bg: '#f0fdf4',
          border: '#bbf7d0',
        };
      case 'Viewer':
        return {
          can: 'Read-only access to Project Overview, Backlog, Board, Sprints, Comments, and Members.',
          cannot: 'Create/edit work items, move cards, or log time.',
          bg: '#f8fafc',
          border: '#cbd5e1',
        };
      default: // Contributor / Developer / QA / Designer / Custom
        return {
          can: 'View Project & Backlog, work on assigned Tasks, submit Daily Stand-up, add Comments & Attachments, move own cards.',
          cannot: 'Manage Sprints, manage members, or move other users\' cards.',
          bg: '#faf5ff',
          border: '#e9d5ff',
        };
    }
  };

  const displayedRole = isCustomRole ? (customRole.trim() || 'Custom Role') : (projectRole || 'Contributor');
  const rolePreview = getRolePreview(displayedRole);

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.name || emp.full_name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const role = (emp.role || emp.department || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });

  return (
    <div className="modal-overlay">
      <div className="modal-shell" style={{ width: '100%', maxWidth: 540 }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0
            }}>
              <EmployeesIcon size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Add Team Members</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Select employees and assign an optional Project-specific Role.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningIcon size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Project Role Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Project Role (Optional)
              </label>
              <select
                value={isCustomRole ? '__custom__' : projectRole}
                onChange={handleRoleSelectChange}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                <option value="">Select Project Role (Default: Contributor)</option>
                <option value="Contributor">Contributor / Member</option>
                <option value="Developer">Developer / Engineer</option>
                <option value="Team Lead">Team Lead</option>
                <option value="QA Engineer">QA Engineer / Tester</option>
                <option value="Designer">UI/UX Designer</option>
                <option value="Product Owner">Product Owner</option>
                <option value="Viewer">Viewer (Read-Only)</option>
                <option value="__custom__">+ Add Custom Role...</option>
              </select>

              {isCustomRole && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter custom project role (e.g. DevOps, Scrum Master)..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #3b82f6', fontSize: 13, outline: 'none' }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Project Role Access Summary Box */}
            <div style={{
              background: rolePreview.bg, border: `1px solid ${rolePreview.border}`, borderRadius: 10, padding: 12, fontSize: 12
            }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TasksIcon size={14} style={{ color: '#2563eb' }} />
                <span>{displayedRole} Access Preview in this Project:</span>
              </div>
              <div style={{ color: '#16a34a', marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <CheckIcon size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>Can:</strong> {rolePreview.can}</span>
              </div>
              <div style={{ color: '#dc2626', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <DeclineIcon size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>Cannot:</strong> {rolePreview.cannot}</span>
              </div>
            </div>

            {/* Search bar & Select All */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search employees by name, designation, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
              />
              {filteredEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{
                    padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc',
                    fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', width: '100%', minHeight: 40
                  }}
                >
                  Select All Eligible ({filteredEmployees.length})
                </button>
              )}
            </div>

            {/* Employee Multi-Select Checklist */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Eligible Employees ({filteredEmployees.length})
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                  {selectedUserIds.length} Selected
                </span>
              </div>

              {loadingEmployees ? (
                <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
                  Loading eligible organization employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', borderRadius: 8, fontSize: 13 }}>
                  All organization employees are already added to this project.
                </div>
              ) : (
                <div style={{
                  maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10,
                  display: 'flex', flexDirection: 'column'
                }}>
                  {filteredEmployees.map((emp) => {
                    const empId = Number(emp.id || emp.user_id);
                    const isChecked = selectedUserIds.includes(empId);
                    const name = emp.name || emp.full_name || emp.email;
                    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <label
                        key={empId}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                          background: isChecked ? '#eff6ff' : '#ffffff', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectUser(empId)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                          />
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: isChecked ? '#2563eb' : '#94a3b8',
                            color: '#ffffff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{name}</div>
                            <div style={{ fontSize: 11, color: '#64748b', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{emp.email}</div>
                          </div>
                        </div>

                        {isChecked && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', marginLeft: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckIcon size={14} /> Selected
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedUserIds.length === 0}
              style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: submitting || selectedUserIds.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: submitting || selectedUserIds.length === 0 ? 'not-allowed' : 'pointer', minHeight: 44
              }}
            >
              {submitting ? 'Adding Members...' : `+ Add (${selectedUserIds.length}) Members`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
