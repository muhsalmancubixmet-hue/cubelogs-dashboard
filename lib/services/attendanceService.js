import { apiFetch } from '../api/apiClient';

export const attendanceService = {
  async fetchLogs(query = '') {
    const endpoint = query ? `/attendance/${query}` : '/attendance/';
    return apiFetch(endpoint);
  },
  async clockIn(data) {
    return apiFetch('/attendance/', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in', ...data }),
    });
  },
  async clockOut(data) {
    return apiFetch('/attendance/', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_out', ...data }),
    });
  },
  async fetchRules() {
    return apiFetch('/attendance/admin/rules/');
  },
  async saveRules(rulesData) {
    return apiFetch('/attendance/admin/rules/', {
      method: 'POST',
      body: JSON.stringify(rulesData),
    });
  },
  async fetchVerifiers() {
    return apiFetch('/attendance/verifiers/');
  },
  async saveVerifier(verifierData) {
    return apiFetch('/attendance/verifiers/', {
      method: 'POST',
      body: JSON.stringify(verifierData),
    });
  },
  async deleteVerifier(id) {
    return apiFetch(`/attendance/verifiers/${id}/`, {
      method: 'DELETE',
    });
  },
};
