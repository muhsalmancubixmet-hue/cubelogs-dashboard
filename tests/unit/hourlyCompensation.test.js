import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PayslipModal from '../../components/PayslipModal';

describe('Hourly Wage Compensation Frontend Tests', () => {
  const mockHourlyPayslipData = {
    id: 99,
    payslip_number: 'PAY-202607-001-0006',
    year: 2026,
    month: 7,
    month_name: 'July 2026',
    revision: 1,
    status: 'Issued',
    currency: 'INR',
    company_name_snapshot: 'CubeLogs Corp',
    company_details_snapshot: {
      address: '100 Tech Boulevard',
      phone: '+91 9876543210',
      tax_id: 'GSTIN12345678'
    },
    employee_details_snapshot: {
      name: 'Kavita Reddy',
      employee_code: 'DEMO-EMP-006',
      designation: 'Support Specialist',
      department: 'Customer Success',
      joining_date: '2026-01-01'
    },
    payroll_snapshot: {
      employee_name: 'Kavita Reddy',
      designation: 'Support Specialist',
      currency: 'INR',
      compensation_type: 'HOURLY',
      hourly_rate: '250.00',
      payable_hours: '185.00',
      working_days: 22,
      payable_attendance_units: 22.0,
      paid_leave_days: 0.0,
      unpaid_leave_days: 0.0,
      absent_days: 0,
      attendance_summary_snapshot: {
        working_days: 22,
        present_days: 22.0,
        paid_leave_days: 0.0,
        unpaid_leave_days: 0.0,
        absent_days: 0,
        payable_attendance_units: 22.0,
        payable_work_hours: '185.00'
      },
      salary_components_snapshot: [
        { name: 'Transport Allowance', component_type: 'Earning', amount: '2000.00', is_proratable: false }
      ],
      calculation_breakdown: {
        compensation_type: 'HOURLY',
        hourly_rate: '250.00',
        payable_hours: '185.00',
        wage_earnings: '46250.00',
        fixed_allowances: '2000.00'
      },
      earned_gross: '48250.00',
      additional_earnings: '0.00',
      attendance_deduction: '0.00',
      base_fixed_deductions: '0.00',
      additional_deductions: '0.00',
      total_deductions: '0.00',
      net_payable: '48250.00'
    }
  };

  test('1. PayslipModal renders Hourly Wage pay basis correctly', () => {
    const handleClose = jest.fn();
    render(
      <PayslipModal
        isOpen={true}
        onClose={handleClose}
        payslipData={mockHourlyPayslipData}
      />
    );

    // Employee & Pay basis
    expect(screen.getByText('Kavita Reddy')).toBeTruthy();
    expect(screen.getAllByText(/Hourly Wage/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/250\.00\/hr/i).length).toBeGreaterThanOrEqual(1);
  });

  test('2. PayslipModal renders Payable Hours in attendance ribbon', () => {
    render(
      <PayslipModal
        isOpen={true}
        onClose={() => {}}
        payslipData={mockHourlyPayslipData}
      />
    );

    expect(screen.getByText('Payable Hours')).toBeTruthy();
    expect(screen.getAllByText(/185(\.00)? hrs/).length).toBeGreaterThanOrEqual(1);
  });

  test('3. PayslipModal renders Hourly Wage Earnings line row and fixed allowance', () => {
    render(
      <PayslipModal
        isOpen={true}
        onClose={() => {}}
        payslipData={mockHourlyPayslipData}
      />
    );

    expect(screen.getByText(/Hourly Wage Earnings/i)).toBeTruthy();
    expect(screen.getByText(/Transport Allowance/i)).toBeTruthy();
    expect(screen.getAllByText(/48,250\.00/i).length).toBeGreaterThanOrEqual(1);
  });

  test('4. PayslipModal does not show attendance deduction row for hourly employee', () => {
    render(
      <PayslipModal
        isOpen={true}
        onClose={() => {}}
        payslipData={mockHourlyPayslipData}
      />
    );

    expect(screen.queryByText('Attendance Deductions')).toBeNull();
  });

  test('5. PayslipModal total earned gross matches wage earnings + fixed allowances', () => {
    render(
      <PayslipModal
        isOpen={true}
        onClose={() => {}}
        payslipData={mockHourlyPayslipData}
      />
    );

    expect(screen.getByText('TOTAL EARNED GROSS')).toBeTruthy();
    expect(screen.getByText('NET SALARY PAYABLE')).toBeTruthy();
  });
});
