export type AttendanceStatus = "presente" | "falta" | "atrasado" | "justificada";

export interface AttendanceSession {
  id: string;
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
  /**
   * Snapshot de quem fazia parte da turma no dia da chamada.
   * Usado para relatórios (aluno que não era da turma na data fica em branco).
   */
  studentIds?: string[];
  records: Record<string, AttendanceStatus>;
}