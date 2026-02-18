"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudentForm from '@/components/StudentForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { StudentRegistration } from '@/types/student';

const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRegistration | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ecobuzios_students') || '[]');
    const found = saved.find((s: any) => s.id === id);
    if (found) {
      setStudent(found);
    } else {
      navigate('/alunos');
    }
  }, [id, navigate]);

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
          onClick={() => navigate('/alunos')}
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