describe('Attendance Response Normalization & UnpackList Verification', () => {
  const unpackList = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  test('1. Normalizes raw array response correctly', () => {
    const rawArray = [
      { id: 101, employee: 5, date: '2026-08-19', status: 'Approved' },
      { id: 102, employee: 6, date: '2026-08-19', status: 'Late' },
    ];
    const normalized = unpackList(rawArray);
    expect(normalized).toBe(rawArray);
    expect(normalized.length).toBe(2);
    expect(normalized[0].id).toBe(101);

    const mapped = normalized.map(log => ({
      ...log,
      id: String(log.id),
      employeeId: String(log.employee)
    }));
    expect(mapped[0].employeeId).toBe('5');
  });

  test('2. Normalizes DRF paginated { results: [...] } response correctly', () => {
    const paginatedResponse = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 201, employee: 10, date: '2026-08-19', status: 'Approved' },
        { id: 202, employee: 11, date: '2026-08-19', status: 'Pending Approval' }
      ]
    };
    const normalized = unpackList(paginatedResponse);
    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized.length).toBe(2);

    const mapped = normalized.map(log => ({
      ...log,
      id: String(log.id),
      employeeId: String(log.employee)
    }));
    expect(mapped[0].id).toBe('201');
    expect(mapped[0].employeeId).toBe('10');
  });

  test('3. Normalizes custom { data: [...] } wrapper response correctly', () => {
    const wrappedResponse = {
      data: [{ id: 301, designation: 'Developer', shiftStart: '09:00', shiftEnd: '18:00' }]
    };
    const normalized = unpackList(wrappedResponse);
    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized.length).toBe(1);
    expect(normalized[0].designation).toBe('Developer');
  });

  test('4. Defensively returns empty array for null, undefined, string, or unexpected object', () => {
    expect(unpackList(null)).toEqual([]);
    expect(unpackList(undefined)).toEqual([]);
    expect(unpackList({})).toEqual([]);
    expect(unpackList('unexpected-string')).toEqual([]);
    expect(unpackList(12345)).toEqual([]);
    expect(unpackList({ results: 'not-an-array' })).toEqual([]);
  });

  test('5. Clock-in followed by paginated attendance refresh mapping succeeds', () => {
    const clockInResponse = {
      id: 401,
      employee: 1,
      employeeName: 'Alice Smith',
      date: '2026-08-19',
      clockIn: '2026-08-19T09:00:00Z',
      clockOut: null,
      status: 'Approved'
    };

    let attendanceLogs = [];

    // Simulate clock-in state update
    attendanceLogs = [
      { ...clockInResponse, id: String(clockInResponse.id), employeeId: String(clockInResponse.employee) },
      ...attendanceLogs
    ];
    expect(attendanceLogs.length).toBe(1);

    // Simulate paginated fetchAttendanceData refresh
    const refreshedServerResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 401,
          employee: 1,
          employeeName: 'Alice Smith',
          date: '2026-08-19',
          clockIn: '2026-08-19T09:00:00Z',
          clockOut: null,
          status: 'Approved'
        }
      ]
    };

    const unpacked = unpackList(refreshedServerResponse);
    attendanceLogs = unpacked.map(log => ({
      ...log,
      id: String(log.id),
      employeeId: String(log.employee)
    }));

    expect(attendanceLogs.length).toBe(1);
    expect(attendanceLogs[0].id).toBe('401');
    expect(attendanceLogs[0].employeeId).toBe('1');
    expect(attendanceLogs[0].clockOut).toBeNull();
  });

  test('6. Clock-out followed by paginated attendance refresh mapping succeeds', () => {
    const clockOutResponse = {
      id: 401,
      employee: 1,
      employeeName: 'Alice Smith',
      date: '2026-08-19',
      clockIn: '2026-08-19T09:00:00Z',
      clockOut: '2026-08-19T17:00:00Z',
      status: 'Approved'
    };

    let attendanceLogs = [
      { id: '401', employeeId: '1', date: '2026-08-19', clockIn: '2026-08-19T09:00:00Z', clockOut: null, status: 'Approved' }
    ];

    // Optimistic local update
    attendanceLogs = attendanceLogs.map(log =>
      (log.employeeId === '1' && !log.clockOut)
        ? { ...clockOutResponse, id: String(clockOutResponse.id), employeeId: String(clockOutResponse.employee) }
        : log
    );
    expect(attendanceLogs[0].clockOut).toBe('2026-08-19T17:00:00Z');

    // Server refresh with paginated response
    const refreshedServerResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 401,
          employee: 1,
          employeeName: 'Alice Smith',
          date: '2026-08-19',
          clockIn: '2026-08-19T09:00:00Z',
          clockOut: '2026-08-19T17:00:00Z',
          status: 'Approved'
        }
      ]
    };

    const unpacked = unpackList(refreshedServerResponse);
    attendanceLogs = unpacked.map(log => ({
      ...log,
      id: String(log.id),
      employeeId: String(log.employee)
    }));

    expect(attendanceLogs.length).toBe(1);
    expect(attendanceLogs[0].clockOut).toBe('2026-08-19T17:00:00Z');
  });
});
