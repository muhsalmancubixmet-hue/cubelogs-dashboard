// lib/api/tokenStorage.js

const ACCESS_TOKEN_KEY = 'cubelogs_access_token';
const REFRESH_TOKEN_KEY = 'cubelogs_refresh_token';
const ACTIVE_ORG_KEY = 'cubelogs_active_org_id';

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getActiveOrgId = () => {
  if (typeof window === 'undefined') return null;
  const explicit = localStorage.getItem(ACTIVE_ORG_KEY);
  if (explicit && explicit !== 'undefined' && explicit !== 'null') return explicit;
  try {
    const raw = localStorage.getItem('cubelogs_active_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      const orgId = parsed?.active_organization?.id ?? parsed?.organization ?? parsed?.active_membership?.organization_id;
      if (orgId != null && orgId !== '' && orgId !== 'undefined' && orgId !== 'null') {
        return String(orgId);
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return null;
};

export const setActiveOrgId = (orgId) => {
  if (typeof window === 'undefined') return;
  if (orgId != null && orgId !== '' && orgId !== 'undefined' && orgId !== 'null') {
    localStorage.setItem(ACTIVE_ORG_KEY, String(orgId));
  } else {
    localStorage.removeItem(ACTIVE_ORG_KEY);
  }
};

export const setTokens = (access, refresh) => {
  if (typeof window === 'undefined') return;

  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_ORG_KEY);
};