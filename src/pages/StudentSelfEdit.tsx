"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentForm from "@/components/StudentForm";
import { readGlobalStudents, writeGlobalStudents } from "@/utils/storage";
import { getStudentSessionStudentId } from "@/utils/student-auth";
import { StudentRegistration } from "@/types/student";

export default function StudentSelfEdit() {
  const navigate = useNavigate();
  const studentId = getStudentSessionStudentId();

  const [student, setStudent] = useState<StudentRegistration | null>(() => {
    if (!studentId) return null;
    const list = readGlobalStudents<StudentRegistration[]>([]);
    return list.find((s) => s.id === studentId) || null;
  });
  const [loading, setLoading] = useState(!student);

  // Se não encontrou no localStorage, busca do Supabase via RPC
  useEffect(() => {
    if (student || !studentId) return;
    const run = async () => {
      setLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { mapStudentRowToModel } = await import("@/integrations/supabase/mappers");
        const { data } = await supabase.rpc("mode_b_get_student_profile", { p_student_id: studentId });
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = mapStudentRowToModel(data[0]);
          setStudent(mapped);
          const existing = readGlobalStudents<StudentRegistration[]>([]);
          writeGlobalStudents([...existing.filter((s) => s.id !== studentId), mapped]);
        }
      } catch {
        // mantém student como null
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [student, studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-400 font-medium">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Carregando seus dados…
      </div>
    );
  }

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
