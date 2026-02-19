"use client";

import React from 'react';
import ClassForm from '@/components/ClassForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewClass = () => {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-black text-primary tracking-tight">Nova Turma</h1>
          <p className="text-slate-500 font-medium">Configure os horários e vagas da nova turma.</p>
        </div>
      </div>

      <ClassForm />
    </div>
  );
};

export default NewClass;