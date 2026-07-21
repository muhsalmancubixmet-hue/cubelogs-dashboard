import { apiFetch } from '../api/apiClient';

export { employeeService } from './employeeService';
export { attendanceService } from './attendanceService';
export { leaveService } from './leaveService';
export { holidayService } from './holidayService';
export { taskService } from './taskService';
export { auditService } from './auditService';

export const authService = {
  async fetchMe() {
    return apiFetch('/auth/me/');
  },
  async login(email, password) {
    return apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  async magicLogin(token) {
    return apiFetch('/auth/magic-login/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  async requestPasswordReset(email) {
    return apiFetch('/auth/password-reset/request/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async validateResetToken(token) {
    return apiFetch('/auth/password-reset/validate/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  async confirmPasswordReset(token, password, passwordConfirm) {
    return apiFetch('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password, passwordConfirm }),
    });
  }
};

export const organizationService = {
  async fetchInitialData(orgQuery) {
    return Promise.all([
      apiFetch(`/locations/${orgQuery}`),
      apiFetch(`/settings/current/${orgQuery}`),
      apiFetch(`/permissions/config/?t=${Date.now()}`),
    ]);
  },
  async fetchLocations() {
    return apiFetch('/locations/');
  },
  async deleteLocation(id) {
    return apiFetch(`/locations/${id}/`, { method: 'DELETE' });
  },
  async createLocation(locData) {
    return apiFetch('/locations/', {
      method: 'POST',
      body: JSON.stringify(locData),
    });
  },
  async saveSettings(body) {
    return apiFetch('/settings/current/', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  async fetchSettings() {
    return apiFetch('/settings/current/');
  },
  async confirmSubscription(sessionId) {
    return apiFetch('/subscription/confirm/', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }
};
