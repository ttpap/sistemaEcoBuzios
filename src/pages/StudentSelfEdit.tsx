"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentForm from "@/components/StudentForm";
import { readGlobalStudents } from "@/utils/storage";
import { getStudentSessionStudentId } from "@/utils/student-auth";
import { StudentRegistration } from "@/types/student";

export default function StudentSelfEdit() {
  const navigate = useNavigate();
  const studentId = getStudentSessionStudentId();

  const student = useMemo<StudentRegistration | null>(() => {
    if (!studentId) return null;
    const list = readGlobalStudents<StudentRegistration[]>([]);
    return list.find((s) => s.id === studentId) || null;
  }, [studentId]);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-slate-500 font-bold">Não foi possível carregar seus dados.</p>
        <Button variant="outline" className="rounded-2xl font-black" onClick={() => navigate("/aluno")}>
          Voltar
        </Button>
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
          onClick={() => navigate("/aluno")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Minha ficha</h1>
          <p className="text-slate-500 font-medium">Atualize seus dados pessoais.</p>
        </div>
      </div>

      <StudentForm
        initialData={student}
        redirectTo="/aluno"
        backPath="/aluno"
      />
    </div>
  );
}
