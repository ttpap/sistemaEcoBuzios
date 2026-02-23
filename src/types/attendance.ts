export type AttendanceStatus = "presente" | "falta" | "atrasado" | "justificada";

export interface AttendanceSession {
  id: string;
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
  /**
   * Quando preenchido, indica que a chamada foi efetivamente salva/finalizada.
   * Antes disso, ela é considerada um rascunho (não conta como presença/falta para o aluno).
   */
  finalizedAt?: string;
  /**
   * Snapshot de quem fazia parte da turma no dia da chamada.
   * Usado para relatórios (aluno que não era da turma na data fica em branco).
   */
  studentIds?: string[];

  /**
   * Registros por aluno.
   * IMPORTANTE: pode ficar em branco (sem chave) até o professor marcar.
   */
  records: Partial<Record<string, AttendanceStatus>>;
}