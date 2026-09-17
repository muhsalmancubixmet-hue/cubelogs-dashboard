import React, { useState, useEffect, useMemo } from 'react';
import { MODULES_MAP } from '@/context/AppContext';
import {
  CheckIcon,
  WarningIcon,
  EditIcon,
  DeleteIcon
} from '@/components/Icons';
import PermissionCategory from '@/components/admin/PermissionCategory';

const getCategoryDescription = (catKey) => {
  const descMap = {
    dashboard_general: 'Access to the main dashboard and common application areas.',
    audit_security: 'Review system activity and security records.',
    employee_management: 'View and manage employees and employee records.',
    roles_access: 'Manage roles, templates, and employee access permissions.',
    org_settings: 'Manage organization-wide settings, branding, and office locations.',
    billing_subscription: 'Manage billing, subscriptions, and enabled modules.',
    salary_management: 'Configure and view employee salary structures and components.',
    payroll_processing: 'Calculate, process, and finalize monthly payroll periods.',
    attendance_clocking: 'Access employee attendance and clocking features.',
    attendance_admin: 'Manage attendance records, rules, and administrative views.',
    leave_management: 'Apply, approve, and configure employee leave.',
    holidays: 'View and configure organization holidays and holiday rules.',
    project_workspace: 'View and manage Project workspace containers and memberships.',
    project_planning: 'Manage Backlog, Epics, Stories, Tasks, and Subtasks.',
    project_personal_work: 'Manage My Tasks and personal assigned work items.',
    project_sprint_execution: 'Sprint planning, iterations, and interactive Scrum Board.',
    project_collaboration: 'Task comments and file attachments.',
    project_administration: 'Project statuses pool, analytics reports, and settings.'
  };
  return descMap[catKey] || '';
};

const getCategorizedPermissions = (flags, activeTab, searchFilter = '') => {
  const modules = [];
  const moduleEntries = Object.entries(MODULES_MAP);

  for (const [modKey, modInfo] of moduleEntries) {
    if (activeTab !== 'all' && activeTab !== modKey) {
      continue;
    }

    const modFlags = flags.filter(flag => modInfo.ids.includes(flag.id));
    if (modFlags.length === 0) continue;

    const categoriesMap = {};
    for (const flag of modFlags) {
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const matchesLabel = flag.label?.toLowerCase().includes(query);
        const matchesCategory = flag.category_label?.toLowerCase().includes(query);
        const matchesDesc = flag.description?.toLowerCase().includes(query);
        const matchesId = flag.id?.toLowerCase().includes(query);

        if (!matchesLabel && !matchesCategory && !matchesDesc && !matchesId) {
          continue;
        }
      }

      const catKey = flag.category || 'other';
      if (!categoriesMap[catKey]) {
        categoriesMap[catKey] = {
          key: catKey,
          title: flag.category_label || 'Other Settings',
          icon: flag.icon || 'settings',
          order: flag.category_order || 99,
          description: getCategoryDescription(catKey),
          permissions: []
        };
      }
      categoriesMap[catKey].permissions.push(flag);
    }

    const categories = Object.values(categoriesMap).map(cat => {
      cat.permissions.sort((a, b) => (a.permission_order || 0) - (b.permission_order || 0));
      return cat;
    });

    categories.sort((a, b) => a.order - b.order);

    if (categories.length > 0) {
      modules.push({
        key: modKey,
        label: modInfo.label,
        categories
      });
    }
  }

  return modules;
};

