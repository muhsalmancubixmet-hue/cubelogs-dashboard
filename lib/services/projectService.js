import { apiFetch } from '../api/apiClient';

export const projectService = {
  // ─── Projects ──────────────────────────────────────────────────────────────
  async getProjects() {
    const data = await apiFetch('/v1/projects/');
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async getProject(id) {
    return apiFetch(`/v1/projects/${id}/`);
  },
  async getProjectOverview(id) {
    return apiFetch(`/v1/projects/${id}/overview/`);
  },
  async createProject(data) {
    return apiFetch('/v1/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateProject(id, data) {
    return apiFetch(`/v1/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteProject(id) {
    return apiFetch(`/v1/projects/${id}/`, {
      method: 'DELETE',
    });
  },
  async getProjectEmployees(projectId) {
    const data = await apiFetch(`/v1/projects/${projectId}/employees/`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async getEligibleEmployees(projectId) {
    const data = await apiFetch(`/v1/projects/${projectId}/eligible-employees/`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async getEligibleProjectEmployees(projectId) {
    const data = await apiFetch(`/v1/projects/${projectId}/eligible-employees/`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async getEligibleStoryMembers(projectId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const data = await apiFetch(`/v1/projects/${projectId}/eligible-story-members/${queryString}`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async getCompanyEligibleEmployees() {
    try {
      const data = await apiFetch('/v1/projects/eligible-members/');
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (e) {
      const data = await apiFetch('/employees/');
      return Array.isArray(data) ? data : (data?.results || []);
    }
  },
  async getProjectMembers(projectId) {
    const data = await apiFetch(`/v1/projects/${projectId}/members/`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async addProjectMember(projectId, data) {
    return apiFetch(`/v1/projects/${projectId}/members/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateProjectMember(projectId, memberId, data) {
    return apiFetch(`/v1/projects/${projectId}/members/${memberId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async removeProjectMember(projectId, memberId) {
    return apiFetch(`/v1/projects/${projectId}/members/${memberId}/`, {
      method: 'DELETE',
    });
  },

  // ─── Status Options ─────────────────────────────────────────────────────────
  async getProjectStatuses() {
    const data = await apiFetch('/v1/project-statuses/');
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async createProjectStatus(data) {
    return apiFetch('/v1/project-statuses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateProjectStatus(id, data) {
    return apiFetch(`/v1/project-statuses/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteProjectStatus(id) {
    return apiFetch(`/v1/project-statuses/${id}/`, {
      method: 'DELETE',
    });
  },

  // ─── Epics ──────────────────────────────────────────────────────────────────
  async getEpics(projectId) {
    const data = await apiFetch(`/v1/epics/?project_id=${projectId}`);
    return Array.isArray(data) ? data : (data?.results || []);
  },
  async createEpic(param1, param2) {
    let payload = param2;
    if (typeof param1 === 'object') {
      payload = param1;
    } else {
      payload = { ...param2, project: Number(param1) };
    }
    return apiFetch('/v1/epics/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateEpic(id, data) {
    return apiFetch(`/v1/epics/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteEpic(id) {
    return apiFetch(`/v1/epics/${id}/`, {
      method: 'DELETE',
    });
  },

  // ─── Sprints ────────────────────────────────────────────────────────────────
  async getSprints(projectId) {
    return apiFetch(`/v1/project-sprints/?project_id=${projectId}`);
  },
  async getProjectSprints(projectId) {
    return this.getSprints(projectId);
  },
  async createSprint(data) {
    return apiFetch('/v1/project-sprints/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateSprint(sprintId, data) {
    return apiFetch(`/v1/project-sprints/${sprintId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteSprint(sprintId) {
    return apiFetch(`/v1/project-sprints/${sprintId}/`, {
      method: 'DELETE',
    });
  },
  async startSprint(sprintId) {
    return apiFetch(`/v1/project-sprints/${sprintId}/start/`, {
      method: 'POST',
    });
  },
  async completeSprint(sprintId, moveUncompletedToSprintId = null) {
    return apiFetch(`/v1/project-sprints/${sprintId}/complete/`, {
      method: 'POST',
      body: JSON.stringify({ move_uncompleted_to_sprint_id: moveUncompletedToSprintId }),
    });
  },
  async cancelSprint(sprintId, data = {}) {
    return apiFetch(`/v1/project-sprints/${sprintId}/cancel/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async reopenSprint(sprintId) {
    return apiFetch(`/v1/project-sprints/${sprintId}/reopen/`, {
      method: 'POST',
    });
  },
  async addStoriesToSprint(sprintId, storyIds) {
    return apiFetch(`/v1/project-sprints/${sprintId}/add-stories/`, {
      method: 'POST',
      body: JSON.stringify({ story_ids: storyIds }),
    });
  },
  async removeStoryFromSprint(sprintId, storyId) {
    return apiFetch(`/v1/project-sprints/${sprintId}/remove-story/`, {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
  },
  async getBurndownData(sprintId) {
    return apiFetch(`/v1/project-sprints/${sprintId}/burndown/`);
  },

  // ─── Backlog, Board & Analytics ─────────────────────────────────────────────
  async getBacklog(projectId) {
    return apiFetch(`/v1/projects/${projectId}/backlog/`);
  },
  async getBoardData(projectId, sprintId = null) {
    const url = sprintId
      ? `/v1/projects/${projectId}/board/?sprint_id=${sprintId}`
      : `/v1/projects/${projectId}/board/`;
    return apiFetch(url);
  },
  async getVelocityData(projectId) {
    return apiFetch(`/v1/projects/${projectId}/velocity/`);
  },

  // ─── Stories ────────────────────────────────────────────────────────────────
  async getProjectStories(projectId) {
    return apiFetch(`/v1/stories/?project_id=${projectId}`);
  },
  async createProjectStory(data) {
    return apiFetch('/v1/stories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getStory(storyId) {
    return apiFetch(`/v1/stories/${storyId}/`);
  },
  async updateStory(storyId, data) {
    return this.updateProjectStory(storyId, data);
  },
  async deleteStory(storyId) {
    return this.deleteProjectStory(storyId);
  },
  async updateProjectStory(storyId, data) {
    return apiFetch(`/v1/stories/${storyId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteProjectStory(storyId) {
    return apiFetch(`/v1/stories/${storyId}/`, {
      method: 'DELETE',
    });
  },
  async moveStorySprint(storyId, sprintId) {
    return apiFetch(`/v1/stories/${storyId}/move-sprint/`, {
      method: 'POST',
      body: JSON.stringify({ sprint_id: sprintId }),
    });
  },

  // ─── Story Members ──────────────────────────────────────────────────────────
  async getStoryMembers(storyId) {
    return apiFetch(`/v1/stories/${storyId}/members/`);
  },
  async addStoryMember(storyId, memberId) {
    return apiFetch(`/v1/stories/${storyId}/members/`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    });
  },
  async removeStoryMember(storyId, storyMemberId) {
    return apiFetch(`/v1/stories/${storyId}/members/${storyMemberId}/`, {
      method: 'DELETE',
    });
  },

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  async getProjectTasks(projectIdOrParams = {}, params = {}) {
    let queryParams = {};
    if (typeof projectIdOrParams === 'object' && projectIdOrParams !== null) {
      queryParams = { ...projectIdOrParams, ...params };
    } else if (projectIdOrParams) {
      queryParams = { project_id: projectIdOrParams, ...params };
    }

    const query = new URLSearchParams();
    if (queryParams.story_id) query.append('story_id', queryParams.story_id);
    if (queryParams.project_id) query.append('project_id', queryParams.project_id);
    if (queryParams.assigned_to) query.append('assigned_to', queryParams.assigned_to);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/v1/project-tasks/${queryString}`);
  },

  async getMyTasks(projectIdOrParams = {}, params = {}) {
    let queryParams = {};
    if (typeof projectIdOrParams === 'object' && projectIdOrParams !== null) {
      queryParams = { ...projectIdOrParams, assigned_to: 'me' };
    } else if (projectIdOrParams) {
      queryParams = { project_id: projectIdOrParams, assigned_to: 'me', ...params };
    } else {
      queryParams = { assigned_to: 'me' };
    }
    return this.getProjectTasks(queryParams);
  },
  async getStoryTasks(storyId) {
    return this.getProjectTasks({ story_id: storyId });
  },
  async getTask(taskId) {
    return apiFetch(`/v1/project-tasks/${taskId}/`);
  },
  async getProjectTask(taskId) {
    return this.getTask(taskId);
  },
  async createProjectTask(param1, param2) {
    let payload = param2;
    if (typeof param1 === 'object' && param1 !== null) {
      payload = param1;
    } else {
      payload = { ...(param2 || {}), story: Number(param1) };
    }
    return apiFetch('/v1/project-tasks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateTask(taskId, data) {
    return this.updateProjectTask(taskId, data);
  },
  async updateProjectTask(taskId, data) {
    return apiFetch(`/v1/project-tasks/${taskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteTask(taskId) {
    return this.deleteProjectTask(taskId);
  },
  async deleteProjectTask(taskId) {
    return apiFetch(`/v1/project-tasks/${taskId}/`, {
      method: 'DELETE',
    });
  },
  async updateProjectTaskStatus(taskId, statusId) {
    return apiFetch(`/v1/project-tasks/${taskId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: statusId }),
    });
  },

  // ─── Subtasks ───────────────────────────────────────────────────────────────
  async getSubtasks(taskId) {
    return apiFetch(`/v1/subtasks/?task_id=${taskId}`);
  },
  async createSubtask(data) {
    return apiFetch('/v1/subtasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateSubtask(subtaskId, data) {
    return apiFetch(`/v1/subtasks/${subtaskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async updateSubtaskStatus(subtaskId, isCompleted) {
    return this.updateSubtask(subtaskId, { is_completed: isCompleted });
  },
  async toggleSubtask(subtaskId, currentStatus = false) {
    return this.updateSubtaskStatus(subtaskId, !currentStatus);
  },
  async deleteSubtask(subtaskId) {
    return apiFetch(`/v1/subtasks/${subtaskId}/`, {
      method: 'DELETE',
    });
  },

  // ─── Comments & Attachments ─────────────────────────────────────────────────
  async getComments(params) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/v1/comments/?${query}`);
  },
  async createComment(data) {
    return apiFetch('/v1/comments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getAttachments(params) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/v1/attachments/?${query}`);
  },
  async uploadAttachment(payload, options = {}) {
    let formData;
    if (payload instanceof FormData) {
      formData = payload;
    } else {
      formData = new FormData();
      if (payload.file) formData.append('file', payload.file);
      if (payload.story || payload.storyId) formData.append('story', payload.story || payload.storyId);
      if (payload.task || payload.taskId) formData.append('task', payload.task || payload.taskId);
      if (payload.draft_token) formData.append('draft_token', payload.draft_token);
      if (payload.draftToken) formData.append('draft_token', payload.draftToken);
      if (payload.is_temporary !== undefined) formData.append('is_temporary', payload.is_temporary);
    }
    return apiFetch('/v1/attachments/', {
      method: 'POST',
      body: formData,
      ...options,
    });
  },
  async uploadTaskAttachment(taskId, file) {
    return this.uploadAttachment({ task: taskId, file });
  },
  async uploadStoryAttachment(storyId, file) {
    return this.uploadAttachment({ story: storyId, file });
  },
  async deleteAttachment(attachmentId) {
    return apiFetch(`/v1/attachments/${attachmentId}/`, {
      method: 'DELETE',
    });
  },

  // ─── Employee Assignments ──────────────────────────────────────────────────
  async getEmployeeAssignments(employeeId) {
    return apiFetch(`/v1/employee-assignments/${employeeId}/`);
  },


  // ─── Project Analytics ───────────────────────────────────────────────────────
  async getVelocityData(projectId) {
    return apiFetch(`/v1/projects/${projectId}/velocity/`);
  },
  async getBacklog(projectId) {
    return apiFetch(`/v1/projects/${projectId}/backlog/`);
  },

  // ─── Retrospectives ────────────────────────────────────────────────────────
  async getRetrospectives(projectId, sprintId = null) {
    let url = `/v1/retrospectives/?project_id=${projectId}`;
    if (sprintId) url += `&sprint_id=${sprintId}`;
    return apiFetch(url);
  },
  async createRetrospective(data) {
    return apiFetch('/v1/retrospectives/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async addRetroItem(retroId, data) {
    return apiFetch(`/v1/retrospectives/${retroId}/add-item/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async voteRetroItem(itemId) {
    return apiFetch('/v1/retrospectives/vote/', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId }),
    });
  },
  async convertRetroItemToStory(itemId) {
    return apiFetch('/v1/retrospectives/convert-to-story/', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId }),
    });
  },
  async closeRetrospective(retroId) {
    return apiFetch(`/v1/retrospectives/${retroId}/close/`, {
      method: 'POST',
    });
  },
};


