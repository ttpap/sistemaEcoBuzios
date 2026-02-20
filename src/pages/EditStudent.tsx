"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import StudentForm from '@/components/StudentForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { StudentRegistration } from '@/types/student';
import { readGlobalStudents } from '@/utils/storage';

const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacherArea = location.pathname.startsWith('/professor');
  const base = isTeacherArea ? '/professor' : '';

  const [student, setStudent] = useState<StudentRegistration | null>(null);

  useEffect(() => {
    const saved = readGlobalStudents<StudentRegistration[]>([]);
    const found = saved.find((s: any) => s.id === id);
    if (found) {
      setStudent(found);
    } else {
      navigate(`${base}/alunos`);

    }
  }, [id, navigate, base]);

  if (!student) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-white shadow-sm border border-slate-100"
          onClick={() => navigate(`${base}/alunos`)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar Inscrição</h1>
          <p className="text-slate-500 font-medium">Atualize os dados de {student.fullName}.</p>
        </div>
      </div>

      <StudentForm initialData={student} />
    </div>
  );
};

export default EditStudent;