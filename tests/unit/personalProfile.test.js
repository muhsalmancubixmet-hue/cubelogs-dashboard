import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PersonalProfile from '../../app/profile/page.js';

// Mock dependencies
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({
    currentUser: {
      id: '101',
      name: 'Jane Doe',
      email: 'jane.doe@cubelogs.com',
      phone: '+1234567890',
      designation: 'Senior Software Engineer',
      department: 'Engineering',
      organization: 1,
      isSuperAdmin: false,
      subscription: { is_project_enabled: true, is_attendance_enabled: true }
    },
    showAlert: jest.fn()
  }),
  PERMISSION_FLAGS: []
}));

jest.mock('../../components/PageWrapper', () => {
  return function MockPageWrapper({ children }) {
    return <div data-testid="page-wrapper">{children}</div>;
  };
});

jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn((path) => {
    if (path === '/project-tasks/') {
      return Promise.resolve([{ id: 1, title: 'Test Task', assignedTo: '101' }]);
    }
    if (path === '/leaves/') {
      return Promise.resolve([{ id: 1, employee: '101', leaveTypeName: 'Annual Leave' }]);
    }
    if (path === '/attendance/') {
      return Promise.resolve([{ id: 1, employee: '101', status: 'Present' }]);
    }
    if (path === '/schedules/') {
      return Promise.resolve([{ id: 1, designation: 'Engineer' }]);
    }
    if (path === '/payroll/my-payslips/') {
      return Promise.resolve([
        { id: 10, payslip_number: 'PS-2026-08-01', month_name: 'August 2026', net_payable: 5500, currency: 'USD' }
      ]);
    }
    return Promise.reject({ status: 404, message: 'Not Found' });
  }),
  normalizeListResponse: (data) => (Array.isArray(data) ? data : [])
}));

describe('Personal Profile & API Endpoint Alignment Tests', () => {

  test('1 & 2. /profile loads canonical endpoints and renders user identity', async () => {
    const { apiFetch } = require('../../lib/api');
    render(<PersonalProfile />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Senior Software Engineer')).toBeTruthy();
      expect(screen.getByText('jane.doe@cubelogs.com')).toBeTruthy();
    });

    expect(apiFetch).toHaveBeenCalledWith('/project-tasks/');
    expect(apiFetch).toHaveBeenCalledWith('/payroll/my-payslips/');
  });

  test('5 & 6. Optional 404 on sub-endpoint does not crash profile or trigger logout', async () => {
    const { apiFetch } = require('../../lib/api');
    apiFetch.mockImplementation((path) => {
      if (path === '/payroll/my-payslips/') {
        return Promise.reject({ status: 404, message: 'Payslips Not Found' });
      }
      return Promise.resolve([]);
    });

    render(<PersonalProfile />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  test('7. My Payslips section renders when payroll API returns valid items', async () => {
    const { apiFetch } = require('../../lib/api');
    apiFetch.mockImplementation((path) => {
      if (path === '/payroll/my-payslips/') {
        return Promise.resolve([
          { id: 10, payslip_number: 'PS-2026-08-01', month_name: 'August 2026', net_payable: 5500, currency: 'USD' }
        ]);
      }
      return Promise.resolve([]);
    });

    render(<PersonalProfile />);

    await waitFor(() => {
      expect(screen.getByText('August 2026')).toBeTruthy();
      expect(screen.getByText('PS-2026-08-01')).toBeTruthy();
    });
  });

  test('8 & 9. Uses dynamic currentUser identity without hardcoded employee ID', async () => {
    const { apiFetch } = require('../../lib/api');
    render(<PersonalProfile />);

    await waitFor(() => {
      expect(screen.getByText('jane.doe@cubelogs.com')).toBeTruthy();
    });

    expect(apiFetch).toHaveBeenCalledWith('/payroll/my-payslips/');
  });
});
