import { apiFetch } from '../api/apiClient';

/**
 * Safely unpacks API responses into a clean array regardless of pagination or wrapping.
 */
export function normalizePermissionRegistry(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.permissions)) return response.permissions;
  if (Array.isArray(response.modules)) {
    const extracted = [];
    response.modules.forEach(mod => {
      if (Array.isArray(mod.functional_capabilities)) {
        mod.functional_capabilities.forEach(cap => {
          extracted.push({
            key: cap.id,
            name: cap.name || cap.label || cap.id,
            category_label: mod.metadata?.name || mod.id,
            description: cap.description || ''
          });
        });
      }
    });
    return extracted;
  }
  return [];
}

export const roleService = {
  async getPermissionFlags() {
    try {
      const response = await apiFetch('/permissions-flags/');
      return normalizePermissionRegistry(response);
    } catch (e) {
      console.warn('Failed to fetch permissions-flags from server, returning empty registry.', e);
      return [];
    }
  },

  async getRoles(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.type) query.append('type', params.type);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await apiFetch(`/roles/${queryString}`);
    return Array.isArray(response) ? response : (response?.results || []);
  },

  async getRole(id) {
    return apiFetch(`/roles/${id}/`);
  },

  async createRole(data) {
    return apiFetch('/roles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRole(id, data) {
    return apiFetch(`/roles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteRole(id) {
    return apiFetch(`/roles/${id}/`, {
      method: 'DELETE',
    });
  },

  async duplicateRole(id, name, label) {
    return apiFetch(`/roles/${id}/duplicate/`, {
      method: 'POST',
      body: JSON.stringify({ name, label }),
    });
  }
};
