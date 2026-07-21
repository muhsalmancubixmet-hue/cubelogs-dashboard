import { apiFetch } from '../api/apiClient';

export const auditService = {
  async fetchAuditLogs(query = '') {
    const endpoint = query ? `/audit-logs/${query}` : '/audit-logs/';
    return apiFetch(endpoint);
  },
};
