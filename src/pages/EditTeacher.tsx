"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherForm from '@/components/TeacherForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TeacherRegistration } from '@/types/teacher';
import { migrateScopedTeachersToGlobalIfNeeded, readGlobalTeachers } from '@/utils/teachers';

const EditTeacher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<TeacherRegistration | null>(null);

  useEffect(() => {
    migrateScopedTeachersToGlobalIfNeeded();
    const saved = readGlobalTeachers([]);
    const found = saved.find((t: any) => t.id === id);
    if (found) {
      setTeacher(found);
    } else {
      navigate('/professores');
    }
  }, [id, navigate]);

  if (!teacher) {
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
          onClick={() => navigate('/professores')}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar Cadastro</h1>
          <p className="text-slate-500 font-medium">Atualize os dados de {teacher.fullName}.</p>
        </div>
      </div>

      <TeacherForm initialData={teacher} />
    </div>
  );
};

export default EditTeacher;