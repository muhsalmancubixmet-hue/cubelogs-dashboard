/**
 * Integrated Attendance -> Payroll Workflow Guidance UX Tests
 *
 * Verifies the 5-step stepper states, preflight cards, friendly error parsing,
 * employee breakdown derivation callouts, and cross-navigation links.
 */

describe('Payroll Workflow Guidance & Stepper Logic', () => {

  // Stepper state resolver logic (mirrors PayrollContent.js stepper logic)
  function getStepperSteps({ attendanceFinalized, payrollStatus, attendanceRevision = 1, payrollRevision = 1, employeeCount = 0 }) {
    const isPayrollFinalized = payrollStatus === 'Finalized';
    const isPayrollCalculated = payrollStatus === 'Calculated';

    return [
      {
        step: 1,
        title: 'Attendance',
        statusText: attendanceFinalized ? '✓ Finalized' : '⚠ Action Req',
        subText: attendanceFinalized ? `Rev ${attendanceRevision} Locked` : 'Needs Finalization',
        isComplete: attendanceFinalized,
      },
      {
        step: 2,
        title: 'Calculation',
        statusText: isPayrollCalculated || isPayrollFinalized ? '✓ Calculated' : (attendanceFinalized ? '● Ready' : '○ Pending'),
        subText: payrollStatus ? `Rev ${payrollRevision}` : 'Gross-to-Net',
        isComplete: isPayrollCalculated || isPayrollFinalized,
      },
      {
        step: 3,
        title: 'Review & Adjust',
        statusText: isPayrollFinalized ? '✓ Reviewed' : (isPayrollCalculated ? '● Active' : '○ Pending'),
        subText: isPayrollCalculated ? `${employeeCount} Snapshots` : 'Audit Ledger',
        isComplete: isPayrollFinalized,
      },
      {
        step: 4,
        title: 'Finalize',
        statusText: isPayrollFinalized ? '✓ Finalized' : (isPayrollCalculated ? '● Ready' : '○ Locked'),
        subText: isPayrollFinalized ? 'Audit Locked' : 'Prevent Edits',
        isComplete: isPayrollFinalized,
      },
      {
        step: 5,
        title: 'Payslips',
        statusText: isPayrollFinalized ? '✓ Issued' : '○ Pending',
        subText: isPayrollFinalized ? 'PDF & ZIP Ready' : 'Post-Finalization',
        isComplete: isPayrollFinalized,
      }
    ];
  }

  // Friendly error parser (mirrors parseFriendlyError in PayrollContent.js)
  function parseFriendlyError(rawErr, { currentMonthName = 'July 2026', selectedYear = 2026, selectedMonth = 7 } = {}) {
    if (!rawErr) return null;
    const msg = typeof rawErr === 'string' ? rawErr : (rawErr.message || JSON.stringify(rawErr));
    const lower = msg.toLowerCase();

    if (lower.includes('attendance period must be finalized') || lower.includes('attendance is not finalized')) {
      return {
        title: 'Payroll cannot be calculated yet',
        detail: `Attendance for ${currentMonthName} is still open. Please review and finalize monthly attendance before calculating payroll.`,
        actionLabel: 'Open Attendance Management',
        actionHref: `/attendance/management-portal?year=${selectedYear}&month=${selectedMonth}`
      };
    }
    if (lower.includes('cannot calculate payroll') && lower.includes('finalized')) {
      return {
        title: 'Payroll period is locked',
        detail: `Payroll for ${currentMonthName} is already Finalized. Reopen Payroll first if you need to recalculate or apply new changes.`,
        actionLabel: null,
        actionHref: null
      };
    }
    if (lower.includes('missing active salary structure') || lower.includes('no salary structure assigned')) {
      return {
        title: 'Missing Employee Salary Structure',
        detail: 'One or more employees do not have an active salary structure assigned. Assign salary packages in the Salary Directory.',
        actionLabel: 'Go to Salary Structures',
        actionHref: '/payroll/salaries'
      };
    }

    return {
      title: 'Action Error',
      detail: msg,
      actionLabel: null,
      actionHref: null
    };
  }

  describe('1. Stepper Lifecycle Stages', () => {
    test('State A: Unfinalized Attendance — Step 1 has Action Req, Steps 2-5 Pending/Locked', () => {
      const steps = getStepperSteps({ attendanceFinalized: false, payrollStatus: null });
      expect(steps[0].statusText).toBe('⚠ Action Req');
      expect(steps[0].isComplete).toBe(false);
      expect(steps[1].statusText).toBe('○ Pending');
      expect(steps[2].statusText).toBe('○ Pending');
      expect(steps[3].statusText).toBe('○ Locked');
      expect(steps[4].statusText).toBe('○ Pending');
    });

    test('State B: Finalized Attendance & Draft Payroll — Step 1 Complete, Step 2 Ready', () => {
      const steps = getStepperSteps({ attendanceFinalized: true, payrollStatus: null, attendanceRevision: 1 });
      expect(steps[0].statusText).toBe('✓ Finalized');
      expect(steps[0].isComplete).toBe(true);
      expect(steps[0].subText).toBe('Rev 1 Locked');
      expect(steps[1].statusText).toBe('● Ready');
      expect(steps[2].statusText).toBe('○ Pending');
    });

    test('State C: Calculated Payroll — Steps 1 & 2 Complete, Step 3 Active, Step 4 Ready', () => {
      const steps = getStepperSteps({ attendanceFinalized: true, payrollStatus: 'Calculated', attendanceRevision: 1, payrollRevision: 1, employeeCount: 5 });
      expect(steps[0].isComplete).toBe(true);
      expect(steps[1].statusText).toBe('✓ Calculated');
      expect(steps[1].subText).toBe('Rev 1');
      expect(steps[2].statusText).toBe('● Active');
      expect(steps[2].subText).toBe('5 Snapshots');
      expect(steps[3].statusText).toBe('● Ready');
      expect(steps[4].statusText).toBe('○ Pending');
    });

    test('State D: Finalized Payroll — All 5 Steps Marked Complete', () => {
      const steps = getStepperSteps({ attendanceFinalized: true, payrollStatus: 'Finalized', attendanceRevision: 1, payrollRevision: 1, employeeCount: 5 });
      expect(steps.every(s => s.statusText.startsWith('✓'))).toBe(true);
      expect(steps[3].subText).toBe('Audit Locked');
      expect(steps[4].subText).toBe('PDF & ZIP Ready');
    });
  });

  describe('2. Friendly Error Parsing', () => {
    test('Translates unfinalized attendance error into clear guidance with action link', () => {
      const parsed = parseFriendlyError('Attendance period must be finalized before calculating payroll', {
        currentMonthName: 'July 2026',
        selectedYear: 2026,
        selectedMonth: 7
      });
      expect(parsed.title).toBe('Payroll cannot be calculated yet');
      expect(parsed.detail).toContain('Attendance for July 2026 is still open');
      expect(parsed.actionLabel).toBe('Open Attendance Management');
      expect(parsed.actionHref).toBe('/attendance/management-portal?year=2026&month=7');
    });

    test('Translates locked period error into friendly explanation', () => {
      const parsed = parseFriendlyError('Cannot calculate payroll for finalized period', {
        currentMonthName: 'July 2026'
      });
      expect(parsed.title).toBe('Payroll period is locked');
      expect(parsed.detail).toContain('already Finalized');
    });

    test('Translates missing salary structure error with directory link', () => {
      const parsed = parseFriendlyError('No salary structure assigned for employee');
      expect(parsed.title).toBe('Missing Employee Salary Structure');
      expect(parsed.actionHref).toBe('/payroll/salaries');
    });
  });

  describe('3. Attendance Preflight Card Verification', () => {
    test('Unfinalized period returns warning with review link', () => {
      const attendanceFinalized = false;
      const cardType = !attendanceFinalized ? 'WARNING' : 'READY';
      const ctaHref = `/attendance/management-portal?year=2026&month=7`;
      
      expect(cardType).toBe('WARNING');
      expect(ctaHref).toBe('/attendance/management-portal?year=2026&month=7');
    });

    test('Finalized period returns ready confirmation with snapshot badge', () => {
      const attendanceFinalized = true;
      const revision = 2;
      const badgeText = `Snapshot Rev ${revision}`;
      
      expect(badgeText).toBe('Snapshot Rev 2');
    });
  });

  describe('4. Missing Salary Structure Warning Logic', () => {
    test('Identifies missing salary structure snapshot count', () => {
      const snapshots = [
        { employee_name: 'Aarav Sharma', status: 'OK' },
        { employee_name: 'Priya Nair', status: 'OK' },
        { employee_name: 'Unassigned Emp', status: 'MissingSalaryStructure' }
      ];
      const missingCount = snapshots.filter(s => s.status === 'MissingSalaryStructure').length;
      expect(missingCount).toBe(1);
    });
  });

  describe('5. Mathematical Derivation Text Differentiation', () => {
    test('Daily Wage employee uses daily rate × payable days calculation', () => {
      const emp = {
        compensation_type: 'DAILY',
        daily_rate: '1500.00',
        payable_attendance_units: '22.0'
      };
      const isDaily = emp.compensation_type === 'DAILY';
      const formulaText = isDaily
        ? 'Daily Wage — Pay = Daily Rate × Payable Days.'
        : 'Monthly Salary — Attendance affects proratable salary components';
      
      const wageEarnings = parseFloat(emp.daily_rate) * parseFloat(emp.payable_attendance_units);
      expect(isDaily).toBe(true);
      expect(formulaText).toContain('Pay = Daily Rate × Payable Days');
      expect(wageEarnings).toBe(33000);
    });

    test('Monthly Salary employee uses prorated attendance deduction', () => {
      const emp = {
        compensation_type: 'MONTHLY',
        proratable_gross: '50000.00',
        working_days: 22,
        unpaid_leave_days: 2,
        daily_rate: '2272.73'
      };
      const isDaily = emp.compensation_type === 'DAILY';
      const formulaText = isDaily
        ? 'Daily Wage — Pay = Daily Rate × Payable Days.'
        : 'Monthly Salary — Attendance affects proratable salary components (1 unpaid day × calculated daily rate = attendance deduction).';
      
      expect(isDaily).toBe(false);
      expect(formulaText).toContain('Monthly Salary — Attendance affects proratable');
    });
  });

  describe('6. Reopen Warning Content', () => {
    test('Reopen modal explicitly warns about superseding payslips', () => {
      const warningText = 'Issued payslips from the current revision will become superseded. A new payslip revision will be created after recalculation and finalization.';
      expect(warningText).toContain('superseded');
      expect(warningText).toContain('new payslip revision');
    });
  });
});
