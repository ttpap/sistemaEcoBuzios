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
  complementaryInfo?: string;
}