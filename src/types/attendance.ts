export type AttendanceStatus = "presente" | "falta" | "atrasado" | "justificada";

export interface AttendanceSession {
  id: string;
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
  records: Record<string, AttendanceStatus>;
}