export default function TemplatesTab({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  tempName,
  setTempName,
  selectedPermissions,
  setSelectedPermissions,
  isEditingTemp,
  tempSuccess,
  permSearchQuery,
  setPermSearchQuery,
  activeModuleTab,
  setActiveModuleTab,
  visiblePermissionFlags,
  filteredVisibleFlags,
  isAllPermsSelected,
  handleSelectAllPermsToggle,
  handlePermissionCheckbox,
  handleToggleModuleAll,
  handleSaveTemplate,
  handleCancelTemplate,
  handleDeleteTemplate,
  MODULES_MAP
}) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [viewModalSearch, setViewModalSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewingTemplate) setViewingTemplate(null);
        if (isEditModalOpen) {
          setIsEditModalOpen(false);
          handleCancelTemplate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingTemplate, isEditModalOpen, handleCancelTemplate]);

  const handleCategorySelectAll = (permissionIds, checked) => {
    if (checked) {
      const newPerms = new Set([...selectedPermissions, ...permissionIds]);
      setSelectedPermissions(Array.from(newPerms));
    } else {
      setSelectedPermissions(selectedPermissions.filter(id => !permissionIds.includes(id)));
    }
  };

  const categorizedModules = useMemo(() => {
    return getCategorizedPermissions(visiblePermissionFlags, activeModuleTab, permSearchQuery);
  }, [visiblePermissionFlags, activeModuleTab, permSearchQuery]);

  useEffect(() => {
    if (categorizedModules.length > 0 && categorizedModules[0].categories.length > 0) {
      const firstCatKey = `${categorizedModules[0].key}_${categorizedModules[0].categories[0].key}`;
      setExpandedCategories(prev => {
        if (Object.keys(prev).length > 0) return prev;
        return { [firstCatKey]: true };
      });
    }
  }, [activeModuleTab, categorizedModules]);

  return (
    <div className="settings-grid">
      {/* Form Panel (Create Role Designation Template - Desktop) */}
      <div className="panel settings-panel-card desktop-form-panel">
        <h3 className="panel-heading">{isEditingTemp ? 'Edit Permission Template' : 'Create Role Designation Template'}</h3>

        <form onSubmit={handleSaveTemplate} className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="designation-title">Designation Title</label>
            <input
              id="designation-title"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Developer"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              required
            />
          </div>

          {/* Search Bar for Permissions */}
          <div className="form-group" style={{ marginBottom: '16px', marginTop: '12px' }}>
            <label className="form-label" htmlFor="perm-search" style={{ fontSize: '0.82rem', fontWeight: '600' }}>Search Permissions</label>
            <input
              id="perm-search"
              type="text"
              className="form-input"
              placeholder="Search permissions by label, category, description, or capability ID..."
              value={permSearchQuery}
              onChange={(e) => setPermSearchQuery(e.target.value)}
              style={{ height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Module Tabs Selector */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Module to Configure</label>
            <div className="module-tabs" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
              <button
                type="button"
                data-active-blue={activeModuleTab === 'all' ? 'true' : undefined}
                onClick={() => setActiveModuleTab('all')}
                className={`module-tab-pill ${activeModuleTab === 'all' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  backgroundColor: activeModuleTab === 'all' ? '#2563eb' : '#ffffff',
                  color: activeModuleTab === 'all' ? '#ffffff' : '#2563eb',
                  border: activeModuleTab === 'all' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                  boxShadow: activeModuleTab === 'all' ? '0 2px 8px rgba(37, 99, 235, 0.2)' : 'none',
                }}
              >
                <span className={activeModuleTab === 'all' ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: activeModuleTab === 'all' ? '#ffffff' : '#2563eb' }}>All Modules</span>
              </button>
              {Object.entries(MODULES_MAP)
                .filter(([key, mod]) => permSearchQuery === '' || mod.label.toLowerCase().includes(permSearchQuery.toLowerCase()))
                .map(([key, mod]) => (
                  <button
                    key={key}
                    type="button"
                    data-active-blue={activeModuleTab === key ? 'true' : undefined}
                    onClick={() => setActiveModuleTab(key)}
                    className={`module-tab-pill ${activeModuleTab === key ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                      backgroundColor: activeModuleTab === key ? '#2563eb' : '#ffffff',
                      color: activeModuleTab === key ? '#ffffff' : '#2563eb',
                      border: activeModuleTab === key ? '1px solid #2563eb' : '1px solid #bfdbfe',
                      boxShadow: activeModuleTab === key ? '0 2px 8px rgba(37, 99, 235, 0.2)' : 'none',
                    }}
                  >
                    <span className={activeModuleTab === key ? 'active-tab-text' : 'inactive-tab-text'} style={{ color: activeModuleTab === key ? '#ffffff' : '#2563eb' }}>{mod.label}</span>
                  </button>
                ))
              }
            </div>
          </div>

          {/* Matrix Header with Select All */}
          <div className="permission-matrix-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span className="section-title" style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>Configure Page Access Flags</span>
            {filteredVisibleFlags.length > 0 && (
              <label className="form-checkbox-container select-all-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={isAllPermsSelected}
                  onChange={handleSelectAllPermsToggle}
                />
                <strong>Select All ({filteredVisibleFlags.length})</strong>
              </label>
            )}
          </div>

          {/* Categorized Collapsible Checklist */}
          <div className="categories-checklist-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {(() => {
              if (categorizedModules.length === 0) {
                return (
                  <p style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                    No permissions match your search query.
                  </p>
                );
              }

              return categorizedModules.map((mod) => (
                <div key={mod.key} className="module-section" style={{ marginBottom: '8px' }}>
                  {activeModuleTab === 'all' && (
                    <h4 style={{
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '10px',
                      marginTop: '8px',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '4px'
                    }}>
                      {mod.label}
                    </h4>
                  )}

                  {mod.categories.map((cat) => {
                    const uniqueCatKey = `${mod.key}_${cat.key}`;
                    const isExpanded = !!permSearchQuery || !!expandedCategories[uniqueCatKey];

                    return (
                      <PermissionCategory
                        key={cat.key}
                        title={cat.title}
                        description={cat.description}
                        icon={cat.icon}
                        permissions={cat.permissions}
                        selectedPermissions={selectedPermissions}
                        disabled={false}
                        expanded={isExpanded}
                        onToggle={() => {
                          setExpandedCategories(prev => ({
                            ...prev,
                            [uniqueCatKey]: !prev[uniqueCatKey]
                          }));
                        }}
                        onSelectAll={handleCategorySelectAll}
                        onPermissionChange={(permId, checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permId]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ));
            })()}
          </div>

          {tempSuccess && (
            <div className="tab-alert success">
              <CheckIcon size={14} />
              <span>{tempSuccess}</span>
            </div>
          )}

          <div className="form-actions-row">
            <button type="submit" className="btn btn-primary">
              {isEditingTemp ? 'Save Changes' : 'Create Template'}
            </button>
            {isEditingTemp && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelTemplate}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Panel (Active Designation Templates) */}
      <div className="panel settings-panel-card templates-list-panel">
        <div className="list-panel-header">
          <div className="list-header-left">
            <h3 className="panel-heading">Designation Templates</h3>
            <span className="templates-count-pill">{templates.length} Active</span>
          </div>
          <button
            type="button"
            className="btn btn-primary new-template-btn"
            onClick={() => {
              handleCancelTemplate();
              setIsEditModalOpen(true);
            }}
          >
            <span>+ New Role</span>
          </button>
        </div>

        <div className="templates-list-stack">
          {templates.length === 0 ? (
            <p className="no-data">No custom templates created yet.</p>
          ) : (
            templates.map((temp) => (
              <div className="template-item-card" key={temp.id}>
                <div className="card-top">
                  <h4>{temp.name}</h4>
                  <span className="badge badge-info">{temp.permissions.length} Authorized</span>
                </div>

                {/* Compact badge preview limited to maximum 5 with '+X View All' button */}
                <div className="permissions-badge-preview">
                  {(temp.permissions || []).slice(0, 5).map(permId => {
                    const flag = visiblePermissionFlags.find(p => p.id === permId);
                    return flag ? (
                      <span key={permId} className="preview-badge" title={flag.description || flag.id}>
                        {flag.label.split(' (')[0]}
                      </span>
                    ) : null;
                  })}
                  {(temp.permissions || []).length > 5 && (
                    <button
                      type="button"
                      className="preview-badge-more-btn"
                      onClick={() => {
                        setViewModalSearch('');
                        setViewingTemplate(temp);
                      }}
                      title="View all authorized capabilities in a popup"
                    >
                      +{(temp.permissions || []).length - 5} View All
                    </button>
                  )}
                </div>

                <div className="card-actions-row">
                  {/* Edit Matrix button opens modal pop-up */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedTemplate(temp);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <EditIcon size={12} />
                    <span>Edit Matrix</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteTemplate(temp.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* POPUP MODAL 1: VIEW ALL PERMISSIONS MODAL */}
      {/* ============================================================ */}
      {viewingTemplate && (
        <div className="custom-modal-backdrop" onClick={() => setViewingTemplate(null)}>
          <div className="custom-modal-card view-perms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title-group">
                <h3 className="modal-title">{viewingTemplate.name}</h3>
                <span className="badge badge-info">{viewingTemplate.permissions?.length || 0} Permissions Authorized</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingTemplate(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-search-row">
              <input
                type="text"
                className="form-input modal-search-input"
                placeholder="Search authorized permissions in this role..."
                value={viewModalSearch}
                onChange={(e) => setViewModalSearch(e.target.value)}
              />
            </div>

            <div className="modal-body-scrollable">
              {(() => {
                const authorizedFlags = (viewingTemplate.permissions || [])
                  .map(id => visiblePermissionFlags.find(f => f.id === id))
                  .filter(Boolean)
                  .filter(flag => {
                    if (!viewModalSearch) return true;
                    const q = viewModalSearch.toLowerCase();
                    return (
                      flag.label?.toLowerCase().includes(q) ||
                      flag.id?.toLowerCase().includes(q) ||
                      flag.category_label?.toLowerCase().includes(q) ||
                      flag.description?.toLowerCase().includes(q)
                    );
                  });

                if (authorizedFlags.length === 0) {
                  return (
                    <div className="empty-modal-state">
                      No matching capabilities found for &ldquo;{viewModalSearch}&rdquo;.
                    </div>
                  );
                }

                // Group permissions by category
                const grouped = {};
                authorizedFlags.forEach(flag => {
                  const cat = flag.category_label || 'Other Capabilities';
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(flag);
                });

                return Object.entries(grouped).map(([catName, flags]) => (
                  <div key={catName} className="modal-cat-section">
                    <div className="modal-cat-header">
                      <span className="modal-cat-title">{catName}</span>
                      <span className="modal-cat-count">{flags.length}</span>
                    </div>
                    <div className="modal-badges-grid">
                      {flags.map(flag => (
                        <div key={flag.id} className="modal-perm-chip" title={flag.description || flag.id}>
                          <span className="perm-chip-check">✓</span>
                          <div className="perm-chip-text">
                            <span className="perm-chip-label">{flag.label}</span>
                            <span className="perm-chip-id">{flag.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingTemplate(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const t = viewingTemplate;
                  setViewingTemplate(null);
                  setSelectedTemplate(t);
                  setIsEditModalOpen(true);
                }}
              >
                <EditIcon size={12} style={{ marginRight: '6px' }} />
                <span>Edit Matrix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP MODAL 2: EDIT MATRIX MODAL */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => { setIsEditModalOpen(false); handleCancelTemplate(); }}>
          <div className="custom-modal-card edit-perms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title-group">
                <h3 className="modal-title">{selectedTemplate ? `Edit Matrix: ${selectedTemplate.name}` : 'Create Role Designation Template'}</h3>
                <span className="badge badge-info">{selectedPermissions.length} Permissions Selected</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => { setIsEditModalOpen(false); handleCancelTemplate(); }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body-scrollable">
              {/* Designation Title Input */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="modal-designation-title">Designation Title</label>
                <input
                  id="modal-designation-title"
                  type="text"
                  className="form-input"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  required
                />
              </div>

              {/* Search Permissions */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search permissions by label, category, description, or capability ID..."
                  value={permSearchQuery}
                  onChange={(e) => setPermSearchQuery(e.target.value)}
                  style={{ height: '38px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Module Tabs Selector */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div className="module-tabs" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
                  <button
                    type="button"
                    data-active-blue={activeModuleTab === 'all' ? 'true' : undefined}
                    onClick={() => setActiveModuleTab('all')}
                    className={`module-tab-pill ${activeModuleTab === 'all' ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      backgroundColor: activeModuleTab === 'all' ? '#2563eb' : '#ffffff',
                      color: activeModuleTab === 'all' ? '#ffffff' : '#2563eb',
                      border: activeModuleTab === 'all' ? '1px solid #2563eb' : '1px solid #bfdbfe',
                    }}
                  >
                    All Modules
                  </button>
                  {Object.entries(MODULES_MAP)
                    .filter(([key, mod]) => permSearchQuery === '' || mod.label.toLowerCase().includes(permSearchQuery.toLowerCase()))
                    .map(([key, mod]) => (
                      <button
                        key={key}
                        type="button"
                        data-active-blue={activeModuleTab === key ? 'true' : undefined}
                        onClick={() => setActiveModuleTab(key)}
                        className={`module-tab-pill ${activeModuleTab === key ? 'active active-blue-btn' : 'inactive-blue-pill'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          backgroundColor: activeModuleTab === key ? '#2563eb' : '#ffffff',
                          color: activeModuleTab === key ? '#ffffff' : '#2563eb',
                          border: activeModuleTab === key ? '1px solid #2563eb' : '1px solid #bfdbfe',
                        }}
                      >
                        {mod.label}
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Matrix Header with Select All */}
              <div className="permission-matrix-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="section-title" style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>Configure Page Access Flags</span>
                {filteredVisibleFlags.length > 0 && (
                  <label className="form-checkbox-container select-all-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={isAllPermsSelected}
                      onChange={handleSelectAllPermsToggle}
                    />
                    <strong>Select All ({filteredVisibleFlags.length})</strong>
                  </label>
                )}
              </div>

              {/* Categorized Collapsible Checklist */}
              <div className="categories-checklist-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categorizedModules.map((mod) => (
                  <div key={mod.key} className="module-section" style={{ marginBottom: '8px' }}>
                    {activeModuleTab === 'all' && (
                      <h4 style={{
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        color: 'var(--primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '10px',
                        marginTop: '8px',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px'
                      }}>
                        {mod.label}
                      </h4>
                    )}

                    {mod.categories.map((cat) => {
                      const uniqueCatKey = `${mod.key}_${cat.key}`;
                      const isExpanded = !!permSearchQuery || !!expandedCategories[uniqueCatKey];

                      return (
                        <PermissionCategory
                          key={cat.key}
                          title={cat.title}
                          description={cat.description}
                          icon={cat.icon}
                          permissions={cat.permissions}
                          selectedPermissions={selectedPermissions}
                          disabled={false}
                          expanded={isExpanded}
                          onToggle={() => {
                            setExpandedCategories(prev => ({
                              ...prev,
                              [uniqueCatKey]: !prev[uniqueCatKey]
                            }));
                          }}
                          onSelectAll={handleCategorySelectAll}
                          onPermissionChange={(permId, checked) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, permId]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsEditModalOpen(false); handleCancelTemplate(); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => {
                  handleSaveTemplate(e);
                  setIsEditModalOpen(false);
                }}
              >
                {selectedTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .permissions-checklist-matrix {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 10px 14px;
          align-items: center;
          margin-top: 10px;
        }

        .preview-badge-more-btn {
          display: inline-flex;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          border: 1px solid var(--primary-border, #bfdbfe);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .preview-badge-more-btn:hover {
          background: var(--primary, #2563eb);
          color: #ffffff;
          border-color: var(--primary, #2563eb);
        }

        .custom-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(7, 15, 35, 0.72);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: modalFadeIn 0.18s ease;
        }

        .custom-modal-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #d2e0f5);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 20px 30px rgba(0, 0, 0, 0.25);
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: modalScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .view-perms-modal {
          max-width: 720px;
        }

        .edit-perms-modal {
          max-width: 880px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border, #d2e0f5);
          background: var(--bg-card, #ffffff);
        }

        .header-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .modal-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: var(--text-light, #64748b);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.15s ease;
          line-height: 1;
        }

        .modal-close-btn:hover {
          background: var(--bg-app, #f4f7fc);
          color: var(--text-main, #0c1e3d);
        }

        .modal-search-row {
          padding: 12px 24px 8px 24px;
          background: var(--bg-card, #ffffff);
          border-bottom: 1px solid var(--border, #d2e0f5);
        }

        .modal-search-input {
          width: 100%;
          height: 38px;
          font-size: 0.85rem;
        }

        .modal-body-scrollable {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
          background: var(--bg-app, #f4f7fc);
        }

        .modal-cat-section {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border, #d2e0f5);
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 12px;
        }

        .modal-cat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid var(--border, #d2e0f5);
          padding-bottom: 6px;
        }

        .modal-cat-title {
          font-size: 0.86rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
        }

        .modal-cat-count {
          font-size: 0.72rem;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          padding: 1px 7px;
          border-radius: 10px;
          font-weight: 600;
        }

        .modal-badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
        }

        .modal-perm-chip {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 6px 10px;
          background: var(--bg-app, #f4f7fc);
          border: 1px solid var(--border, #d2e0f5);
          border-radius: 6px;
        }

        .perm-chip-check {
          color: #16a34a;
          font-weight: 700;
          font-size: 0.75rem;
          line-height: 1.4;
        }

        .perm-chip-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .perm-chip-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-main, #0c1e3d);
          line-height: 1.25;
        }

        .perm-chip-id {
          font-size: 0.66rem;
          color: var(--text-light, #64748b);
          line-height: 1.2;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 24px;
          border-top: 1px solid var(--border, #d2e0f5);
          background: var(--bg-card, #ffffff);
        }

        .empty-modal-state {
          text-align: center;
          padding: 30px 20px;
          font-size: 0.85rem;
          color: var(--text-light, #64748b);
          font-style: italic;
        }

        .panel-heading {
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main, #0c1e3d);
          margin: 0;
        }

        .list-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 10px;
          flex-wrap: wrap;
        }

        .list-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .templates-count-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #2563eb);
          border: 1px solid var(--primary-border, #bfdbfe);
        }

        .new-template-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }

        @media (max-width: 992px) {
          .desktop-form-panel {
            display: none !important;
          }
          .custom-modal-backdrop {
            padding: 10px;
          }
          .custom-modal-card {
            max-height: 95vh;
          }
          .modal-header {
            padding: 14px 16px;
          }
          .modal-body-scrollable {
            padding: 14px 16px;
          }
          .modal-footer {
            padding: 12px 16px;
          }
          .modal-badges-grid {
            grid-template-columns: 1fr;
          }
          .template-item-card {
            padding: 12px 14px;
          }
        }

        @media (max-width: 480px) {
          .template-item-card {
            padding: 10px 10px !important;
          }
          .custom-modal-backdrop {
            padding: 6px !important;
          }
          .custom-modal-card {
            border-radius: 12px !important;
          }
        }

        :global(:root.dark) .settings-panel-card,
        :global(:root.dark) .template-item-card {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
        }

        :global(:root.dark) .panel-heading,
        :global(:root.dark) .template-item-card h4,
        :global(:root.dark) .modal-title,
        :global(:root.dark) .modal-cat-title,
        :global(:root.dark) .perm-chip-label {
          color: #f8fafc !important;
        }

        :global(:root.dark) .preview-badge,
        :global(:root.dark) .modal-perm-chip {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        :global(:root.dark) .custom-modal-card {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-header,
        :global(:root.dark) .modal-footer,
        :global(:root.dark) .modal-search-row {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        :global(:root.dark) .modal-body-scrollable {
          background-color: #0f172a !important;
        }

        :global(:root.dark) .modal-cat-section {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
