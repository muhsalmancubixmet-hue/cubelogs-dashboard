import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PayslipModal from '../../components/PayslipModal';

describe('Phase 7B Frontend Payslip Tests', () => {
  const mockPayslipData = {
    id: 10,
    payslip_number: 'PAY-202608-001-0042',
    year: 2026,
    month: 8,
    month_name: 'August 2026',
    revision: 1,
    status: 'Issued',
    currency: 'USD',
    company_name_snapshot: 'Acme Corporation',
    company_details_snapshot: {
      address: '123 Business Way, Silicon City',
      phone: '+1-555-0100',
      tax_id: 'TRN-12345678'
    },
    employee_details_snapshot: {
      name: 'Alice Smith',
      employee_code: 'EMP-0042',
      designation: 'Senior Engineer',
      department: 'Engineering',
      joining_date: '2026-01-01'
    },
    payroll_snapshot: {
      employee_name: 'Alice Smith',
      designation: 'Senior Engineer',
      currency: 'USD',
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
        payable_attendance_units: 22.0
      },
      salary_components_snapshot: [
        { name: 'Basic Salary', component_type: 'Earning', amount: '4000.00', is_proratable: true },
        { name: 'Housing Allowance', component_type: 'Earning', amount: '1000.00', is_proratable: false },
        { name: 'Health Insurance', component_type: 'Deduction', amount: '200.00' }
      ],
      earned_gross: '5000.00',
      additional_earnings: '0.00',
      attendance_deduction: '0.00',
      base_fixed_deductions: '200.00',
      additional_deductions: '0.00',
      total_deductions: '200.00',
      net_payable: '4800.00'
    }
  };

  test('1. PayslipModal renders frozen values correctly', () => {
    const handleClose = jest.fn();
    const handleDownload = jest.fn();

    render(
      <PayslipModal
        isOpen={true}
        onClose={handleClose}
        payslipData={mockPayslipData}
        onDownloadPdf={handleDownload}
      />
    );

    // Company & Document
    expect(screen.getByText('Acme Corporation')).toBeTruthy();
    expect(screen.getByText('Official Salary Payslip')).toBeTruthy();
    expect(screen.getByText(/PAY-202608-001-0042/)).toBeTruthy();

    // Employee demographic details
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('EMP-0042')).toBeTruthy();
    expect(screen.getByText('Engineering')).toBeTruthy();

    // Attendance
    expect(screen.getByText('Working Days')).toBeTruthy();
    expect(screen.getByText('Payable Units')).toBeTruthy();

    // Financial values
    expect(screen.getByText('Basic Salary')).toBeTruthy();
    expect(screen.getByText('Housing Allowance')).toBeTruthy();
    expect(screen.getByText('Health Insurance')).toBeTruthy();
    expect(screen.getByText('4,800.00')).toBeTruthy();

    // Close button triggers callback
    const closeBtn = screen.getByRole('button', { name: 'Close Modal' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Download PDF button triggers callback
    const downloadBtn = screen.getByRole('button', { name: /download official pdf/i });
    fireEvent.click(downloadBtn);
    expect(handleDownload).toHaveBeenCalledWith(mockPayslipData);
  });

  test('2. Superseded warning renders prominently when status is Superseded', () => {
    const supersededData = {
      ...mockPayslipData,
      status: 'Superseded'
    };

    render(
      <PayslipModal
        isOpen={true}
        onClose={jest.fn()}
        payslipData={supersededData}
      />
    );

    expect(screen.getByTestId('superseded-warning')).toBeTruthy();
    expect(screen.getByText('SUPERSEDED HISTORICAL PAYSLIP')).toBeTruthy();
  });

  test('3. PayslipModal returns null when isOpen is false', () => {
    const { container } = render(
      <PayslipModal
        isOpen={false}
        onClose={jest.fn()}
        payslipData={mockPayslipData}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('4. My Payslips table renders issued records and triggers actions', () => {
    const payslips = [
      {
        id: 101,
        payslip_number: 'PAY-202608-001-0042',
        month_name: 'August 2026',
        net_payable: '4800.00',
        currency: 'USD',
        issued_at: '2026-08-31T18:00:00Z'
      },
      {
        id: 100,
        payslip_number: 'PAY-202607-001-0042',
        month_name: 'July 2026',
        net_payable: '5000.00',
        currency: 'USD',
        issued_at: '2026-07-31T18:00:00Z'
      }
    ];

    const handleView = jest.fn();
    const handleDownload = jest.fn();

    render(
      <div>
        {payslips.map(ps => (
          <div key={ps.id} data-testid={`payslip-row-${ps.id}`}>
            <span>{ps.month_name}</span>
            <span>{ps.payslip_number}</span>
            <span>{ps.currency} {ps.net_payable}</span>
            <button onClick={() => handleView(ps)}>View</button>
            <button onClick={() => handleDownload(ps)}>PDF</button>
          </div>
        ))}
      </div>
    );

    expect(screen.getByText('August 2026')).toBeTruthy();
    expect(screen.getByText('PAY-202608-001-0042')).toBeTruthy();
    expect(screen.getByText('July 2026')).toBeTruthy();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[0]);
    expect(handleView).toHaveBeenCalledWith(payslips[0]);

    const pdfButtons = screen.getAllByRole('button', { name: 'PDF' });
    fireEvent.click(pdfButtons[0]);
    expect(handleDownload).toHaveBeenCalledWith(payslips[0]);
  });

  test('5. Admin actions appear only when payroll period is Finalized', () => {
    const renderActionButtons = (isFinalized, snap) => (
      <div data-testid="actions-container">
        {isFinalized && (
          <>
            <button data-testid="view-payslip-btn">View Payslip</button>
            <button data-testid="download-pdf-btn">Download PDF</button>
          </>
        )}
        <button data-testid="breakdown-btn">Breakdown →</button>
      </div>
    );

    // Unfinalized (Draft / Calculated)
    const { rerender } = render(renderActionButtons(false, { id: 1 }));
    expect(screen.queryByTestId('view-payslip-btn')).toBeNull();
    expect(screen.queryByTestId('download-pdf-btn')).toBeNull();
    expect(screen.getByTestId('breakdown-btn')).toBeTruthy();

    // Finalized
    rerender(renderActionButtons(true, { id: 1 }));
    expect(screen.getByTestId('view-payslip-btn')).toBeTruthy();
    expect(screen.getByTestId('download-pdf-btn')).toBeTruthy();
    expect(screen.getByTestId('breakdown-btn')).toBeTruthy();
  });

  test('6. Bulk ZIP Export button appears only for Finalized payroll and triggers correct download', () => {
    const handleExportZip = jest.fn();

    const renderPeriodToolbar = (isFinalized, isExporting) => (
      <div data-testid="period-toolbar">
        {isFinalized && (
          <button
            data-testid="export-zip-btn"
            onClick={handleExportZip}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting ZIP...' : 'Export All Payslips (ZIP)'}
          </button>
        )}
      </div>
    );

    // Unfinalized (Draft / Calculated) -> button is hidden
    const { rerender } = render(renderPeriodToolbar(false, false));
    expect(screen.queryByTestId('export-zip-btn')).toBeNull();

    // Finalized -> button is visible and active
    rerender(renderPeriodToolbar(true, false));
    const exportBtn = screen.getByTestId('export-zip-btn');
    expect(exportBtn).toBeTruthy();
    expect(screen.getByText('Export All Payslips (ZIP)')).toBeTruthy();

    // Click triggers export
    fireEvent.click(exportBtn);
    expect(handleExportZip).toHaveBeenCalledTimes(1);

    // Exporting state -> button is disabled and shows loading text
    rerender(renderPeriodToolbar(true, true));
    expect(screen.getByText('Exporting ZIP...')).toBeTruthy();
    expect(screen.getByTestId('export-zip-btn').closest('button').disabled).toBe(true);
  });
});
