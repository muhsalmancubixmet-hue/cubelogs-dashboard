import React from 'react';
import {
  CheckIcon,
  DeclineIcon,
  ClockIcon,
  LeavesIcon,
  HolidaysIcon,
  CalendarIcon,
  WarningIcon,
  LocationIcon,
  CameraIcon,
  EditIcon,
  ShieldIcon
} from '../../Icons';

export const ATTENDANCE_STATUS_CONFIG = {
  'Present': {
    label: 'Present',
    shortLabel: 'Present',
    icon: CheckIcon,
    accent: '#22c55e',
    color: '#16a34a',
    bg: '#fafffb',
    iconBg: '#dcfce7',
    border: '#e2e8f0',
    semantic: 'success'
  },
  'Absent': {
    label: 'Absent',
    shortLabel: 'Absent',
    icon: DeclineIcon,
    accent: '#ef4444',
    color: '#dc2626',
    bg: '#fffafa',
    iconBg: '#fef2f2',
    border: '#e2e8f0',
    semantic: 'danger'
  },
  'Late': {
    label: 'Late',
    shortLabel: 'Late',
    icon: ClockIcon,
    accent: '#f59e0b',
    color: '#d97706',
    bg: '#fffdf7',
    iconBg: '#fef3c7',
    border: '#e2e8f0',
    semantic: 'warning'
  },
  'Half Day': {
    label: 'Half Day',
    shortLabel: 'Half',
    icon: ClockIcon,
    accent: '#6366f1',
    color: '#4f46e5',
    bg: '#fafaff',
    iconBg: '#e0e7ff',
    border: '#e2e8f0',
    semantic: 'info'
  },
  'Leave': {
    label: 'Leave',
    shortLabel: 'Leave',
    icon: LeavesIcon,
    accent: '#a855f7',
    color: '#9333ea',
    bg: '#fdfaff',
    iconBg: '#f3e8ff',
    border: '#e2e8f0',
    semantic: 'leave'
  },
  'Holiday': {
    label: 'Holiday',
    shortLabel: 'Holiday',
    icon: HolidaysIcon,
    accent: '#f59e0b',
    color: '#d97706',
    bg: '#fffdf7',
    iconBg: '#fffbeb',
    border: '#e2e8f0',
    semantic: 'holiday'
  },
  'Weekly Off': {
    label: 'Weekly Off',
    shortLabel: 'Off',
    icon: CalendarIcon,
    accent: '#94a3b8',
    color: '#64748b',
    bg: '#f8fafc',
    iconBg: '#f1f5f9',
    border: '#e2e8f0',
    semantic: 'muted'
  },
  'In Progress': {
    label: 'In Progress',
    shortLabel: 'Active',
    icon: ClockIcon,
    accent: '#0284c7',
    color: '#0369a1',
    bg: '#f8fcff',
    iconBg: '#e0f2fe',
    border: '#e2e8f0',
    semantic: 'info'
  },
  'Incomplete': {
    label: 'Incomplete',
    shortLabel: 'Review',
    icon: WarningIcon,
    accent: '#f97316',
    color: '#ea580c',
    bg: '#fffaf7',
    iconBg: '#ffedd5',
    border: '#e2e8f0',
    semantic: 'warning'
  },
  'Upcoming': {
    label: 'Upcoming',
    shortLabel: '',
    icon: CalendarIcon,
    accent: 'transparent',
    color: '#64748b',
    bg: '#ffffff',
    iconBg: 'transparent',
    border: '#e2e8f0',
    semantic: 'muted'
  },
  'Not Started': {
    label: 'Pending',
    shortLabel: 'Pending',
    icon: ClockIcon,
    accent: '#64748b',
    color: '#475569',
    bg: '#fafbfc',
    iconBg: '#f1f5f9',
    border: '#e2e8f0',
    semantic: 'muted'
  },
  'Not Employed': {
    label: 'Not Employed',
    shortLabel: 'N/A',
    icon: CalendarIcon,
    accent: '#cbd5e1',
    color: '#94a3b8',
    bg: '#f8fafc',
    iconBg: '#f1f5f9',
    border: '#e2e8f0',
    semantic: 'muted'
  }
};

export const VERIFICATION_ICONS = {
  Location: LocationIcon,
  Camera: CameraIcon,
  Override: EditIcon,
  Lock: ShieldIcon
};

/**
 * Safely formats worked duration in minutes or seconds to "Xh Ym" string.
 * Defends against null, undefined, NaN, and invalid inputs.
 */
export function formatWorkedDuration(val) {
  if (val === null || val === undefined || val === '') return '—';
  
  let totalMinutes = 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return '—';
    totalMinutes = val;
  } else if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return '—';
    // If input is large (>1440), assume it's seconds (from log.totalDuration)
    if (parsed > 1440) {
      totalMinutes = Math.floor(parsed / 60);
    } else {
      totalMinutes = parsed;
    }
  } else {
    return '—';
  }

  if (totalMinutes <= 0) return '—';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export function getAttendanceStatusConfig(status) {
  if (!status) return ATTENDANCE_STATUS_CONFIG['Upcoming'];
  
  const normalized = String(status).trim();
  if (ATTENDANCE_STATUS_CONFIG[normalized]) {
    return ATTENDANCE_STATUS_CONFIG[normalized];
  }
  
  // Partial matches
  if (normalized.includes('Upcoming') || normalized.includes('Future')) return ATTENDANCE_STATUS_CONFIG['Upcoming'];
  if (normalized.includes('Not Started') || normalized.includes('Pending')) return ATTENDANCE_STATUS_CONFIG['Not Started'];
  if (normalized.includes('Leave')) return ATTENDANCE_STATUS_CONFIG['Leave'];
  if (normalized.includes('Holiday')) return ATTENDANCE_STATUS_CONFIG['Holiday'];
  if (normalized.includes('Off')) return ATTENDANCE_STATUS_CONFIG['Weekly Off'];
  if (normalized.includes('Half')) return ATTENDANCE_STATUS_CONFIG['Half Day'];
  if (normalized.includes('Present')) return ATTENDANCE_STATUS_CONFIG['Present'];
  if (normalized.includes('Late')) return ATTENDANCE_STATUS_CONFIG['Late'];
  if (normalized.includes('Progress')) return ATTENDANCE_STATUS_CONFIG['In Progress'];
  if (normalized.includes('Incomplete')) return ATTENDANCE_STATUS_CONFIG['Incomplete'];

  return ATTENDANCE_STATUS_CONFIG['Upcoming'];
}
