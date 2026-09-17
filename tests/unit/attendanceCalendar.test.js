import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import SharedCalendar from '../../components/shared/calendar/SharedCalendar';
import DashboardCalendar from '../../components/DashboardCalendar';
import AttendanceCalendar from '../../components/modules/attendance/AttendanceCalendar';
import AttendanceDayCell from '../../components/modules/attendance/AttendanceDayCell';
import AttendanceDayDrawer from '../../components/modules/attendance/AttendanceDayDrawer';
import {
  formatWorkedDuration,
  getAttendanceStatusConfig,
  ATTENDANCE_STATUS_CONFIG
} from '../../components/modules/attendance/attendanceStatusConfig';

describe('Shared Calendar & Attendance Calendar System Tests', () => {

  test('1. SharedCalendar renders correct number of days for August 2026 (31 days)', () => {
    render(<SharedCalendar year={2026} month={7} />); // August = index 7
    expect(screen.getByText('August 2026')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  test('2. Month navigation works (Prev / Next triggers month change)', () => {
    const handleMonthChange = jest.fn();
    render(<SharedCalendar year={2026} month={7} onMonthChange={handleMonthChange} />);
    
    const nextBtn = screen.getByLabelText('Next month');
    fireEvent.click(nextBtn);
    expect(handleMonthChange).toHaveBeenCalledWith(2026, 8); // September

    const prevBtn = screen.getByLabelText('Previous month');
    fireEvent.click(prevBtn);
    expect(handleMonthChange).toHaveBeenCalledWith(2026, 6); // July
  });

  test('3 & 4. DashboardCalendar accepts holidays prop and maintains corporate closure behavior', () => {
    const mockHolidays = [
      { id: '1', date: '2026-08-15', name: 'Independence Day', description: 'National Holiday' }
    ];
    render(<DashboardCalendar holidays={mockHolidays} initialDate={new Date(2026, 7, 15)} />);
    expect(screen.getByText('Independence Day')).toBeTruthy();
    expect(screen.getByText(/Workspace Corporate/i)).toBeTruthy();
  });

  test('5. Present status renders correct standard icon/label and worked duration', () => {
    const cfg = getAttendanceStatusConfig('Present');
    expect(cfg.label).toBe('Present');
    expect(cfg.color).toBe('#16a34a');
    expect(cfg.icon).toBeDefined();

    render(
      <AttendanceDayCell
        dayNum={10}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-10"
        summary={{ daily_status: 'Present', worked_minutes: 485 }}
      />
    );
    expect(screen.getAllByTitle(/Present/i).length).toBeGreaterThan(0);
    expect(screen.getByText('8h 05m')).toBeTruthy();
  });

  test('6. Absent status does NOT display 0h 00m', () => {
    render(
      <AttendanceDayCell
        dayNum={11}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-11"
        summary={{ daily_status: 'Absent', worked_minutes: 0 }}
      />
    );
    expect(screen.getAllByTitle(/Absent/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('0h 00m')).toBeNull();
  });

  test('7. Leave status displays leave name and does NOT show 0h 00m', () => {
    render(
      <AttendanceDayCell
        dayNum={12}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-12"
        summary={{ daily_status: 'Leave', leave_type: 'Annual Leave', worked_minutes: 0 }}
      />
    );
    expect(screen.getAllByTitle(/Leave/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Annual Leave')).toBeTruthy();
    expect(screen.queryByText('0h 00m')).toBeNull();
  });

  test('8. Half Day displays duration correctly', () => {
    render(
      <AttendanceDayCell
        dayNum={13}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-13"
        summary={{ daily_status: 'Half Day', worked_minutes: 240 }}
      />
    );
    expect(screen.getAllByTitle(/Half Day/i).length).toBeGreaterThan(0);
    expect(screen.getByText('4h 00m')).toBeTruthy();
  });

  test('9. Holiday & Weekly Off display correctly without 0h 00m', () => {
    render(
      <AttendanceDayCell
        dayNum={14}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-14"
        summary={{ daily_status: 'Holiday', holiday_name: 'Summer Break' }}
      />
    );
    expect(screen.getAllByTitle(/Holiday/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Summer Break')).toBeTruthy();
    expect(screen.queryByText('0h 00m')).toBeNull();
  });

  test('10 & 11. GPS and Camera verification icons only appear when verification exists', () => {
    const { rerender } = render(
      <AttendanceDayCell
        dayNum={15}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-15"
        summary={{ daily_status: 'Present', worked_minutes: 480 }}
      />
    );
    expect(screen.queryByTitle('Location Verified')).toBeNull();
    expect(screen.queryByTitle('Photo Verification Available')).toBeNull();

    rerender(
      <AttendanceDayCell
        dayNum={15}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-15"
        summary={{
          daily_status: 'Present',
          worked_minutes: 480,
          verification_location: { lat: 12.97, lon: 77.59, locationName: 'Head Office' },
          verification_photo: 'data:image/jpeg;base64,mock'
        }}
      />
    );
    expect(screen.getByTitle('Location Verified')).toBeTruthy();
    expect(screen.getByTitle('Photo Verification Available')).toBeTruthy();
  });

  test('12. formatWorkedDuration produces hyphen for zero or missing worked time', () => {
    expect(formatWorkedDuration(undefined)).toBe('—');
    expect(formatWorkedDuration(null)).toBe('—');
    expect(formatWorkedDuration(NaN)).toBe('—');
    expect(formatWorkedDuration(0)).toBe('—');
    expect(formatWorkedDuration(480)).toBe('8h 00m');
    expect(formatWorkedDuration(515)).toBe('8h 35m');
  });

  test('13. Future normal day does NOT render Upcoming or Absent status text/icons', () => {
    render(
      <AttendanceDayCell
        dayNum={28}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-28"
        summary={{ daily_status: 'Upcoming' }}
        log={null}
      />
    );
    // Day number renders
    expect(screen.getByText('28')).toBeTruthy();
    // No "Upcoming" or "Absent" text inside cell
    expect(screen.queryByText('Upcoming')).toBeNull();
    expect(screen.queryByText('Absent')).toBeNull();
  });

  test('14. Future Weekly Off, Holiday, today Pending, and past Absent render correctly', () => {
    const { rerender } = render(
      <AttendanceDayCell
        dayNum={29}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-29"
        summary={{ daily_status: 'Weekly Off' }}
      />
    );
    expect(screen.getAllByTitle(/Weekly Off/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Weekly Off')).toBeTruthy();

    rerender(
      <AttendanceDayCell
        dayNum={30}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-30"
        summary={{ daily_status: 'Holiday', holiday_name: 'National Holiday' }}
      />
    );
    expect(screen.getAllByTitle(/Holiday/i).length).toBeGreaterThan(0);
    expect(screen.getByText('National Holiday')).toBeTruthy();

    rerender(
      <AttendanceDayCell
        dayNum={24}
        isToday={true}
        isBlank={false}
        dateISO="2026-08-24"
        summary={{ daily_status: 'Not Started' }}
      />
    );
    expect(screen.getAllByTitle(/Pending/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Pending')).toBeTruthy();

    rerender(
      <AttendanceDayCell
        dayNum={10}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-10"
        summary={{ daily_status: 'Absent' }}
      />
    );
    expect(screen.getAllByTitle(/Absent/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Absent')).toBeTruthy();
  });

  test('15. Status legend does NOT contain Upcoming item', () => {
    const dailySummaries = [
      { date: '2026-08-01', daily_status: 'Present', worked_minutes: 480 },
      { date: '2026-08-02', daily_status: 'Absent', worked_minutes: 0 },
      { date: '2026-08-03', daily_status: 'Upcoming', worked_minutes: 0 },
      { date: '2026-08-04', daily_status: 'Not Started', worked_minutes: 0 },
      { date: '2026-08-05', daily_status: 'Weekly Off', worked_minutes: 0 }
    ];

    render(
      <AttendanceCalendar
        employeeId="1"
        employeeName="John Doe"
        year={2026}
        month={7}
        dailySummaries={dailySummaries}
      />
    );

    // Legend items render
    expect(screen.getAllByText('Present').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Absent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weekly Off').length).toBeGreaterThan(0);
    // "Upcoming" must NOT appear in legend
    expect(screen.queryByText('Upcoming')).toBeNull();
  });

  test('16. Clicking calendar cell opens AttendanceDayDrawer and renders summary metrics', () => {
    const mockSummary = {
      daily_status: 'Present',
      worked_minutes: 495,
      shift_start: '09:00',
      shift_end: '17:00',
      first_clock_in: '2026-08-18T09:02:00Z',
      last_clock_out: '2026-08-18T17:17:00Z'
    };

    render(
      <AttendanceCalendar
        employeeId="1"
        employeeName="John Doe"
        year={2026}
        month={7}
        dailySummaries={[ { date: '2026-08-18', ...mockSummary } ]}
      />
    );

    const cell = screen.getByText('18');
    fireEvent.click(cell);

    expect(screen.getByText('Attendance Day Details')).toBeTruthy();
    expect(screen.getAllByText('8h 15m').length).toBeGreaterThan(0);
  });

  test('17. Mobile-friendly layout provides keyboard and touch actionability without requiring hover', () => {
    const handleClick = jest.fn();
    render(
      <AttendanceDayCell
        dayNum={20}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-20"
        summary={{ daily_status: 'Present', worked_minutes: 480 }}
        onClick={handleClick}
      />
    );

    const cellBtn = screen.getByRole('button');
    fireEvent.keyDown(cellBtn, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalled();
  });

  test('18. No emoji icons are used for attendance status configurations', () => {
    Object.values(ATTENDANCE_STATUS_CONFIG).forEach(cfg => {
      expect(typeof cfg.icon).toBe('function');
    });
  });

  test('19. Cell inline style object sets explicit border sides without mixing border and borderTop shorthand/longhand props', () => {
    render(
      <AttendanceDayCell
        dayNum={16}
        isToday={false}
        isBlank={false}
        dateISO="2026-08-16"
        summary={{ daily_status: 'Present', worked_minutes: 480 }}
      />
    );

    const cellEl = screen.getByRole('button');
    expect(cellEl.style.borderTop).toContain('2px solid');
    expect(cellEl.style.borderLeft).toContain('1px solid');
  });

});
