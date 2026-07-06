import React from 'react';

export type LeaveStatus = 'Approved' | 'Rejected' | 'Pending';

export interface LeaveStatusBadgeProps {
  status: LeaveStatus;
  className?: string;
  style?: React.CSSProperties;
}

export const LeaveStatusBadge: React.FC<LeaveStatusBadgeProps> = ({ 
  status, 
  className,
  style
}) => {
  // Define style mappings for each status
  const statusConfig = {
    Approved: {
      backgroundColor: '#ecfdf5', // Light green
      textColor: '#047857',       // Dark green
      dotColor: '#10b981',        // Solid green
      label: 'Approved',
    },
    Rejected: {
      backgroundColor: '#fef2f2', // Light red
      textColor: '#b91c1c',       // Dark red
      dotColor: '#ef4444',        // Solid red
      label: 'Rejected',
    },
    Pending: {
      backgroundColor: '#fffbeb', // Light amber/yellow
      textColor: '#b45309',       // Dark amber
      dotColor: '#f59e0b',        // Solid amber
      label: 'Pending',
    },
  };

  // Fallback configuration if status doesn't match expected types
  const config = statusConfig[status] || statusConfig.Pending;

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '9999px',
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
    fontSize: '0.85rem',
    fontWeight: 600,
    width: 'fit-content',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    userSelect: 'none',
    transition: 'all 0.15s ease-in-out',
    ...style
  };

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: config.dotColor,
    flexShrink: 0,
  };

  return (
    <span style={containerStyle} className={className}>
      <span style={dotStyle} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

export default LeaveStatusBadge;
