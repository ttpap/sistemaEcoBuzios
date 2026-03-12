"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import TeacherForm from "@/components/TeacherForm";
import type { TeacherRegistration } from "@/types/teacher";
import { readGlobalTeachers } from "@/utils/teachers";
import { fetchTeacherById } from "@/services/teachersService";

export default function CoordinatorEditTeacher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<TeacherRegistration | null>(null);

  const backPath = "/coordenador/professores";

  useEffect(() => {
    const run = async () => {
      if (!id) {
        navigate(backPath);
        return;
      }

      const remote = await fetchTeacherById(id);
      if (remote) {
        setTeacher(remote);
        return;
      }

      // Fallback legado
      const saved = readGlobalTeachers([]);
      const found = saved.find((t) => t.id === id) || null;
      if (!found) {
        navigate(backPath);
        return;
      }
      setTeacher(found);
    };

    void run();
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
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar professor</h1>
          <p className="text-slate-500 font-medium">Atualize os dados de {teacher.fullName}.</p>
        </div>
      </div>

      <TeacherForm initialData={teacher} backPath={backPath} />
    </div>
  );
}