export interface Student {
  id: string;
  name: string;
  email: string;
  registration: string;
  classId: string;
  status: 'Ativo' | 'Inativo';
  birthDate: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: 'Ativo' | 'Inativo';
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  room: string;
  period: 'Manhã' | 'Tarde' | 'Noite';
}