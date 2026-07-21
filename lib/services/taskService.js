import { apiFetch } from '../api/apiClient';

export const taskService = {
  async fetchTasks(query = '') {
    const endpoint = query ? `/tasks/${query}` : '/tasks/';
    return apiFetch(endpoint);
  },
  async createTask(data) {
    return apiFetch('/tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateTaskStatus(id, status) {
    return apiFetch(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  async deleteTask(id) {
    return apiFetch(`/tasks/${id}/`, {
      method: 'DELETE',
    });
  },
};
