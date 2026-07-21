import { apiFetch } from '../api/apiClient';

export const holidayService = {
  async fetchHolidays(query = '') {
    const endpoint = query ? `/holidays/${query}` : '/holidays/';
    return apiFetch(endpoint);
  },
  async createHoliday(data) {
    return apiFetch('/holidays/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateHoliday(id, data) {
    return apiFetch(`/holidays/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteHoliday(id) {
    return apiFetch(`/holidays/${id}/`, {
      method: 'DELETE',
    });
  },
};
