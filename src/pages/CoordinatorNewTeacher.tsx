"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TeacherForm from "@/components/TeacherForm";
import { getActiveProjectId } from "@/utils/projects";
import { addTeacherToProject } from "@/utils/teachers";
import { assignTeacherToProjectRemote } from "@/services/teacherAssignmentsService";

export default function CoordinatorNewTeacher() {
  const navigate = useNavigate();

  const backPath = "/coordenador/professores";

  const onAfterSave = useMemo(() => {
    return (teacherId: string, mode: "create" | "update") => {
      if (mode !== "create") return;
      const pid = getActiveProjectId();
      if (!pid) return;

      // Source-of-truth: Supabase
      void assignTeacherToProjectRemote(teacherId, pid).catch(() => {
        // fallback local (compat)
        addTeacherToProject(teacherId, pid);
      });
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-white shadow-sm border border-slate-100"
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Novo professor</h1>
          <p className="text-slate-500 font-medium">
            Cadastre um professor e ele será vinculado automaticamente ao projeto.
          </p>
        </div>
      </div>

      <TeacherForm backPath={backPath} onAfterSave={onAfterSave} />
    </div>
  );
}