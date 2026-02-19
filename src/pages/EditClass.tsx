"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClassForm from '@/components/ClassForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SchoolClass } from '@/types/class';
import { readScoped } from '@/utils/storage';

const EditClass = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);

  useEffect(() => {
    const saved = readScoped<SchoolClass[]>('classes', []);
    const found = saved.find((c: any) => c.id === id);
    if (found) {
      setSchoolClass(found);
    } else {
      navigate('/turmas');
    }
  }, [id, navigate]);

  if (!schoolClass) {
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
          onClick={() => navigate('/turmas')}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar Turma</h1>
          <p className="text-slate-500 font-medium">Atualize as configurações da turma {schoolClass.name}.</p>
        </div>
      </div>

      <ClassForm initialData={schoolClass} />
    </div>
  );
};

export default EditClass;