import { apiFetch } from '../api/apiClient';

export { employeeService } from './employeeService';
export { attendanceService } from './attendanceService';
export { leaveService } from './leaveService';
export { holidayService } from './holidayService';
export { projectService } from './projectService';
export { auditService } from './auditService';
export { roleService, normalizePermissionRegistry } from './roleService';

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
  async fetchInitialData(orgQuery = '') {
    const locUrl = orgQuery ? `/locations/${orgQuery}` : '/locations/';
    const settingsUrl = orgQuery ? `/settings/current/${orgQuery}` : '/settings/current/';
    return Promise.all([
      apiFetch(locUrl).then(data => Array.isArray(data) ? data : (data?.results || [])).catch(() => []),
      apiFetch(settingsUrl).catch(() => ({})),
      apiFetch(`/permissions/config/?t=${Date.now()}`).catch(() => null),
    ]);
  },
  async fetchLocations() {
    const data = await apiFetch('/locations/');
    return Array.isArray(data) ? data : (data?.results || []);
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
