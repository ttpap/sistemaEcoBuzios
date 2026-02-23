"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  GraduationCap,
  IdCard,
  KeyRound,
  UserRound,
  XCircle,
  Clock4,
  FileCheck2,
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
import type { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import { getAllAttendance } from "@/utils/attendance";
import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import {
  type StudentJustification,
  upsertStudentJustification,
  getJustificationForStudent,
} from "@/utils/student-justifications";
import { showError, showSuccess } from "@/utils/toast";

function copyToClipboard(text: string) {
  const value = (text || "").toString();
  if (!value) return;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = value;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function formatDatePt(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("pt-BR");
}

function monthKey(ymd: string) {
  return ymd.slice(0, 7);
}

function isStudentCurrentlyInClass(cls: SchoolClass, studentId: string) {
  if (Array.isArray(cls.studentEnrollments)) {
    const e = cls.studentEnrollments.find((x) => x.studentId === studentId);
    if (!e) return false;
    return !e.removedAt;
  }
  return Array.isArray(cls.studentIds) ? cls.studentIds.includes(studentId) : false;
}

function statusPill(status: AttendanceStatus) {
  switch (status) {
    case "presente":
      return { label: "Presente", className: "bg-emerald-600 text-white" };
    case "falta":
      return { label: "Faltou", className: "bg-rose-600 text-white" };
    case "atrasado":
      return { label: "Atrasado", className: "bg-amber-600 text-white" };
    case "justificada":
      return { label: "Justificada", className: "bg-sky-600 text-white" };
  }
}

function statusIcon(status: AttendanceStatus) {
  switch (status) {
    case "presente":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "falta":
      return <XCircle className="h-4 w-4 text-rose-600" />;
    case "atrasado":
      return <Clock4 className="h-4 w-4 text-amber-600" />;
    case "justificada":
      return <FileCheck2 className="h-4 w-4 text-sky-600" />;
  }
}

type StudentDayEntry = {
  ymd: string;
  classId: string;
  className: string;
  period: SchoolClass["period"];
  startTime: string;
  endTime: string;
  status: AttendanceStatus;
  sessionId: string;
};

export default function StudentDashboard() {
  const studentId = useMemo(() => getStudentSessionStudentId(), []);
  const project = useMemo(() => getActiveProject(), []);
  const projectId = useMemo(() => getActiveProjectId(), []);

  const student = useMemo(() => {
    if (!studentId) return null;
    const all = readGlobalStudents<StudentRegistration[]>([]);
    return all.find((s) => s.id === studentId) || null;
  }, [studentId]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const teachersById = useMemo(() => {
    const map = new Map<string, TeacherRegistration>();
    try {
      const teachers = readScoped<TeacherRegistration[]>("teachers", []);
      for (const t of teachers) map.set(t.id, t);
    } catch {
      // ignore
    }
    return map;
  }, []);

  const { allActiveClasses, myClasses } = useMemo(() => {
    let all: SchoolClass[] = [];
    try {
      all = readScoped<SchoolClass[]>("classes", []);
    } catch {
      all = [];
    }

    const active = all.filter((c) => (c.status || "").toLowerCase() !== "inativo");
    const mine = studentId ? active.filter((c) => isStudentCurrentlyInClass(c, studentId)) : [];
    return { allActiveClasses: active, myClasses: mine };
  }, [studentId]);

  const myClassIds = useMemo(() => new Set(myClasses.map((c) => c.id)), [myClasses]);

  const myAttendanceSessions = useMemo(() => {
    let all: AttendanceSession[] = [];
    try {
      all = getAllAttendance();
    } catch {
      all = [];
    }

    return all
      .filter((s) => myClassIds.has(s.classId))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myClassIds]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, StudentDayEntry[]>();
    if (!studentId) return map;

    const classById = new Map<string, SchoolClass>();
    for (const c of myClasses) classById.set(c.id, c);

    for (const sess of myAttendanceSessions) {
      const cls = classById.get(sess.classId);
      if (!cls) continue;

      const status = (sess.records?.[studentId] || "presente") as AttendanceStatus;
      const entry: StudentDayEntry = {
        ymd: sess.date,
        classId: cls.id,
        className: cls.name,
        period: cls.period,
        startTime: cls.startTime,
        endTime: cls.endTime,
        status,
        sessionId: sess.id,
      };

      const arr = map.get(sess.date) || [];
      arr.push(entry);
      map.set(sess.date, arr);
    }

    // sort within day
    for (const [k, arr] of map) {
      arr.sort((a, b) => `${a.period}${a.startTime}`.localeCompare(`${b.period}${b.startTime}`));
      map.set(k, arr);
    }

    return map;
  }, [myAttendanceSessions, myClasses, studentId]);

  const selectedYmd = useMemo(() => {
    if (!selectedDate) return null;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const selectedMonthKey = useMemo(() => {
    if (!selectedYmd) return null;
    return monthKey(selectedYmd);
  }, [selectedYmd]);

  const monthDaysWithEntries = useMemo(() => {
    const dates: Date[] = [];
    if (!selectedMonthKey) return dates;

    for (const ymd of entriesByDate.keys()) {
      if (monthKey(ymd) !== selectedMonthKey) continue;
      const d = new Date(`${ymd}T00:00:00`);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
    return dates;
  }, [entriesByDate, selectedMonthKey]);

  const monthDaysWithAbsence = useMemo(() => {
    const dates: Date[] = [];
    if (!selectedMonthKey) return dates;

    for (const [ymd, entries] of entriesByDate.entries()) {
      if (monthKey(ymd) !== selectedMonthKey) continue;
      const hasAbs = entries.some((e) => e.status === "falta");
      if (!hasAbs) continue;
      const d = new Date(`${ymd}T00:00:00`);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
    return dates;
  }, [entriesByDate, selectedMonthKey]);

  const login = useMemo(() => {
    if (!student?.registration) return "";
    return getStudentLoginFromRegistration(String(student.registration));
  }, [student]);

  // Justificativa dialog
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyTarget, setJustifyTarget] = useState<StudentDayEntry | null>(null);
  const [justifyText, setJustifyText] = useState("");

  const existingJustification = useMemo(() => {
    if (!projectId || !justifyTarget || !studentId) return null;
    return getJustificationForStudent(projectId, justifyTarget.classId, justifyTarget.ymd, studentId);
  }, [projectId, justifyTarget, studentId]);

  const openJustify = (entry: StudentDayEntry) => {
    setJustifyTarget(entry);
    setJustifyText(existingJustification?.message || "");
    setJustifyOpen(true);
  };

  const saveJustification = () => {
    if (!projectId) {
      showError("Nenhum projeto ativo.");
      return;
    }
    if (!studentId || !justifyTarget) return;

    const msg = justifyText.trim();
    if (!msg) {
      showError("Escreva a justificativa.");
      return;
    }

    const j: StudentJustification = {
      id: existingJustification?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
      projectId,
      classId: justifyTarget.classId,
      studentId,
      date: justifyTarget.ymd,
      message: msg,
      createdAt: existingJustification?.createdAt || new Date().toISOString(),
    };

    upsertStudentJustification(projectId, j);
    showSuccess("Justificativa enviada! Ela aparecerá para o professor na chamada.");
    setJustifyOpen(false);
  };

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

  const selectedEntries = (selectedYmd && entriesByDate.get(selectedYmd)) || [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary">
          Olá, {student.preferredName || student.fullName}.
        </h1>
        <p className="mt-2 text-slate-500 font-medium">
          {project ? (
            <>
              Projeto ativo: <span className="font-black">{project.name}</span>
            </>
          ) : (
            "Selecione um projeto para ver suas aulas."
          )}
        </p>
      </div>

      {/* Calendário + status */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Calendário</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Dias com chamada criada ficam marcados. Clique em um dia para ver o status.
              </p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-[#008ca0]/10 text-[#006b79] border-none font-black">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Mês
              </div>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0">
          {myClasses.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
              <p className="text-slate-800 font-black">Você ainda não está matriculado(a) em nenhuma turma.</p>
              <p className="mt-2 text-sm font-bold text-slate-600">
                Peça ao administrador/professor para te matricular em uma turma.
              </p>
              {allActiveClasses.length > 0 && (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Existem {allActiveClasses.length} turma(s) ativa(s) no projeto, mas nenhuma está vinculada ao seu cadastro.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasAula: monthDaysWithEntries,
                    hasFalta: monthDaysWithAbsence,
                  }}
                  modifiersClassNames={{
                    hasAula: "bg-primary text-primary-foreground hover:bg-primary",
                    hasFalta: "bg-rose-600 text-white hover:bg-rose-600",
                  }}
                  className="w-full"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-black">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Dia com aula
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-600/10 text-rose-700 px-3 py-1 text-xs font-black">
                    <span className="h-2 w-2 rounded-full bg-rose-600" /> Falta
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dia selecionado</p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {selectedYmd ? formatDatePt(selectedYmd) : "Selecione um dia"}
                  </p>
                </div>

                {selectedEntries.length === 0 ? (
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
                    <p className="text-slate-700 font-black">Sem chamada registrada neste dia.</p>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Quando o professor criar a chamada, o dia ficará marcado aqui.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedEntries.map((e) => {
                      const pill = statusPill(e.status);
                      const canJustify = e.status === "falta";

                      const teacherNames = (myClasses.find((c) => c.id === e.classId)?.teacherIds || [])
                        .map((id) => teachersById.get(id)?.fullName)
                        .filter(Boolean) as string[];

                      const justification = projectId
                        ? getJustificationForStudent(projectId, e.classId, e.ymd, studentId || "")
                        : null;

                      return (
                        <div key={`${e.sessionId}:${e.classId}`} className="rounded-[2rem] border border-slate-100 bg-white p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                  <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-900 truncate">{e.className}</p>
                                  <p className="mt-1 text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 text-slate-500" /> {e.startTime}–{e.endTime}
                                  </p>
                                </div>
                              </div>

                              {teacherNames.length > 0 && (
                                <p className="mt-3 text-sm font-bold text-slate-600">
                                  Professor(es): <span className="font-black">{teacherNames.join(", ")}</span>
                                </p>
                              )}

                              {justification ? (
                                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Sua justificativa
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">
                                    {justification.message}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-col gap-2 sm:items-end">
                              <Badge className={`rounded-full border-none font-black ${pill.className}`}>{pill.label}</Badge>

                              {canJustify && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl font-black"
                                  onClick={() => openJustify(e)}
                                >
                                  <FileText className="h-4 w-4 mr-2" /> Justificar falta
                                </Button>
                              )}

                              {e.status !== "falta" && (
                                <span className="text-xs font-bold text-slate-500">{statusIcon(e.status)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turmas */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Minhas turmas</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">Turmas em que você está matriculado(a) neste projeto.</p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-primary/10 text-primary border-none font-black">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {myClasses.length}
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0">
          {myClasses.length === 0 ? (
            <p className="text-sm font-bold text-slate-600">Nenhuma turma vinculada.</p>
          ) : (
            <div className="grid gap-4">
              {myClasses
                .slice()
                .sort((a, b) => `${a.period}${a.startTime}`.localeCompare(`${b.period}${b.startTime}`))
                .map((c) => {
                  const teacherNames = (c.teacherIds || [])
                    .map((id) => teachersById.get(id)?.fullName)
                    .filter(Boolean) as string[];

                  return (
                    <div key={c.id} className="rounded-[2rem] border border-slate-100 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-lg font-black text-slate-900 truncate">{c.name}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                              {c.period}
                            </Badge>
                            <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                              <Clock3 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              {c.startTime}–{c.endTime}
                            </Badge>
                          </div>
                          {teacherNames.length > 0 && (
                            <p className="mt-3 text-sm font-bold text-slate-600">
                              Professor(es): <span className="font-black">{teacherNames.join(", ")}</span>
                            </p>
                          )}
                        </div>
                        <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 border-none font-black">
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

      {/* Credenciais */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Credenciais</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Seu login é os <span className="font-black">4 últimos dígitos</span> da matrícula.
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

      <Dialog open={justifyOpen} onOpenChange={setJustifyOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">Justificar falta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-black text-slate-700">
                {justifyTarget ? `${justifyTarget.className} — ${formatDatePt(justifyTarget.ymd)}` : ""}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Escreva o motivo. O professor verá isso na chamada.
              </p>
            </div>

            <Textarea
              value={justifyText}
              onChange={(e) => setJustifyText(e.target.value)}
              placeholder="Ex.: consulta médica, motivo familiar, etc."
              className="min-h-[140px] rounded-[1.5rem]"
            />

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" className="rounded-2xl font-black" onClick={() => setJustifyOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl font-black" onClick={saveJustification}>
                Enviar justificativa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
