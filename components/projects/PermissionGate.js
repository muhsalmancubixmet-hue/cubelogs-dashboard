import React from 'react';

/**
 * PermissionGate Component
 * Conditionally renders children if condition/capability evaluates to true.
 * Used for UI action gating (buttons, controls, management sections).
 * Backend still enforces authoritative security.
 */
export default function PermissionGate({ condition, fallback = null, children }) {
  if (!condition) {
    return fallback;
  }
  return <>{children}</>;
}
