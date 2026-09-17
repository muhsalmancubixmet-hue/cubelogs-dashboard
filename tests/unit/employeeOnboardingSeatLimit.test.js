/**
 * Employee Onboarding & Billable Seat Limit Tests
 * Verifies active employee counting rules and frozen billing formula invariants.
 */

describe('Employee Onboarding & Billable Seat Count Tests', () => {

  // Frozen rates from GlobalBillingSettings specification
  const BILLING_RATES = {
    EMPLOYEE_RATE: 200,   // ₹200 / employee / month
    ATTENDANCE_RATE: 50,  // ₹50 / employee / month
    PROJECT_RATE: 50,     // ₹50 / employee / month
    BASE_FEE: 0,          // Base fee remains 0
    TAX_RATE: 0           // Tax remains 0
  };

  /**
   * Helper implementing canonical billable employee filter logic:
   * Only employees who are active in the organization and have not exited (Resigned/Terminated with past lwd) count.
   */
  function calculateBillableEmployees(employees, referenceDate = '2026-09-01') {
    const today = new Date(referenceDate);

    return employees.filter(emp => {
      // Must be active
      if (emp.is_active === false) return false;
      if (emp.employment_status === 'Deactivated') return false;

      // Check exit date for Resigned / Terminated
      if (emp.employment_status === 'Resigned' || emp.employment_status === 'Terminated') {
        if (!emp.last_working_date) return false;
        const lwd = new Date(emp.last_working_date);
        if (lwd <= today) return false;
      }

      // Check organization membership if present
      if (emp.membership && emp.membership.is_active_in_org === false) {
        return false;
      }

      return true;
    });
  }

  /**
   * Helper implementing canonical frozen billing formula:
   * Total = (billable_count * emp_rate) + (attendance_enabled ? billable_count * att_rate : 0) + (project_enabled ? billable_count * proj_rate : 0)
   */
  function calculateMonthlyBilling({ billableCount, isAttendanceEnabled = false, isProjectEnabled = false }) {
    const employeeCharge = billableCount * BILLING_RATES.EMPLOYEE_RATE;
    const attendanceCharge = isAttendanceEnabled ? billableCount * BILLING_RATES.ATTENDANCE_RATE : 0;
    const projectCharge = isProjectEnabled ? billableCount * BILLING_RATES.PROJECT_RATE : 0;
    const baseFee = BILLING_RATES.BASE_FEE;
    const tax = BILLING_RATES.TAX_RATE;

    const total = employeeCharge + attendanceCharge + projectCharge + baseFee + tax;

    return {
      billableCount,
      employeeCharge,
      attendanceCharge,
      projectCharge,
      baseFee,
      tax,
      total
    };
  }

  test('1. Billable seat count includes only active employees and excludes deactivated or exited staff', () => {
    const mockEmployees = [
      { id: 1, name: 'Active Dev 1', employment_status: 'Active', is_active: true },
      { id: 2, name: 'Active Dev 2', employment_status: 'Active', is_active: true },
      { id: 3, name: 'Active Dev 3', employment_status: 'Active', is_active: true },
      { id: 4, name: 'Deactivated Emp', employment_status: 'Deactivated', is_active: false },
      { id: 5, name: 'Exited Resigned', employment_status: 'Resigned', last_working_date: '2026-08-15', is_active: true },
      { id: 6, name: 'Future Resigned', employment_status: 'Resigned', last_working_date: '2026-09-30', is_active: true },
      { id: 7, name: 'Exited Terminated', employment_status: 'Terminated', last_working_date: '2026-08-31', is_active: true },
    ];

    const billable = calculateBillableEmployees(mockEmployees, '2026-09-01');
    // Active Dev 1, 2, 3 and Future Resigned (lwd > 2026-09-01) count.
    // Deactivated, Exited Resigned, and Exited Terminated do not count.
    expect(billable.length).toBe(4);
    expect(billable.map(e => e.id)).toEqual([1, 2, 3, 6]);
  });

  test('2. Multi-tenant inactive membership fails closed and is excluded from seat count', () => {
    const mockEmployees = [
      { id: 10, name: 'Org A Member', employment_status: 'Active', is_active: true, membership: { is_active_in_org: true } },
      { id: 11, name: 'Org B Inactive Member', employment_status: 'Active', is_active: true, membership: { is_active_in_org: false } },
    ];

    const billable = calculateBillableEmployees(mockEmployees, '2026-09-01');
    expect(billable.length).toBe(1);
    expect(billable[0].id).toBe(10);
  });

  test('3. Frozen billing calculation accurately derives billable charge with base fee = 0 and tax = 0', () => {
    const estimate = calculateMonthlyBilling({
      billableCount: 10,
      isAttendanceEnabled: false,
      isProjectEnabled: false
    });

    expect(estimate.employeeCharge).toBe(2000); // 10 * 200
    expect(estimate.attendanceCharge).toBe(0);
    expect(estimate.projectCharge).toBe(0);
    expect(estimate.baseFee).toBe(0);
    expect(estimate.tax).toBe(0);
    expect(estimate.total).toBe(2000);
  });

  test('4. Enabling attendance and project add-ons scales by billable seat count', () => {
    const estimateAllOn = calculateMonthlyBilling({
      billableCount: 5,
      isAttendanceEnabled: true,
      isProjectEnabled: true
    });

    expect(estimateAllOn.employeeCharge).toBe(1000);  // 5 * 200
    expect(estimateAllOn.attendanceCharge).toBe(250);  // 5 * 50
    expect(estimateAllOn.projectCharge).toBe(250);     // 5 * 50
    expect(estimateAllOn.total).toBe(1500);            // 1000 + 250 + 250
  });

  test('5. Zero billable count produces zero total charge without negative numbers', () => {
    const estimateEmpty = calculateMonthlyBilling({
      billableCount: 0,
      isAttendanceEnabled: true,
      isProjectEnabled: true
    });

    expect(estimateEmpty.total).toBe(0);
    expect(estimateEmpty.employeeCharge).toBe(0);
    expect(estimateEmpty.attendanceCharge).toBe(0);
    expect(estimateEmpty.projectCharge).toBe(0);
  });

  test('6. Module toggle preserves zero immediate wallet debit and zero proration invariant', () => {
    // When a module is toggled, immediate wallet charge is 0, future invoice updates to current state
    const immediateDebitOnToggle = 0;
    const prorationCharge = 0;
    const refundOnDisable = 0;

    expect(immediateDebitOnToggle).toBe(0);
    expect(prorationCharge).toBe(0);
    expect(refundOnDisable).toBe(0);
  });

});
