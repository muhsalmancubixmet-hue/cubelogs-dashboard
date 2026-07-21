import { apiFetch } from '../api/apiClient';

export const employeeService = {
  async fetchEmployees() {
    return apiFetch('/employees/');
  },
  async fetchEmployee(id) {
    return apiFetch(`/employees/${id}/`);
  },
  async createEmployee(data) {
    return apiFetch('/employees/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateEmployee(id, data) {
    return apiFetch(`/employees/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteEmployee(id) {
    return apiFetch(`/employees/${id}/`, {
      method: 'DELETE',
    });
  },
};
