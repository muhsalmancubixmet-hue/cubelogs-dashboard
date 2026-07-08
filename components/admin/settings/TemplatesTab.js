import React from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  EditIcon, 
  DeleteIcon 
} from '@/components/Icons';

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
  return (
    <div className="settings-grid">
      {/* Form Panel */}
      <div className="panel settings-panel-card">
        <h3>{isEditingTemp ? 'Edit Permission Template' : 'Create Role Designation Template'}</h3>
        <p className="tab-desc">Define designation templates to map custom permission sets to workers.</p>

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

          {/* Search Bar for Modules */}
          <div className="form-group" style={{ marginBottom: '16px', marginTop: '12px' }}>
            <label className="form-label" htmlFor="perm-search" style={{ fontSize: '0.82rem', fontWeight: '600' }}>Search Modules</label>
            <input
              id="perm-search"
              type="text"
              className="form-input"
              placeholder="Search modules by name (e.g. Attendance)..."
              value={permSearchQuery}
              onChange={(e) => setPermSearchQuery(e.target.value)}
              style={{ height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Module Tabs Selector */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Module to Configure</label>
            <div className="module-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  background: activeModuleTab === 'all' ? 'var(--primary)' : 'var(--bg-app)',
                  color: activeModuleTab === 'all' ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.15s'
                }}
                onClick={() => setActiveModuleTab('all')}
              >
                All Modules
              </button>
              {Object.entries(MODULES_MAP)
                .filter(([key, mod]) => permSearchQuery === '' || mod.label.toLowerCase().includes(permSearchQuery.toLowerCase()))
                .map(([key, mod]) => (
                  <button
                    key={key}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      background: activeModuleTab === key ? 'var(--primary)' : 'var(--bg-app)',
                      color: activeModuleTab === key ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => setActiveModuleTab(key)}
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

          {/* Module-Grouped Checklists */}
          <div className="module-groups-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {Object.entries(MODULES_MAP)
              .filter(([key, mod]) => {
                const matchesTab = activeModuleTab === 'all' || activeModuleTab === key;
                const matchesSearch = permSearchQuery === '' || mod.label.toLowerCase().includes(permSearchQuery.toLowerCase());
                return matchesTab && matchesSearch;
              })
              .map(([key, mod]) => {
                const modPerms = visiblePermissionFlags.filter(flag => mod.ids.includes(flag.id));

                if (modPerms.length === 0) return null;

                return (
                  <div key={key} className="module-group-card" style={{ background: 'var(--primary-light)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)' }}>
                    {(() => {
                      const visibleIds = visiblePermissionFlags
                        .filter(flag => mod.ids.includes(flag.id))
                        .map(flag => flag.id);
                      const isModuleAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedPermissions.includes(id));

                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={isModuleAllSelected}
                              onChange={() => handleToggleModuleAll(mod.ids)}
                            />
                            <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {mod.label}
                            </h4>
                          </label>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: '600', opacity: 0.8 }}>
                            {modPerms.filter(p => selectedPermissions.includes(p.id)).length} of {modPerms.length} Active
                          </span>
                        </div>
                      );
                    })()}
                    <div className="permissions-checklist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                      {modPerms.map((flag) => (
                        <label className="form-checkbox-container permission-item-label" key={flag.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={selectedPermissions.includes(flag.id)}
                            onChange={() => handlePermissionCheckbox(flag.id)}
                          />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{flag.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            {filteredVisibleFlags.length === 0 && (
              <p style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                No permission flags match your search filters.
              </p>
            )}
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

      {/* List Panel */}
      <div className="panel settings-panel-card">
        <h3>Designation Templates</h3>
        <p className="tab-desc">List of templates currently active in database.</p>

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
                
                <div className="permissions-badge-preview">
                  {temp.permissions.map(permId => {
                    const flag = visiblePermissionFlags.find(p => p.id === permId);
                    return flag ? <span key={permId} className="preview-badge">{flag.label.split(' (')[0]}</span> : null;
                  })}
                </div>

                <div className="card-actions-row">
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTemplate(temp)}>
                    <EditIcon size={12} />
                    <span>Edit Matrix</span>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTemplate(temp.id)}>
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
    </div>
  );
}
