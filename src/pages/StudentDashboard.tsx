"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Copy,
  GraduationCap,
  IdCard,
  KeyRound,
  UserRound,
} from "lucide-react";
import { readGlobalStudents, readScoped } from "@/utils/storage";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentLoginFromRegistration,
  getStudentSessionStudentId,
} from "@/utils/student-auth";
import type { StudentRegistration } from "@/types/student";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
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

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodTone(period: SchoolClass["period"]) {
  if (period === "Manhã") return "bg-[#22c55e]/10 text-[#166534]";
  if (period === "Tarde") return "bg-[#f59e0b]/10 text-[#92400e]";
  return "bg-[#60a5fa]/15 text-[#1d4ed8]";
}

function isStudentCurrentlyInClass(cls: SchoolClass, studentId: string) {
  if (Array.isArray(cls.studentEnrollments)) {
    const e = cls.studentEnrollments.find((x) => x.studentId === studentId);
    if (!e) return false;
    return !e.removedAt;
  }
  return Array.isArray(cls.studentIds) ? cls.studentIds.includes(studentId) : false;
}

export default function StudentDashboard() {
  const studentId = useMemo(() => getStudentSessionStudentId(), []);

  const student = useMemo(() => {
    if (!studentId) return null;
    const all = readGlobalStudents<StudentRegistration[]>([]);
    return all.find((s) => s.id === studentId) || null;
  }, [studentId]);

  const today = useMemo(() => ymdToday(), []);

  const classes = useMemo(() => {
    if (!studentId) return [];
    const all = readScoped<SchoolClass[]>("classes", []);
    return all
      .filter((c) => (c.status || "").toLowerCase() !== "inativo")
      .filter((c) => isStudentCurrentlyInClass(c, studentId))
      .sort((a, b) => `${a.period}${a.startTime}`.localeCompare(`${b.period}${b.startTime}`));
  }, [studentId]);

  const teachersById = useMemo(() => {
    const map = new Map<string, TeacherRegistration>();
    const teachers = readScoped<TeacherRegistration[]>("teachers", []);
    for (const t of teachers) map.set(t.id, t);
    return map;
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
        <h1 className="text-3xl font-black tracking-tight text-primary">
          Olá, {student.preferredName || student.fullName}.
        </h1>
        <p className="mt-2 text-slate-500 font-medium">Veja suas aulas e seus dados de acesso.</p>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Minhas aulas</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Aulas vinculadas ao projeto atual.
              </p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-[#008ca0]/10 text-[#006b79] border-none font-black">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Aluno
              </div>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0">
          {classes.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
              <p className="text-slate-700 font-black">Nenhuma aula encontrada.</p>
              <p className="mt-2 text-sm font-bold text-slate-600">
                Se você acabou de ser adicionado(a) em uma turma, atualize a página.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {classes.map((c) => {
                const teacherNames = (c.teacherIds || [])
                  .map((id) => teachersById.get(id)?.fullName)
                  .filter(Boolean) as string[];

                return (
                  <div
                    key={c.id}
                    className="rounded-[2.25rem] border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900 truncate">{c.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${periodTone(c.period)}`}>
                                <CalendarDays className="h-3.5 w-3.5" />
                                {c.period}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                                {c.startTime}–{c.endTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {teacherNames.length > 0 && (
                          <p className="mt-3 text-sm font-bold text-slate-600">
                            Professor(es): <span className="font-black">{teacherNames.join(", ")}</span>
                          </p>
                        )}

                        {c.complementaryInfo ? (
                          <p className="mt-2 text-sm font-bold text-slate-600">
                            Info: <span className="font-black">{c.complementaryInfo}</span>
                          </p>
                        ) : null}
                      </div>

                      <Badge className="rounded-full px-4 py-2 bg-emerald-500/10 text-emerald-700 border-none font-black w-fit">
                        Ativa
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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