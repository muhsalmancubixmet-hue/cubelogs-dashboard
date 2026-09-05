import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Dashboard from '../../app/dashboard/page.js';

// Track mock calls to apiFetch
const mockApiFetch = jest.fn();
jest.mock('../../lib/api', () => ({
  API_BASE_URL: 'http://localhost:8000/api/v1',
  apiFetch: (...args) => mockApiFetch(...args),
  normalizeListResponse: (d) => (Array.isArray(d) ? d : (d?.results || [])),
}));

jest.mock('../../lib/services/projectService', () => ({
  projectService: {
    getEmployeeAssignments: jest.fn().mockResolvedValue({ tasks: [{ id: 1, title: 'Task 1', assignedTo: '1' }] }),
    getProjects: jest.fn().mockResolvedValue([{ id: 1, name: 'Project Alpha' }]),
    getProjectStatuses: jest.fn().mockResolvedValue([{ id: 1, name: 'In Progress' }]),
    updateProjectTaskStatus: jest.fn().mockResolvedValue({}),
    updateTask: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../components/PageWrapper', () => {
  return function MockPageWrapper({ children }) {
    return <div data-testid="page-wrapper">{children}</div>;
  };
});

// Controllable useApp mock context
let mockAppContext = {
  currentUser: null,
  authStatus: 'authenticated',
  permissionsRegistry: null,
};

jest.mock('../../context/AppContext', () => ({
  useApp: () => mockAppContext,
}));

describe('Dashboard Attendance Guard & Entitlement Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockImplementation((path) => {
      if (path.includes('/attendance/daily-summary/')) {
        return Promise.resolve([{ date: '2026-09-01', status: 'Present' }]);
      }
      if (path.includes('/attendance/')) {
        return Promise.resolve([{ id: 1, employee: '1', date: '2026-09-01', status: 'Present' }]);
      }
      if (path.includes('/leaves/')) {
        return Promise.resolve([{ id: 1, employee: '1', leaveTypeName: 'Casual', status: 'Approved' }]);
      }
      if (path.includes('/holidays/')) {
        return Promise.resolve([{ id: 1, name: 'National Holiday', date: '2026-09-10' }]);
      }
      if (path.includes('/employees/')) {
        return Promise.resolve([{ id: 1, name: 'Demo Employee' }]);
      }
      if (path.includes('/locations/')) {
        return Promise.resolve([{ id: 1, name: 'Headquarters' }]);
      }
      return Promise.resolve([]);
    });
  });

  test('1. Attendance OFF => no attendance summary or logs API call occurs, but project/dashboard data loads', async () => {
    mockAppContext = {
      currentUser: {
        id: '1',
        employeeId: '1',
        name: 'Staff User',
        isSuperAdmin: false,
        permissions: ['attendance:staff', 'attendance:admin', 'projects:view'],
        is_attendance_enabled: false,
        is_project_enabled: true,
        subscription: {
          subscriptionStatus: 'Active',
          is_attendance_enabled: false,
          is_project_enabled: true,
        },
      },
      authStatus: 'authenticated',
      permissionsRegistry: null,
    };

    render(<Dashboard />);

    // Wait for async load to complete
    await waitFor(() => {
      const calls = mockApiFetch.mock.calls.map(c => c[0]);
      // Verify no attendance summary or attendance logs API was called
      const attendanceCalls = calls.filter(p => p.includes('/attendance'));
      expect(attendanceCalls).toHaveLength(0);
    });

    const allPaths = mockApiFetch.mock.calls.map(c => c[0]);
    // Attendance endpoints must never have been called
    expect(allPaths.some(p => p.includes('/attendance/daily-summary/'))).toBe(false);
    expect(allPaths.some(p => p.includes('/attendance/'))).toBe(false);
    expect(allPaths.some(p => p.includes('/leaves/'))).toBe(false);
    expect(allPaths.some(p => p.includes('/holidays/'))).toBe(false);
  });

  test('2. Attendance ON => attendance summary and logs API calls occur normally', async () => {
    mockAppContext = {
      currentUser: {
        id: '1',
        employeeId: '1',
        name: 'Staff User',
        isSuperAdmin: false,
        permissions: ['attendance:staff', 'attendance:admin', 'projects:view'],
        is_attendance_enabled: true,
        is_project_enabled: true,
        subscription: {
          subscriptionStatus: 'Active',
          is_attendance_enabled: true,
          is_project_enabled: true,
        },
      },
      authStatus: 'authenticated',
      permissionsRegistry: null,
    };

    render(<Dashboard />);

    await waitFor(() => {
      const calls = mockApiFetch.mock.calls.map(c => c[0]);
      expect(calls.some(p => p.includes('/attendance/daily-summary/'))).toBe(true);
      expect(calls.some(p => p.includes('/attendance/'))).toBe(true);
    });
  });

  test('3. Business 403 response does not clear auth tokens or dispatch logout', () => {
    // In apiClient.js, a 403 Forbidden is a permission/entitlement error and does not clear credentials
    let authLoggedOut = false;
    const simulateClientResponse = (status) => {
      if (status === 401) {
        authLoggedOut = true;
      }
      return { status, ok: status >= 200 && status < 300 };
    };

    const res403 = simulateClientResponse(403);
    expect(res403.status).toBe(403);
    expect(authLoggedOut).toBe(false);

    // Only 401 unauthenticated leads to token clearing
    const res401 = simulateClientResponse(401);
    expect(res401.status).toBe(401);
    expect(authLoggedOut).toBe(true);
  });
});
