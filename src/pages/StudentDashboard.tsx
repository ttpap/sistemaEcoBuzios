"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Copy, UserRound, IdCard } from "lucide-react";
import { readGlobalStudents } from "@/utils/storage";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentLoginFromRegistration,
  getStudentSessionStudentId,
} from "@/utils/student-auth";
import type { StudentRegistration } from "@/types/student";
import { showError, showSuccess } from "@/utils/toast";

function copyToClipboard(text: string) {
  const value = (text || "").toString();
  if (!value) return;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value);
    return;
  }

  // Fallback simples
  const ta = document.createElement("textarea");
  ta.value = value;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function StudentDashboard() {
  const student = useMemo(() => {
    const id = getStudentSessionStudentId();
    if (!id) return null;
    const all = readGlobalStudents<StudentRegistration[]>([]);
    return all.find((s) => s.id === id) || null;
  }, []);

  const login = useMemo(() => {
    if (!student?.registration) return "";
    return getStudentLoginFromRegistration(String(student.registration));
  }, [student]);

  const onCopy = (label: string, value: string) => {
    if (!value) {
      showError("Nada para copiar.");
      return;
    }
    copyToClipboard(value);
    showSuccess(`${label} copiado!`);
  };

  if (!student) {
    return (
      <div className="max-w-3xl">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.25rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 bg-white">
            <CardTitle className="text-xl font-black text-slate-800">Painel do aluno</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <p className="text-slate-600 font-medium">Não foi possível carregar seus dados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary">Olá, {student.preferredName || student.fullName}.</h1>
        <p className="mt-2 text-slate-500 font-medium">Aqui estão seus dados de acesso ao sistema.</p>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Credenciais</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Seu login é sempre os <span className="font-black">4 últimos dígitos</span> da matrícula.
              </p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-primary/10 text-primary border-none font-black">Aluno</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Login</p>
                  <div className="mt-2 flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-black tracking-tight text-slate-900 truncate">{login}</p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">Ex.: {student.registration} → {login}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCopy("Login", login)}
                  className="rounded-2xl border-slate-200 bg-white font-black gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha</p>
                  <div className="mt-2 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-black tracking-tight text-slate-900 truncate">{DEFAULT_STUDENT_PASSWORD}</p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">Senha padrão do aluno.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCopy("Senha", DEFAULT_STUDENT_PASSWORD)}
                  className="rounded-2xl border-slate-200 bg-white font-black gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seu cadastro</p>
                <div className="mt-2 flex items-center gap-2 text-slate-700">
                  <UserRound className="h-4 w-4 text-primary" />
                  <p className="text-sm font-black">{student.fullName}</p>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-600">Matrícula: {student.registration}</p>
              </div>
              <Button
                type="button"
                onClick={() => onCopy("Matrícula", String(student.registration || ""))}
                className="rounded-2xl h-11 font-black shadow-lg shadow-primary/20"
              >
                Copiar matrícula
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
