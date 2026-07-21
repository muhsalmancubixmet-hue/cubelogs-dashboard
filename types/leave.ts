export interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: string;
  start_date: string;
  end_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}
