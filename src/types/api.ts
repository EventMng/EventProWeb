export interface ApiErrorResponse {
  error: string;
}

export interface ScannerVerifyResponse {
  registrationId: string;
  participant: { id: string; fullName: string; email: string };
  event: { id: string; name: string };
  attended: boolean;
}

export interface ScannerMarkAttendanceResponse {
  registrationId: string;
  attended: boolean;
}
