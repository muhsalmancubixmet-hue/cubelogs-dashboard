'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, apiLogout } from '../lib/api/apiClient';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../lib/api/tokenStorage';
import { authService, organizationService, normalizePermissionRegistry } from '../lib/services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';

export const AppContext = createContext();

// All checkable permission flags categorized into General, System Settings, and Add-on Modules
export const PERMISSION_FLAGS = [
  // General Access
  { 
    id: 'dashboard', 
    label: 'Dashboard Analytics', 
    isDefault: true,
    category: 'dashboard_general',
    category_label: 'Dashboard & General Access',
    category_order: 1,
    permission_order: 1,
    description: 'Access the main overview analytics dashboard.',
    icon: 'dashboard'
  },
  { 
    id: 'audit_logs:view', 
    label: 'System Audit Logs', 
    isDefault: true,
    category: 'audit_security',
    category_label: 'Audit & Security',
    category_order: 2,
    permission_order: 1,
    description: 'View organization security and system audit logs.',
    icon: 'audit'
  },

  // System Settings
  { 
    id: 'admin:employees', 
    label: 'Manage Employee Page',
    category: 'employee_management',
    category_label: 'Employee Management',
    category_order: 3,
    permission_order: 1,
    description: 'View, add, update, and manage employee profiles.',
    icon: 'employees'
  },
  { 
    id: 'admin:templates', 
    label: 'Templates',
    category: 'roles_access',
    category_label: 'Roles & Access Control',
    category_order: 4,
    permission_order: 1,
    description: 'Create and configure permission designation templates.',
    icon: 'roles'
  },
  { id: 'roles.view', label: 'View System & Custom Roles', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 2, description: 'View role list and role configuration details.', icon: 'roles' },
  { id: 'roles.create', label: 'Create Custom Roles', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 3, description: 'Create new organization-specific custom roles.', icon: 'roles' },
  { id: 'roles.edit', label: 'Edit Roles & Permissions', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 4, description: 'Update role permissions and configuration details.', icon: 'roles' },
  { id: 'roles.delete', label: 'Delete Custom Roles', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 5, description: 'Remove custom organization roles.', icon: 'roles' },
  { id: 'roles.assign', label: 'Assign Roles to Employees', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 6, description: 'Assign or reassign roles to staff members.', icon: 'roles' },
  { id: 'roles.duplicate', label: 'Duplicate Roles', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 7, description: 'Duplicate roles to create new custom presets.', icon: 'roles' },
  { id: 'permissions.view', label: 'View Permission Registry', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 8, description: 'View system-wide capability permission registry.', icon: 'roles' },
  { id: 'permissions.manage', label: 'Manage Permission Assignments', category: 'roles_access', category_label: 'Roles & Access Control', category_order: 4, permission_order: 9, description: 'Configure granular permission assignments.', icon: 'roles' },
  { 
    id: 'locations:manage', 
    label: 'Office Location',
    category: 'org_settings',
    category_label: 'Organization Settings',
    category_order: 5,
    permission_order: 1,
    description: 'Manage physical office locations and geographical coordinates.',
    icon: 'settings'
  },
  { 
    id: 'settings:branding', 
    label: 'Branding',
    category: 'org_settings',
    category_label: 'Organization Settings',
    category_order: 5,
    permission_order: 2,
    description: 'Customize application branding, themes, and organization logos.',
    icon: 'settings'
  },
  { 
    id: 'settings:billing', 
    label: 'Billing & Subscription',
    category: 'billing_subscription',
    category_label: 'Billing & Subscription',
    category_order: 6,
    permission_order: 1,
    description: 'View invoicing history and manage subscription plan tiers.',
    icon: 'billing'
  },

  // Attendance Management
  { 
    id: 'attendance:staff', 
    label: 'Attendance & Clocking',
    category: 'attendance_clocking',
    category_label: 'Attendance & Clocking',
    category_order: 7,
    permission_order: 1,
    description: 'Clock in and out, view own daily clocking history.',
    icon: 'clocking'
  },
  { 
    id: 'attendance:management_portal', 
    label: 'Attendance Management Portal',
    category: 'attendance_admin',
    category_label: 'Attendance Administration',
    category_order: 8,
    permission_order: 1,
    description: 'View organization attendance logs and clocking list.',
    icon: 'attendance_admin'
  },
  { 
    id: 'attendance:admin', 
    label: 'Attendance Rules Configuration',
    category: 'attendance_admin',
    category_label: 'Attendance Administration',
    category_order: 8,
    permission_order: 2,
    description: 'Configure grace periods, schedule rules, and attendance policies.',
    icon: 'attendance_admin'
  },
  { 
    id: 'leaves:apply', 
    label: 'Apply Leave Form',
    category: 'leave_management',
    category_label: 'Leave Management',
    category_order: 9,
    permission_order: 1,
    description: 'Submit leaves and view own leave requests.',
    icon: 'leave'
  },
  { 
    id: 'leaves:approve', 
    label: 'Leave Approval Portal',
    category: 'leave_management',
    category_label: 'Leave Management',
    category_order: 9,
    permission_order: 2,
    description: 'Approve, deny, and track employee leave requests.',
    icon: 'leave'
  },
  { 
    id: 'leaves:manage', 
    label: 'Configure Leave Types',
    category: 'leave_management',
    category_label: 'Leave Management',
    category_order: 9,
    permission_order: 3,
    description: 'Define leave categories and annual quotas.',
    icon: 'leave'
  },
  { 
    id: 'holidays:view', 
    label: 'View Holiday Calendar',
    category: 'holidays',
    category_label: 'Holidays',
    category_order: 10,
    permission_order: 1,
    description: 'View public holidays calendar and events.',
    icon: 'holiday'
  },
  { 
    id: 'holidays:manage', 
    label: 'Configure Holidays',
    category: 'holidays',
    category_label: 'Holidays',
    category_order: 10,
    permission_order: 2,
    description: 'Add, modify, and delete holidays from registry.',
    icon: 'holiday'
  },
  { 
    id: 'holidays:rules', 
    label: 'Holiday Rule Engine',
    category: 'holidays',
    category_label: 'Holidays',
    category_order: 10,
    permission_order: 3,
    description: 'Set custom holiday rules and auto-accrual flags.',
    icon: 'holiday'
  },

  // Project Management - 1. Project Workspace
  { id: 'projects.overview.view', label: 'View Project Overview', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'base', category_order: 11, permission_order: 1, description: 'View project overview dashboard and health summary.', icon: 'project_access' },
  { id: 'projects:view', label: 'View Projects', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'base', category_order: 11, permission_order: 2, description: 'View project summaries, overview panels, and project list.', icon: 'project_access' },
  { id: 'projects:create', label: 'Create Projects', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 3, description: 'Create new project workspace containers.', icon: 'project_access' },
  { id: 'projects:update', label: 'Edit Projects', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 4, description: 'Update project details, configurations, and metadata.', icon: 'project_access' },
  { id: 'projects:delete', label: 'Delete Projects', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 5, description: 'Permanently remove projects and their workspaces.', icon: 'project_access' },
  { id: 'projects.members.view', label: 'View Project Members', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'base', category_order: 11, permission_order: 6, description: 'View project team members directory.', icon: 'project_members' },
  { id: 'projects.members.manage', label: 'Manage Members', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 7, description: 'Assign or remove project managers, team leads, and developers.', icon: 'project_members' },
  { id: 'projects.members.assign', label: 'Assign Members', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 8, description: 'Assign new members to project workspace.', icon: 'project_members' },
  { id: 'projects.members.remove', label: 'Remove Members', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 9, description: 'Remove assigned members from project.', icon: 'project_members' },
  { id: 'projects:members_manage', label: 'Manage Project Memberships', category: 'project_workspace', category_label: '1. Project Workspace', tier: 'management', category_order: 11, permission_order: 10, description: 'Global authority to alter project memberships.', icon: 'project_members' },

  // Project Management - 2. Planning (Backlog, Epics, Stories, Tasks, Subtasks)
  { id: 'projects.backlog.view', label: 'View Backlog', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 1, description: 'View project backlog items.', icon: 'epics_stories' },
  { id: 'projects.backlog.create', label: 'Create Backlog Item', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 2, description: 'Create new user stories in the backlog.', icon: 'epics_stories' },
  { id: 'projects.backlog.edit', label: 'Edit Backlog Item', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 3, description: 'Modify backlog story titles, points, and criteria.', icon: 'epics_stories' },
  { id: 'projects.backlog.delete', label: 'Delete Backlog Item', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 4, description: 'Remove backlog items from project backlog.', icon: 'epics_stories' },
  { id: 'projects.backlog.move', label: 'Move Story to Sprint', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 5, description: 'Plan backlog stories into active or future sprints.', icon: 'epics_stories' },
  { id: 'projects.backlog.assign', label: 'Assign Story Members', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 6, description: 'Assign story owners and team members.', icon: 'epics_stories' },

  { id: 'projects.epic.view', label: 'View Epics', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 7, description: 'View project epics and roadmap goals.', icon: 'epics_stories' },
  { id: 'projects.epic.create', label: 'Create Epic', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 8, description: 'Create new feature epic containers.', icon: 'epics_stories' },
  { id: 'projects.epic.edit', label: 'Edit Epic', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 9, description: 'Update epic details, colors, and dates.', icon: 'epics_stories' },
  { id: 'projects.epic.delete', label: 'Delete Epic', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 10, description: 'Delete epic blocks.', icon: 'epics_stories' },
  { id: 'projects.epic.assign', label: 'Assign Stories to Epic', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 11, description: 'Link user stories to feature epics.', icon: 'epics_stories' },

  { id: 'projects.story.view', label: 'View Stories', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 12, description: 'View user stories list and detail drawers.', icon: 'epics_stories' },
  { id: 'projects.story.create', label: 'Create Story', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 13, description: 'Create user stories.', icon: 'epics_stories' },
  { id: 'projects.story.edit', label: 'Edit Story', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 14, description: 'Update story descriptions and estimations.', icon: 'epics_stories' },
  { id: 'projects.story.delete', label: 'Delete Story', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 15, description: 'Delete user stories.', icon: 'epics_stories' },
  { id: 'projects.story.assign', label: 'Assign Story', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 16, description: 'Assign story assignees.', icon: 'epics_stories' },
  { id: 'projects.story.status', label: 'Change Story Status', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 17, description: 'Transition story workflow states.', icon: 'epics_stories' },
  { id: 'projects.story.move', label: 'Move Story', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 18, description: 'Move story placement.', icon: 'epics_stories' },
  { id: 'project_stories:view', label: 'View Project Sections', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 19, description: 'View project stories and sections.', icon: 'epics_stories' },
  { id: 'project_stories:create', label: 'Create Project Sections', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 20, description: 'Create project section stories.', icon: 'epics_stories' },
  { id: 'project_stories:update', label: 'Edit Project Sections', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 21, description: 'Update project section stories.', icon: 'epics_stories' },
  { id: 'project_stories:delete', label: 'Delete Project Sections', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 22, description: 'Remove section stories.', icon: 'epics_stories' },

  { id: 'projects.task.view', label: 'View Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 23, description: 'View project task lists.', icon: 'tasks_subtasks' },
  { id: 'projects.task.create', label: 'Create Task', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 24, description: 'Create project task items.', icon: 'tasks_subtasks' },
  { id: 'projects.task.edit', label: 'Edit All Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 25, description: 'Edit task details and estimations across project.', icon: 'tasks_subtasks' },
  { id: 'projects.task.delete', label: 'Delete Task', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 26, description: 'Delete project task items.', icon: 'tasks_subtasks' },
  { id: 'projects.task.assign', label: 'Assign Task', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 27, description: 'Assign task assignees.', icon: 'tasks_subtasks' },
  { id: 'projects.task.update_status', label: 'Update Any Task Status', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 28, description: 'Change status of any project task.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:view_all', label: 'View All Project Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'base', category_order: 12, permission_order: 29, description: 'View all tasks across active projects.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:create', label: 'Create Project Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 30, description: 'Create tasks and assign members.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:update_all', label: 'Edit All Project Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 31, description: 'Modify details of any task.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:delete', label: 'Delete Project Tasks', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 32, description: 'Remove task items.', icon: 'tasks_subtasks' },

  { id: 'projects.subtask.create', label: 'Create Subtask for Assigned Task', category: 'project_planning', category_label: '2. Planning', tier: 'contributor', category_order: 12, permission_order: 33, description: 'Add subtask checklist items to assigned tasks.', icon: 'tasks_subtasks' },
  { id: 'projects.subtask.edit', label: 'Edit Own/Assigned Subtask', category: 'project_planning', category_label: '2. Planning', tier: 'contributor', category_order: 12, permission_order: 34, description: 'Modify own subtask text and assignees.', icon: 'tasks_subtasks' },
  { id: 'projects.subtask.delete', label: 'Delete Subtask', category: 'project_planning', category_label: '2. Planning', tier: 'management', category_order: 12, permission_order: 35, description: 'Delete subtask items.', icon: 'tasks_subtasks' },
  { id: 'projects.subtask.complete', label: 'Complete Assigned Subtask', category: 'project_planning', category_label: '2. Planning', tier: 'contributor', category_order: 12, permission_order: 36, description: 'Check off subtask items.', icon: 'tasks_subtasks' },

  // Project Management - 3. Personal Work (My Tasks)
  { id: 'projects.my_tasks.view', label: 'View My Tasks', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'base', category_order: 13, permission_order: 1, description: 'View tasks assigned to me.', icon: 'tasks_subtasks' },
  { id: 'projects.my_tasks.update', label: 'Update My Tasks', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 2, description: 'Edit details of my assigned tasks.', icon: 'tasks_subtasks' },
  { id: 'projects.my_tasks.update_status', label: 'Update My Task Status', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 3, description: 'Update progress status on assigned tasks.', icon: 'tasks_subtasks' },
  { id: 'projects.my_tasks.log_time', label: 'Log My Time', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 4, description: 'Log working hours on my assigned tasks.', icon: 'tasks_subtasks' },
  { id: 'projects.my_tasks.subtasks', label: 'Manage My Subtasks', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 5, description: 'Create and complete subtasks under my assigned work.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:view_own', label: 'View Assigned Project Tasks', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'base', category_order: 13, permission_order: 6, description: 'View tasks assigned explicitly to myself.', icon: 'tasks_subtasks' },
  { id: 'project_tasks:update_own', label: 'Update Assigned Task Status', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 7, description: 'Update status of my assigned tasks.', icon: 'tasks_subtasks' },
  { id: 'projects.task.log_time', label: 'Log Time on Assigned Tasks', category: 'project_personal_work', category_label: '3. Personal Work', tier: 'contributor', category_order: 13, permission_order: 8, description: 'Log time spent working on assigned tasks.', icon: 'tasks_subtasks' },

  // Project Management - 4. Sprint Execution (Sprints & Scrum Board)
  { id: 'projects.sprint.view', label: 'View Sprints', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'base', category_order: 14, permission_order: 1, description: 'View sprint planning and sprint history.', icon: 'project_access' },
  { id: 'projects.sprint.create', label: 'Create Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 2, description: 'Create new sprint containers.', icon: 'project_access' },
  { id: 'projects.sprint.edit', label: 'Edit Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 3, description: 'Update sprint goals, capacity, and dates.', icon: 'project_access' },
  { id: 'projects.sprint.delete', label: 'Delete Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 4, description: 'Delete sprint containers.', icon: 'project_access' },
  { id: 'projects.sprint.start', label: 'Start Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 5, description: 'Activate planned sprint cycle.', icon: 'project_access' },
  { id: 'projects.sprint.complete', label: 'Complete Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 6, description: 'Close active sprint and generate velocity.', icon: 'project_access' },
  { id: 'projects.sprint.cancel', label: 'Cancel Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 7, description: 'Abort active sprint.', icon: 'project_access' },
  { id: 'projects.sprint.reopen', label: 'Reopen Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 8, description: 'Reopen completed sprint cycle.', icon: 'project_access' },
  { id: 'projects.sprint.move_stories', label: 'Move Stories into Sprint', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 9, description: 'Move stories into or out of sprint.', icon: 'project_access' },

  { id: 'projects.board.view', label: 'View Scrum Board', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'base', category_order: 14, permission_order: 10, description: 'View interactive Scrum board.', icon: 'project_access' },
  { id: 'projects.board.move_cards', label: 'Move Cards for Assigned Work', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'contributor', category_order: 14, permission_order: 11, description: 'Drag and drop assigned story/task cards across columns.', icon: 'project_access' },
  { id: 'projects.board.update_status', label: 'Update Card Status', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'contributor', category_order: 14, permission_order: 12, description: 'Update column statuses on board for accessible work items.', icon: 'project_access' },
  { id: 'projects.board.manage', label: 'Manage Board (All Cards & Columns)', category: 'project_sprint_execution', category_label: '4. Sprint Execution', tier: 'management', category_order: 14, permission_order: 13, description: 'Configure board columns, swimlanes, and move any card.', icon: 'project_access' },

  // Project Management - 5. Collaboration (Comments & Attachments)
  { id: 'projects.comment.view', label: 'View Comments', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'base', category_order: 15, permission_order: 1, description: 'View discussion threads on tasks and stories.', icon: 'project_access' },
  { id: 'projects.comment.create', label: 'Add Comment', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'base', category_order: 15, permission_order: 2, description: 'Post comments on project tasks and stories.', icon: 'project_access' },
  { id: 'projects.comment.edit', label: 'Edit Own Comment', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'contributor', category_order: 15, permission_order: 3, description: 'Edit own posted comments.', icon: 'project_access' },
  { id: 'projects.comment.delete', label: 'Delete Any Comment', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'management', category_order: 15, permission_order: 4, description: 'Delete any posted comments across project.', icon: 'project_access' },

  { id: 'projects.attachment.view', label: 'View Attachments', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'base', category_order: 15, permission_order: 5, description: 'View files attached to project items.', icon: 'project_access' },
  { id: 'projects.attachment.download', label: 'Download Attachments', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'base', category_order: 15, permission_order: 6, description: 'Download file attachments.', icon: 'project_access' },
  { id: 'projects.attachment.upload', label: 'Upload Attachments', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'base', category_order: 15, permission_order: 7, description: 'Upload document and image attachments to work items.', icon: 'project_access' },
  { id: 'projects.attachment.delete', label: 'Delete Any Attachment', category: 'project_collaboration', category_label: '5. Collaboration', tier: 'management', category_order: 15, permission_order: 8, description: 'Permanently remove file attachments.', icon: 'project_access' },

  // Project Management - 6. Administration (Project Statuses, Reports, Project Settings)
  { id: 'project_statuses:view', label: 'View Project Statuses', category: 'project_administration', category_label: '6. Administration', tier: 'base', category_order: 16, permission_order: 1, description: 'View workflow statuses pool.', icon: 'project_statuses' },
  { id: 'project_statuses:create', label: 'Create Project Status', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 2, description: 'Create new workflow status options.', icon: 'project_statuses' },
  { id: 'project_statuses:update', label: 'Edit Project Status', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 3, description: 'Edit name, color, and behavior settings of statuses.', icon: 'project_statuses' },
  { id: 'project_statuses:delete', label: 'Delete Project Status', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 4, description: 'Permanently remove a status option from the pool.', icon: 'project_statuses' },

  { id: 'projects.reports.view', label: 'View Reports', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 5, description: 'View project analytics and burndown reports.', icon: 'project_access' },
  { id: 'projects.reports.export', label: 'Export Reports', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 6, description: 'Export project report data.', icon: 'project_access' },

  { id: 'projects.settings.view', label: 'View Settings', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 7, description: 'View project configuration settings.', icon: 'settings' },
  { id: 'projects.settings.edit', label: 'Edit Settings', category: 'project_administration', category_label: '6. Administration', tier: 'management', category_order: 16, permission_order: 8, description: 'Modify project workflow and setting configs.', icon: 'settings' },
];

export const MODULES_MAP = {
  general: {
    label: 'General Access',
    ids: ['dashboard', 'audit_logs:view']
  },
  settings: {
    label: 'System Settings',
    ids: [
      'admin:employees',
      'admin:templates',
      'locations:manage',
      'settings:branding',
      'settings:billing'
    ]
  },
  attendance: {
    label: 'Attendance Management',
    addonKey: 'attendance',
    ids: [
      'attendance:staff',
      'attendance:management_portal',
      'attendance:admin',
      'leaves:apply',
      'leaves:approve',
      'leaves:manage',
      'holidays:view',
      'holidays:manage',
      'holidays:rules'
    ]
  },
  project_management: {
    label: 'Project Management',
    addonKey: 'project',
    ids: [
      'projects.overview.view', 'projects:view', 'projects:create', 'projects:update', 'projects:delete',
      'projects.members.view', 'projects.members.manage', 'projects.members.assign', 'projects.members.remove', 'projects:members_manage',
      'projects.backlog.view', 'projects.backlog.create', 'projects.backlog.edit', 'projects.backlog.delete', 'projects.backlog.move', 'projects.backlog.assign',
      'projects.epic.view', 'projects.epic.create', 'projects.epic.edit', 'projects.epic.delete', 'projects.epic.assign',
      'projects.story.view', 'projects.story.create', 'projects.story.edit', 'projects.story.delete', 'projects.story.assign', 'projects.story.status', 'projects.story.move', 'project_stories:view', 'project_stories:create', 'project_stories:update', 'project_stories:delete',
      'projects.task.view', 'projects.task.create', 'projects.task.edit', 'projects.task.delete', 'projects.task.assign', 'projects.task.update_status', 'project_tasks:view_all', 'project_tasks:create', 'project_tasks:update_all', 'project_tasks:delete',
      'projects.subtask.create', 'projects.subtask.edit', 'projects.subtask.delete', 'projects.subtask.complete',
      'projects.my_tasks.view', 'projects.my_tasks.update', 'projects.my_tasks.update_status', 'projects.my_tasks.log_time', 'projects.my_tasks.subtasks', 'project_tasks:view_own', 'project_tasks:update_own', 'projects.task.log_time',
      'projects.sprint.view', 'projects.sprint.create', 'projects.sprint.edit', 'projects.sprint.delete', 'projects.sprint.start', 'projects.sprint.complete', 'projects.sprint.cancel', 'projects.sprint.reopen', 'projects.sprint.move_stories',
      'projects.board.view', 'projects.board.move_cards', 'projects.board.update_status', 'projects.board.manage',
      'projects.comment.view', 'projects.comment.create', 'projects.comment.edit', 'projects.comment.delete',
      'projects.attachment.view', 'projects.attachment.download', 'projects.attachment.upload', 'projects.attachment.delete',
      'project_statuses:view', 'project_statuses:create', 'project_statuses:update', 'project_statuses:delete',
      'projects.reports.view', 'projects.reports.export',
      'projects.settings.view', 'projects.settings.edit'
    ]
  }
};

const mapEmployee = (emp) => {
  if (!emp || typeof emp !== 'object') return null;
  return {
    ...emp,
    id: emp.id != null ? String(emp.id) : '',
  };
};

const mapLocation = (loc) => {
  if (!loc || typeof loc !== 'object') return null;
  return {
    ...loc,
    id: loc.id != null ? String(loc.id) : '',
  };
};

const isAuthDataEqual = (a, b) => {
  if (!a || !b) return false;
  if (
    a.id !== b.id ||
    a.isSuperAdmin !== b.isSuperAdmin ||
    a.designation !== b.designation ||
    a.organization !== b.organization ||
    a.is_active !== b.is_active ||
    a.employment_status !== b.employment_status ||
    a.is_project_enabled !== b.is_project_enabled ||
    a.is_attendance_enabled !== b.is_attendance_enabled
  ) {
    return false;
  }

  const logoA = a.organization_logo || '';
  const logoB = b.organization_logo || '';
  if (logoA !== logoB) return false;

  const subA = a.subscription || {};
  const subB = b.subscription || {};
  if (
    subA.subscriptionStatus !== subB.subscriptionStatus ||
    subA.is_project_enabled !== subB.is_project_enabled ||
    subA.is_attendance_enabled !== subB.is_attendance_enabled
  ) {
    return false;
  }

  const permA = a.permissions || [];
  const permB = b.permissions || [];
  if (permA.length !== permB.length) return false;
  for (let i = 0; i < permA.length; i++) {
    if (permA[i] !== permB[i]) return false;
  }
  return true;
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [officePremises, setOfficePremises] = useState({ lat: 11.1143, lon: 76.2274 });
  const [officeLocations, setOfficeLocations] = useState([]);
  const [brandLogo, setBrandLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState(12);
  const [authStatus, setAuthStatus] = useState('loading');
  const [orgProfileStatus, setOrgProfileStatus] = useState('idle');
  const isInitialized = authStatus !== 'loading';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionsRegistry, setPermissionsRegistry] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '', type: 'info' });

  const showAlert = useCallback((message, title = '', type = 'info') => {
    setAlertModal({ isOpen: true, message, title, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const fetchInitialData = useCallback(async (userObj) => {
    if (!userObj) {
      setOrgProfileStatus('idle');
      return;
    }
    setOrgProfileStatus('loading');
    try {
      const orgId = userObj.organization;
      const orgQuery = orgId ? `?organization=${orgId}` : '';

      const [
        locationsData,
        settingsData,
        permissionsConfigData
      ] = await organizationService.fetchInitialData(orgQuery);

      const locs = Array.isArray(locationsData) ? locationsData : (locationsData?.results || []);
      setOfficeLocations(locs.map(mapLocation).filter(Boolean));

      if (locs.length > 0) {
        const primary = locs.find(loc => loc.isPrimary) || locs[0];
        setOfficePremises({ lat: primary.lat, lon: primary.lon });
      }

      if (settingsData && typeof settingsData === 'object') {
        setBrandLogo(settingsData.brandLogo || null);
        setCompanyName(settingsData.companyName || '');
        if (settingsData.subscriptionDays !== undefined) {
          setSubscriptionDays(settingsData.subscriptionDays);
        }
      }

      if (permissionsConfigData) {
        setPermissionsRegistry(permissionsConfigData);
      }

      setOrgProfileStatus('loaded');
    } catch (e) {
      console.warn('Failed to fetch platform records:', e);
      setOrgProfileStatus('error');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const hasToken = getAccessToken() || getRefreshToken();
    if (!hasToken) {
      setCurrentUser(null);
      setAuthStatus('unauthenticated');
      setOrgProfileStatus('idle');
      return;
    }

    try {
      const user = await authService.fetchMe();
      if (user && user.id) {
        const mappedUser = mapEmployee(user);

        if (!isAuthDataEqual(mappedUser, currentUserRef.current)) {
          setCurrentUser(mappedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
          }
        }

        if (user.subscription && user.subscription.daysRemaining !== subscriptionDaysRef.current) {
          setSubscriptionDays(user.subscription.daysRemaining);
        }
        setAuthStatus('authenticated');
      } else {
        clearTokens();
        setCurrentUser(null);
        setAuthStatus('unauthenticated');
        setOrgProfileStatus('idle');
      }
    } catch (e) {
      if (e && e.status === 401) {
        clearTokens();
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cubelogs_active_user');
        }
        setAuthStatus('unauthenticated');
        setOrgProfileStatus('idle');
      } else {
        console.warn('Background user refresh skipped due to temporary network/server error:', e);
      }
    }
  }, []);

  // Initialize session on mount - checks stored JWT tokens
  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      const hasToken = getAccessToken() || getRefreshToken();
      if (!hasToken) {
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cubelogs_active_user');
        }
        setAuthStatus('unauthenticated');
        setOrgProfileStatus('idle');
        return;
      }

      try {
        const user = await authService.fetchMe();
        if (cancelled) return;
        if (user && user.id) {
          const mappedUser = mapEmployee(user);
          setCurrentUser(mappedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
          }
          await fetchInitialData(mappedUser);
          setAuthStatus('authenticated');
        } else {
          clearTokens();
          setAuthStatus('unauthenticated');
          setOrgProfileStatus('idle');
        }
      } catch (e) {
        if (cancelled) return;

        if (e.status === 401) {
          clearTokens();
          setCurrentUser(null);

          if (typeof window !== 'undefined') {
            localStorage.removeItem('cubelogs_active_user');
          }

          setAuthStatus('unauthenticated');
          setOrgProfileStatus('idle');
          return;
        }

        // Temporary server/network error:
        // don't destroy valid login tokens immediately
        setAuthStatus('unauthenticated');
        setOrgProfileStatus('idle');
      }
    };

    initSession();
    return () => { cancelled = true; };
  }, [fetchInitialData]);

  const currentUserRef = React.useRef(currentUser);
  const subscriptionDaysRef = React.useRef(subscriptionDays);
  const authStatusRef = React.useRef(authStatus);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { subscriptionDaysRef.current = subscriptionDays; }, [subscriptionDays]);
  useEffect(() => { authStatusRef.current = authStatus; }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const performSync = async () => {
      if (document.hidden || document.visibilityState === 'hidden') return;
      if (authStatusRef.current !== 'authenticated') return;
      await refreshUser();
    };

    const handleFocus = () => {
      performSync();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const interval = setInterval(() => {
      performSync();
    }, 300000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [authStatus, refreshUser]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const { user, access, refresh } = data || {};
      if (!user) {
        throw new Error(data?.error || data?.detail || 'Invalid email or password.');
      }
      if (access || refresh) {
        setTokens(access, refresh);
      }
      const mappedUser = mapEmployee(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
      }

      setCurrentUser(mappedUser);
      setAuthStatus('authenticated');
      await fetchInitialData(mappedUser);
      return { success: true, user: mappedUser };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid email or password.' };
    }
  }, [fetchInitialData]);

  const magicLogin = useCallback(async (token) => {
    try {
      const data = await authService.magicLogin(token);
      const { user, access, refresh } = data || {};
      if (!user) {
        throw new Error(data?.error || data?.detail || 'Invalid or expired magic link.');
      }
      if (access || refresh) {
        setTokens(access, refresh);
      }
      const mappedUser = mapEmployee(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedUser));
      }

      setCurrentUser(mappedUser);
      setAuthStatus('authenticated');
      await fetchInitialData(mappedUser);
      return { success: true, user: mappedUser };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired magic link.' };
    }
  }, [fetchInitialData]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
    setOrgProfileStatus('idle');

    if (typeof window !== 'undefined') {
      try {
        await apiLogout();
      } catch (e) {
        // ignore
      }

      localStorage.removeItem('cubelogs_active_user');
    }
}, []);

  const requestPasswordReset = useCallback(async (email) => {
    try {
      const data = await authService.requestPasswordReset(email);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to request password reset.' };
    }
  }, []);

  const validateResetToken = useCallback(async (token) => {
    try {
      const data = await authService.validateResetToken(token);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Invalid or expired token.' };
    }
  }, []);

  const confirmPasswordReset = useCallback(async (token, password, passwordConfirm) => {
    try {
      const data = await authService.confirmPasswordReset(token, password, passwordConfirm);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to reset password.' };
    }
  }, []);

  const saveOfficePremises = useCallback((premises) => {
    setOfficePremises(premises);
  }, []);

  const saveOfficeLocations = useCallback(async (locations) => {
    try {
      const response = await organizationService.fetchLocations();
      const current = Array.isArray(response) ? response : (response?.results || []);
      for (const loc of current) {
        await organizationService.deleteLocation(loc.id);
      }

      const created = [];
      for (const loc of locations) {
        const { id, ...locData } = loc;
        const newLoc = await organizationService.createLocation(locData);
        created.push(mapLocation(newLoc));
      }
      setOfficeLocations(created);
      if (created.length > 0) {
        setOfficePremises({ lat: created[0].lat, lon: created[0].lon });
      }
    } catch (e) {
      console.error('Error saving locations:', e);
      throw e;
    }
  }, []);

  const saveBrandLogo = useCallback(async (logoData) => {
    try {
      const response = await organizationService.saveSettings({ brandLogo: logoData });
      setBrandLogo(response.brandLogo);
    } catch (e) {
      console.error('Error saving brand logo:', e);
    }
  }, []);

  const saveCompanyName = useCallback(async (name) => {
    try {
      const response = await organizationService.saveSettings({ companyName: name });
      setCompanyName(response.companyName);
    } catch (e) {
      console.error('Error saving company name:', e);
      throw e;
    }
  }, []);

  const updateAuthSession = useCallback((user) => {
    const mapped = mapEmployee(user);
    if (typeof window !== 'undefined') {
      if (mapped) {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mapped));
      } else {
        localStorage.removeItem('cubelogs_active_user');
      }
    }
    setCurrentUser(mapped);
  }, []);

  const confirmSubscription = useCallback(async (sessionId) => {
    try {
      const response = await organizationService.confirmSubscription(sessionId);

      const settingsData = await organizationService.fetchSettings();
      setBrandLogo(settingsData.brandLogo);
      setCompanyName(settingsData.companyName || '');
      setSubscriptionDays(settingsData.subscriptionDays);

      const user = await authService.fetchMe();
      updateAuthSession(user);

      return response;
    } catch (e) {
      console.error('Error confirming subscription:', e);
      throw e;
    }
  }, [updateAuthSession]);

  const completeOnboarding = useCallback(async (companyName, logoBase64, lat, lon, defaultWeeklyHolidays = []) => {
    try {
      await organizationService.saveSettings({ 
        brandLogo: logoBase64, 
        companyName,
        default_weekly_holidays: defaultWeeklyHolidays
      });

      await saveOfficeLocations([
        { name: companyName, lat, lon, radius: 100.0, isPrimary: true }
      ]);

      await fetchInitialData(currentUser);
    } catch (e) {
      console.error('Error completing onboarding:', e);
      throw e;
    }
  }, [currentUser, saveOfficeLocations, fetchInitialData]);

  const renewSubscription = useCallback(async (packageName = null) => {
    try {
      const body = { subscriptionDays: 365 };
      if (packageName) {
        body.packageName = packageName;
      }
      const response = await organizationService.saveSettings(body);
      setSubscriptionDays(response.subscriptionDays);

      const user = await authService.fetchMe();
      updateAuthSession(user);
    } catch (e) {
      console.error('Error renewing subscription:', e);
    }
  }, [updateAuthSession]);

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  }, [currentUser]);

  const isFeatureUnlocked = useCallback((feature) => {
    if (!currentUser) return false;
    if (currentUser.subscription && currentUser.subscription.features) {
      return currentUser.subscription.features.includes(feature);
    }
    return currentUser.isSuperAdmin;
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    isInitialized,
    authStatus,
    orgProfileStatus,
    fetchInitialData,
    refreshUser,
    login,
    magicLogin,
    logout,
    requestPasswordReset,
    validateResetToken,
    confirmPasswordReset,
    hasPermission,
    isFeatureUnlocked,
    sidebarOpen,
    setSidebarOpen,
    officePremises,
    saveOfficePremises,
    officeLocations,
    saveOfficeLocations,
    brandLogo,
    saveBrandLogo,
    companyName,
    saveCompanyName,
    subscriptionDays,
    renewSubscription,
    completeOnboarding,
    confirmSubscription,
    alertModal,
    showAlert,
    closeAlert,
    updateAuthSession,
    permissionsRegistry,
  }), [
    currentUser,
    isInitialized,
    authStatus,
    orgProfileStatus,
    fetchInitialData,
    refreshUser,
    login,
    magicLogin,
    logout,
    requestPasswordReset,
    validateResetToken,
    confirmPasswordReset,
    hasPermission,
    isFeatureUnlocked,
    sidebarOpen,
    officePremises,
    saveOfficePremises,
    officeLocations,
    saveOfficeLocations,
    brandLogo,
    saveBrandLogo,
    companyName,
    saveCompanyName,
    subscriptionDays,
    renewSubscription,
    completeOnboarding,
    confirmSubscription,
    alertModal,
    showAlert,
    closeAlert,
    updateAuthSession,
    permissionsRegistry
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <CustomAlertModal />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
