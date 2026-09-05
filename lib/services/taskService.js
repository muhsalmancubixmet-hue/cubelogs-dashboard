import { apiFetch } from '../api/apiClient';

export const taskService = {
  async fetchTasks(query = '') {
    const endpoint = query ? `/project-tasks/${query}` : '/project-tasks/';
    return apiFetch(endpoint);
  },
  async createTask(data) {
    return apiFetch('/project-tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateTaskStatus(id, status) {
    return apiFetch(`/project-tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  async deleteTask(id) {
    return apiFetch(`/project-tasks/${id}/`, {
      method: 'DELETE',
    });
  },
};
