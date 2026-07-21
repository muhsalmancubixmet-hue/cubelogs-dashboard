import { apiFetch } from '../api/apiClient';

export const leaveService = {
  async fetchLeaves(query = '') {
    const endpoint = query ? `/leaves/${query}` : '/leaves/';
    return apiFetch(endpoint);
  },
  async applyLeave(leaveData) {
    return apiFetch('/leaves/', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  },
  async approveLeave(id, reason = '') {
    return apiFetch(`/leaves/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  async rejectLeave(id, reason = '') {
    return apiFetch(`/leaves/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  async fetchLeaveTypes() {
    return apiFetch('/leaves/types/');
  },
  async saveLeaveType(typeData) {
    return apiFetch('/leaves/types/', {
      method: 'POST',
      body: JSON.stringify(typeData),
    });
  },
  async updateLeaveType(id, typeData) {
    return apiFetch(`/leaves/types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(typeData),
    });
  },
  async deleteLeaveType(id) {
    return apiFetch(`/leaves/types/${id}/`, {
      method: 'DELETE',
    });
  },
};
