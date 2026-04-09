export interface SchoolClass {
  id: string;
  name: string;
  period: 'Manhã' | 'Tarde' | 'Noite';
  startTime: string;
  endTime: string;
  capacity: number;
  absenceLimit: number;
  registrationDate: string;
  status: 'Ativo' | 'Inativo';
  teacherIds?: string[];
  studentIds?: string[];
  /** Enrollment history so reports can infer who was in the class on a specific date. */
  studentEnrollments?: Array<{ studentId: string; enrolledAt: string; removedAt?: string }>;
  complementaryInfo?: string;
  /** Se preenchido, esta "turma" é na verdade um núcleo (subturma) da turma referenciada. */
  parentClassId?: string | null;
}