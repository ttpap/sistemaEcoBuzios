"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ClassForm from '@/components/ClassForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import ActivityTemplateEditor from "@/components/ActivityTemplateEditor";
import { SchoolClass } from '@/types/class';
import { getActiveProjectId } from '@/utils/projects';
import { fetchClassesRemoteWithMeta } from '@/services/classesService';

import { getAreaBaseFromPathname } from '@/utils/route-base';

const EditClass = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  useEffect(() => {
    const run = async () => {
      const projectId = getActiveProjectId();
      if (!projectId || !id) {
        navigate(`${base}/turmas`);
        return;
      }

      // Importante: no modo B (professor/coordenador), o SELECT direto pode vir vazio por RLS.
      // Por isso, carregamos a lista do projeto (com fallback RPC) e encontramos a turma por ID.
      const res = await fetchClassesRemoteWithMeta(projectId);
      const found = res.classes.find((c) => c.id === id) || null;

      if (found) {
        setSchoolClass(found);
      } else {
        navigate(`${base}/turmas`);
      }
    };

    void run();
  }, [id, navigate, base]);

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
          onClick={() => navigate(`${base}/turmas`)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar Turma</h1>
          <p className="text-slate-500 font-medium">Atualize as configurações da turma {schoolClass.name}.</p>
        </div>
      </div>

      <ClassForm initialData={schoolClass} />

      {/* Atividades da Escala */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setShowTemplateEditor((v) => !v)}
        >
          <div>
            <h2 className="text-lg font-bold text-slate-800">Atividades da Escala</h2>
            <p className="text-sm text-slate-500">Configure o template de atividades para a escala semanal desta turma.</p>
          </div>
          {showTemplateEditor ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {showTemplateEditor && <ActivityTemplateEditor turmaId={schoolClass.id} />}
      </div>
    </div>
  );
};

export default EditClass;