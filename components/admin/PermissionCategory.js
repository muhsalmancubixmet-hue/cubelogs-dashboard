'use client';

import React, { useRef, useEffect } from 'react';
import {
  DashboardIcon,
  AuditIcon,
  EmployeesIcon,
  TemplatesIcon,
  SettingsIcon,
  BriefcaseIcon,
  ClockIcon,
  AttendanceIcon,
  LeavesIcon,
  HolidaysIcon,
  TasksIcon,
  StoryIcon,
  BoardIcon,
  ShieldIcon,
  ChevronIcon
} from '@/components/Icons';

const ICON_MAP = {
  dashboard: DashboardIcon,
  audit: AuditIcon,
  employees: EmployeesIcon,
  roles: TemplatesIcon,
  settings: SettingsIcon,
  billing: BriefcaseIcon,
  clocking: ClockIcon,
  attendance_admin: AttendanceIcon,
  leave: LeavesIcon,
  holiday: HolidaysIcon,
  project_access: BriefcaseIcon,
  project_members: EmployeesIcon,
  epics_stories: StoryIcon,
  tasks_subtasks: TasksIcon,
  project_statuses: BoardIcon
};

export default function PermissionCategory({
  title,
  description,
  icon,
  permissions = [],
  selectedPermissions = [],
  inheritedPermissions = [],
  disabled = false,
  expanded = false,
  onToggle,
  onSelectAll,
  onPermissionChange
}) {
  const checkboxRef = useRef(null);

  const ids = permissions.map(p => p.id);
  const selectedInCat = ids.filter(id => selectedPermissions.includes(id));
  const isAllSelected = ids.length > 0 && selectedInCat.length === ids.length;
  const isIndeterminate = selectedInCat.length > 0 && selectedInCat.length < ids.length;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const IconComponent = ICON_MAP[icon] || ShieldIcon;

  const handleSelectAllChange = (e) => {
    if (disabled) return;
    if (onSelectAll) {
      onSelectAll(ids, e.target.checked);
    }
  };

  const handleCheckboxChange = (id, checked) => {
    if (disabled) return;
    if (onPermissionChange) {
      onPermissionChange(id, checked);
    }
  };

  return (
    <div className={`category-card ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Category Header */}
      <div 
        className="category-header" 
        onClick={onToggle}
        aria-expanded={expanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="header-left">
          <div className="category-icon-wrapper">
            <IconComponent size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="category-titles">
            <div className="title-row">
              <span className="category-title">{title}</span>
              <span className="permission-count">{permissions.length} permissions</span>
            </div>
            {description && <p className="category-description">{description}</p>}
          </div>
        </div>

        <div className="header-right" onClick={(e) => e.stopPropagation()}>
          {/* Select All Checkbox */}
          <label 
            className={`form-checkbox-container select-all-btn ${disabled ? 'disabled' : ''}`}
            style={{ margin: 0 }}
          >
            <input
              ref={checkboxRef}
              type="checkbox"
              className="form-checkbox"
              checked={isAllSelected}
              onChange={handleSelectAllChange}
              disabled={disabled}
            />
            <span>Select All</span>
          </label>

          {/* Chevron Collapse Indicator */}
          <button 
            type="button" 
            className="collapse-arrow-btn"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
          >
            <ChevronIcon direction={expanded ? 'up' : 'down'} size={18} />
          </button>
        </div>
      </div>

      {/* Category Collapsible Body */}
      {expanded && (
        <div className="category-body">
          <div className="permissions-grid">
            {permissions.map((perm) => {
              const isChecked = selectedPermissions.includes(perm.id);
              const isInherited = Array.isArray(inheritedPermissions) && inheritedPermissions.includes(perm.id);

              return (
                <label 
                  key={perm.id} 
                  className={`permission-item-row ${isChecked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  title={`Capability ID: ${perm.id}`}
                >
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(perm.id, e.target.checked)}
                    disabled={disabled}
                  />
                  <div className="permission-text-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="permission-item-label">{perm.label}</span>
                      {isInherited && (
                        <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          Inherited
                        </span>
                      )}
                      {perm.tier === 'base' && (
                        <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                          Default for Project Members
                        </span>
                      )}
                      {perm.tier === 'contributor' && (
                        <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid #fde68a' }}>
                          Contributor Default
                        </span>
                      )}
                      {perm.tier === 'management' && (
                        <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid #fca5a5' }}>
                          Management Permission
                        </span>
                      )}
                    </div>
                    {perm.description && (
                      <span className="permission-item-desc">{perm.description}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .category-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .category-card.expanded {
          border-color: var(--primary-border);
          box-shadow: var(--shadow-sm);
        }

        .category-card:hover {
          border-color: var(--primary-border);
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          user-select: none;
          background: var(--bg-card);
          outline: none;
        }

        .category-header:focus-visible {
          box-shadow: 0 0 0 2px var(--primary-border);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .category-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--primary-light);
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        .category-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .category-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .permission-count {
          font-size: 0.72rem;
          background: var(--primary-light);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: lowercase;
        }

        .category-description {
          margin: 0;
          font-size: 0.76rem;
          color: var(--text-light);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .collapse-arrow-btn {
          background: none;
          border: none;
          color: var(--text-light);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.15s;
        }

        .collapse-arrow-btn:hover {
          background: var(--bg-app);
          color: var(--text-main);
        }

        .category-body {
          border-top: 1px solid var(--border);
          background: var(--bg-app);
          padding: 16px 20px;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 16px;
        }

        .permission-item-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .permission-item-row:hover:not(.disabled) {
          border-color: var(--primary);
          background: var(--bg-card);
        }

        .permission-item-row.selected {
          border-color: var(--primary-border);
          background: var(--primary-light);
        }

        .permission-item-row.selected .permission-item-label {
          color: var(--primary);
          font-weight: 600;
        }

        .permission-item-row.disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .permission-text-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .permission-item-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-main);
          line-height: 1.25;
        }

        .permission-item-desc {
          font-size: 0.7rem;
          color: var(--text-light);
          line-height: 1.2;
        }

        .select-all-btn {
          padding: 4px 10px;
          border-radius: 4px;
          background: var(--bg-app);
          border: 1px solid var(--border);
          font-size: 0.78rem;
          font-weight: 600;
        }

        .select-all-btn.disabled {
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .permissions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .category-header {
            padding: 12px 14px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .header-left {
            width: 100%;
          }
          .header-right {
            width: 100%;
            justify-content: space-between;
          }
          .permissions-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .permissions-grid {
            grid-template-columns: 1fr;
          }
          .category-description {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
