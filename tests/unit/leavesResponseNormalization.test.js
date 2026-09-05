import { normalizeListResponse } from '../../lib/api/apiClient';

describe('Leaves & Attendance API Response Normalization', () => {
  // 1. normalize plain array response
  test('1. normalize plain array response', () => {
    const rawArray = [
      { id: 1, name: 'Sick Leave', status: 'Active' },
      { id: 2, name: 'Casual Leave', status: 'Active' }
    ];
    const result = normalizeListResponse(rawArray);
    expect(result).toBe(rawArray);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Sick Leave');
  });

  // 2. normalize paginated { results: [...] } response
  test('2. normalize paginated { results: [...] } response', () => {
    const paginated = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 10, employee: 1, leaveType: 1, leaveTypeName: 'Casual Leave', status: 'Pending' },
        { id: 11, employee: 2, leaveType: 2, leaveTypeName: 'Sick Leave', status: 'Approved' }
      ]
    };
    const result = normalizeListResponse(paginated);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(10);
    expect(result[1].leaveTypeName).toBe('Sick Leave');
  });

  // 3. LeavesContent handles paginated leaves
  test('3. LeavesContent handles paginated leaves mapping', () => {
    const leavesData = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 101, employee: 5, leaveType: 2, leaveTypeName: 'Annual Leave', startDate: '2026-08-20', endDate: '2026-08-21', status: 'Pending' },
        { id: 102, employee: 6, leaveType: 3, leaveTypeName: 'Casual Leave', startDate: '2026-08-22', endDate: '2026-08-22', status: 'Approved' }
      ]
    };

    const leavesList = normalizeListResponse(leavesData);
    const mappedLeaves = leavesList.map(l => ({
      ...l,
      id: String(l.id),
      employeeId: String(l.employee),
      leaveTypeId: String(l.leaveType),
      leaveType: l.leaveTypeName
    }));

    expect(mappedLeaves.length).toBe(2);
    expect(mappedLeaves[0].id).toBe('101');
    expect(mappedLeaves[0].employeeId).toBe('5');
    expect(mappedLeaves[0].leaveTypeId).toBe('2');
    expect(mappedLeaves[0].leaveType).toBe('Annual Leave');
    expect(mappedLeaves[1].status).toBe('Approved');
  });

  // 4. LeaveTypes dependency handles paginated response
  test('4. LeaveTypes dependency handles paginated response', () => {
    const ltData = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, name: 'Sick Leave', maxLimit: 10, limitPeriod: 'Yearly', status: 'Active' },
        { id: 2, name: 'Casual Leave', maxLimit: 12, limitPeriod: 'Yearly', status: 'Active' }
      ]
    };

    const leaveTypesList = normalizeListResponse(ltData);
    const leaveTypes = leaveTypesList.map(lt => ({ ...lt, id: String(lt.id) }));

    expect(leaveTypes.length).toBe(2);
    expect(leaveTypes[0].id).toBe('1');
    expect(leaveTypes[0].name).toBe('Sick Leave');
    expect(leaveTypes[1].id).toBe('2');
    expect(leaveTypes[1].maxLimit).toBe(12);
  });

  // 5. Employees dependency handles paginated response
  test('5. Employees dependency handles paginated response', () => {
    const empData = {
      count: 3,
      next: 'http://localhost:8000/api/employees/?page=2',
      previous: null,
      results: [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        { id: 3, first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com' }
      ]
    };

    const employeesList = normalizeListResponse(empData);
    const cachedEmployees = employeesList.map(emp => ({ ...emp, id: String(emp.id) }));

    expect(cachedEmployees.length).toBe(3);
    expect(cachedEmployees[0].id).toBe('1');
    expect(cachedEmployees[1].first_name).toBe('Jane');
    expect(cachedEmployees[2].id).toBe('3');
  });

  // 6. Empty results do not crash
  test('6. Empty results and defensive edge cases do not crash', () => {
    const emptyPaginated = { count: 0, next: null, previous: null, results: [] };
    expect(normalizeListResponse(emptyPaginated)).toEqual([]);
    expect(normalizeListResponse(emptyPaginated).map(x => x.id)).toEqual([]);

    expect(normalizeListResponse(null)).toEqual([]);
    expect(normalizeListResponse(undefined)).toEqual([]);
    expect(normalizeListResponse({})).toEqual([]);
    expect(normalizeListResponse({ results: null })).toEqual([]);
    expect(normalizeListResponse({ data: [] })).toEqual([]);
    expect(normalizeListResponse('invalid')).toEqual([]);
    expect(normalizeListResponse(123)).toEqual([]);
  });
});
