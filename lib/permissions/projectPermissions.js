/**
 * Expanded Canonical Project Capability Helpers
 * Maps fine-grained capability permission keys (both dot notation e.g. 'projects.story.create'
 * and colon notation e.g. 'project_stories:create') for complete role-independent access control.
 */

export function getProjectCapabilities(user, userRole, permissions = []) {
  const permList = Array.isArray(permissions) ? permissions : [];
  const isSuper = Boolean(user?.is_superuser || user?.isSuperAdmin);

  // Helper checking if user holds ANY of the specified permission keys or is superuser
  const hasPerm = (...permKeys) => {
    if (isSuper) return true;
    return permKeys.some(key => permList.includes(key));
  };

  const role = (userRole || 'DEVELOPER').toUpperCase();
  const isManagementRole = isSuper || ['ADMIN', 'PROJECT_MANAGER', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role);
  const isTeamLead = isManagementRole || ['TEAM_LEAD', 'LEAD'].includes(role);
  const isDeveloperOrQA = isTeamLead || ['DEVELOPER', 'QA', 'MEMBER', 'EMPLOYEE', 'CONTRIBUTOR'].includes(role);

  return {
    // Project Overview
    canViewOverview: true,
    canEditProject: isSuper || isManagementRole || hasPerm('projects.settings.edit', 'projects:update'),
    canDeleteProject: isSuper || role === 'ADMIN' || hasPerm('projects:delete'),

    // Backlog
    canViewBacklog: true,
    canCreateBacklogStory: isSuper || isTeamLead || hasPerm('projects.backlog.create', 'project_stories:create'),
    canEditBacklogStory: isSuper || isTeamLead || hasPerm('projects.backlog.edit', 'project_stories:update'),
    canDeleteBacklogStory: isSuper || isManagementRole || hasPerm('projects.backlog.delete', 'project_stories:delete'),
    canMoveBacklogStory: isSuper || isTeamLead || hasPerm('projects.backlog.move', 'projects:update'),
    canAssignBacklogStory: isSuper || isTeamLead || hasPerm('projects.backlog.assign', 'projects:members_manage'),

    // Epics
    canViewEpics: true,
    canCreateEpic: isSuper || isTeamLead || hasPerm('projects.epic.create', 'project_epics:create'),
    canEditEpic: isSuper || isTeamLead || hasPerm('projects.epic.edit', 'project_epics:update'),
    canDeleteEpic: isSuper || isManagementRole || hasPerm('projects.epic.delete', 'project_epics:delete'),
    canAssignStoryToEpic: isSuper || isTeamLead || hasPerm('projects.epic.assign', 'project_epics:update'),

    // Stories
    canViewStories: true,
    canCreateStory: isSuper || isTeamLead || hasPerm('projects.story.create', 'project_stories:create'),
    canEditStory: isSuper || isTeamLead || hasPerm('projects.story.edit', 'project_stories:update'),
    canDeleteStory: isSuper || isManagementRole || hasPerm('projects.story.delete', 'project_stories:delete'),
    canAssignStory: isSuper || isTeamLead || hasPerm('projects.story.assign', 'projects:members_manage'),
    canChangeStoryStatus: isSuper || isTeamLead || hasPerm('projects.story.status', 'project_stories:update'),
    canMoveStory: isSuper || isTeamLead || hasPerm('projects.story.move', 'project_stories:update'),

    // Tasks
    canViewTasks: true,
    canCreateTask: isSuper || isTeamLead || hasPerm('projects.task.create', 'project_tasks:create'),
    canEditTask: isSuper || isTeamLead || hasPerm('projects.task.edit', 'project_tasks:update_all'),
    canDeleteTask: isSuper || isManagementRole || hasPerm('projects.task.delete', 'project_tasks:delete'),
    canAssignTask: isSuper || isTeamLead || hasPerm('projects.task.assign', 'project_tasks:create'),
    canUpdateTaskStatus: isSuper || isDeveloperOrQA || hasPerm('projects.task.update_status', 'project_tasks:update_own'),
    canLogTime: isSuper || isDeveloperOrQA || hasPerm('projects.task.log_time'),

    // My Tasks
    canViewMyTasks: true,
    canUpdateMyTasks: isSuper || isDeveloperOrQA || hasPerm('projects.my_tasks.update'),
    canUpdateMyTaskStatus: isSuper || isDeveloperOrQA || hasPerm('projects.my_tasks.update_status', 'project_tasks:update_own'),
    canLogMyTime: isSuper || isDeveloperOrQA || hasPerm('projects.my_tasks.log_time'),
    canManageMySubtasks: isSuper || isDeveloperOrQA || hasPerm('projects.my_tasks.subtasks'),

    // Subtasks
    canCreateSubtask: isSuper || isDeveloperOrQA || hasPerm('projects.subtask.create', 'project_tasks:create'),
    canEditSubtask: isSuper || isDeveloperOrQA || hasPerm('projects.subtask.edit', 'project_tasks:update_own'),
    canDeleteSubtask: isSuper || isManagementRole || hasPerm('projects.subtask.delete', 'project_tasks:delete'),
    canCompleteSubtask: isSuper || isDeveloperOrQA || hasPerm('projects.subtask.complete'),

    // Sprints
    canViewSprints: true,
    canCreateSprint: isSuper || isTeamLead || hasPerm('projects.sprint.create', 'project_sprints:create'),
    canEditSprint: isSuper || isTeamLead || hasPerm('projects.sprint.edit', 'project_sprints:update'),
    canDeleteSprint: isSuper || isManagementRole || hasPerm('projects.sprint.delete', 'project_sprints:delete'),
    canStartSprint: isSuper || isTeamLead || hasPerm('projects.sprint.start', 'project_sprints:manage'),
    canCompleteSprint: isSuper || isTeamLead || hasPerm('projects.sprint.complete', 'project_sprints:manage'),
    canCancelSprint: isSuper || isManagementRole || hasPerm('projects.sprint.cancel', 'project_sprints:manage'),
    canReopenSprint: isSuper || isTeamLead || hasPerm('projects.sprint.reopen', 'project_sprints:manage'),
    canMoveSprintStories: isSuper || isTeamLead || hasPerm('projects.sprint.move_stories', 'project_sprints:manage'),

    // Board
    canViewBoard: true,
    canMoveCards: isSuper || isDeveloperOrQA || hasPerm('projects.board.move_cards'),
    canUpdateCardStatus: isSuper || isDeveloperOrQA || hasPerm('projects.board.update_status'),
    canManageBoard: isSuper || isManagementRole || hasPerm('projects.board.manage', 'projects:update'),

    // Project Members
    canViewMembers: true,
    canManageMembers: isSuper || isManagementRole || hasPerm('projects.members.manage', 'projects:members_manage'),
    canAssignMembers: isSuper || isTeamLead || hasPerm('projects.members.assign', 'projects:members_manage'),
    canRemoveMembers: isSuper || isManagementRole || hasPerm('projects.members.remove', 'projects:members_manage'),

    // Comments & Attachments
    canViewComments: true,
    canAddComment: isSuper || isDeveloperOrQA || hasPerm('projects.comment.create'),
    canEditComment: isSuper || isDeveloperOrQA || hasPerm('projects.comment.edit'),
    canDeleteComment: isSuper || isManagementRole || hasPerm('projects.comment.delete'),

    canViewAttachments: true,
    canUploadAttachment: isSuper || isDeveloperOrQA || hasPerm('projects.attachment.upload'),
    canDeleteAttachment: isSuper || isManagementRole || hasPerm('projects.attachment.delete'),

    // Reports & Settings
    canViewReports: isSuper || isManagementRole || hasPerm('projects.reports.view', 'projects:view'),
    canExportReports: isSuper || isManagementRole || hasPerm('projects.reports.export', 'projects:view'),
    canViewSettings: isSuper || isManagementRole || hasPerm('projects.settings.view', 'projects:update'),
    canEditSettings: isSuper || isManagementRole || hasPerm('projects.settings.edit', 'projects:update'),

    // Retrospective
    canViewRetro: true,
    canCreateRetro: isSuper || isDeveloperOrQA || hasPerm('projects.retrospective.create', 'projects.retrospective.view'),
    canManageRetro: isSuper || isTeamLead || hasPerm('projects.retrospective.close', 'projects.retrospective.edit'),
  };
}
