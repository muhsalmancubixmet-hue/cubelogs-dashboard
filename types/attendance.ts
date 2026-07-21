export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  verification_status?: string;
  verifier_photo?: string;
}

export interface LocationPremises {
  id?: string;
  name?: string;
  lat: number;
  lon: number;
  radius?: number;
  isPrimary?: boolean;
}
