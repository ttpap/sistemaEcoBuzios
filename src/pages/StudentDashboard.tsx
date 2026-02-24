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
  CheckCircle2,
  Clock3,
  Clock4,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  IdCard,
  KeyRound,
  UserRound,
  XCircle,
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
  getJustificationForStudent,
  upsertStudentJustification,
} from "@/utils/student-justifications";
import { showError, showSuccess } from "@/utils/toast";

function formatDatePt(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("pt-BR");
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function statusPill(status: AttendanceStatus | null, variant: "draft" | "final") {
  if (!status) {
    return variant === "draft"
      ? { label: "Aguardando chamada", className: "bg-sky-600 text-white" }
      : { label: "Em branco", className: "bg-slate-100 text-slate-700" };
  }

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

function statusIcon(status: AttendanceStatus | null) {
  if (!status) return null;
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
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
  isDraft: boolean;
  sessionId: string;
};

export default function StudentDashboard() {
  const studentId = useMemo(() => getStudentSessionStudentId(), []);

  // sempre ler do storage atual
  const project = getActiveProject();
  const projectId = getActiveProjectId();

  const student = useMemo(() => {
    if (!studentId) return null;
    const all = readGlobalStudents<StudentRegistration[]>([]);
    return all.find((s) => s.id === studentId) || null;
  }, [studentId]);

  const login = useMemo(() => {
    if (!student?.registration) return "";
    return getStudentLoginFromRegistration(String(student.registration));
  }, [student]);

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

  const myClasses = useMemo(() => {
    if (!studentId) return [] as SchoolClass[];
    const all = readScoped<SchoolClass[]>("classes", []);
    return all.filter((c) => (c.status || "").toLowerCase() !== "inativo" && isStudentCurrentlyInClass(c, studentId));
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

      const isDraft = !sess.finalizedAt;
      const status = isDraft ? null : ((sess.records?.[studentId] ?? null) as AttendanceStatus | null);

      const entry: StudentDayEntry = {
        ymd: sess.date,
        classId: cls.id,
        className: cls.name,
        startTime: cls.startTime,
        endTime: cls.endTime,
        status,
        isDraft,
        sessionId: sess.id,
      };

      const arr = map.get(sess.date) || [];
      arr.push(entry);
      map.set(sess.date, arr);
    }

    for (const [k, arr] of map) {
      arr.sort((a, b) => `${a.startTime}`.localeCompare(`${b.startTime}`));
      map.set(k, arr);
    }

    return map;
  }, [myAttendanceSessions, myClasses, studentId]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const selectedYmd = useMemo(() => (selectedDate ? toYMD(selectedDate) : null), [selectedDate]);
  const selectedEntries = (selectedYmd && entriesByDate.get(selectedYmd)) || [];

  const selectedMonthKey = useMemo(() => (selectedYmd ? monthKey(selectedYmd) : null), [selectedYmd]);

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

  const todayYmd = useMemo(() => toYMD(new Date()), []);

  // Justificativa dialog
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyTarget, setJustifyTarget] = useState<StudentDayEntry | null>(null);
  const [justifyText, setJustifyText] = useState("");

  const openJustify = (entry: StudentDayEntry) => {
    setJustifyTarget(entry);

    const currentProjectId = getActiveProjectId();
    if (currentProjectId && studentId) {
      const existing = getJustificationForStudent(currentProjectId, entry.classId, entry.ymd, studentId);
      setJustifyText(existing?.message || "");
    } else {
      setJustifyText("");
    }

    setJustifyOpen(true);
  };

  const saveJustification = () => {
    const currentProjectId = getActiveProjectId();
    if (!currentProjectId) {
      showError("Nenhum projeto ativo.");
      return;
    }
    if (!studentId || !justifyTarget) return;

    const msg = justifyText.trim();
    if (!msg) {
      showError("Escreva a justificativa.");
      return;
    }

    const existing = getJustificationForStudent(currentProjectId, justifyTarget.classId, justifyTarget.ymd, studentId);

    const j: StudentJustification = {
      id:
        existing?.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
      projectId: currentProjectId,
      classId: justifyTarget.classId,
      studentId,
      date: justifyTarget.ymd,
      message: msg,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    upsertStudentJustification(currentProjectId, j);
    showSuccess("Justificativa enviada! Ela aparece na chamada.");
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
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.25rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 bg-white">
          <CardTitle className="text-xl font-black text-slate-800">Painel do aluno</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0">
          <p className="text-slate-600 font-medium">Não foi possível carregar seus dados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary">Olá, {student.preferredName || student.fullName}.</h1>
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

      {/* Credenciais */}
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Login</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-black tracking-tight text-slate-900 truncate">{login}</p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">Matrícula: {student.registration}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCopy("Login", login)}
                  className="rounded-2xl border-slate-200 bg-white font-black gap-2"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-black tracking-tight text-slate-900 truncate">
                      {DEFAULT_STUDENT_PASSWORD}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">Senha padrão do aluno.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCopy("Senha", DEFAULT_STUDENT_PASSWORD)}
                  className="rounded-2xl border-slate-200 bg-white font-black gap-2"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seu cadastro</p>
            <div className="mt-2 flex items-center gap-2 text-slate-700">
              <UserRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-black">{student.fullName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aulas / Chamada */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Minhas aulas</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Selecione um dia para ver suas aulas e enviar justificativa.
              </p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-primary/10 text-primary border-none font-black">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> {myClasses.length}
              </div>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0">
          {!projectId ? (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
              <p className="text-slate-700 font-black">Nenhum projeto ativo.</p>
              <p className="mt-2 text-sm font-bold text-slate-600">Selecione um projeto para ver a agenda.</p>
            </div>
          ) : myClasses.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
              <p className="text-slate-700 font-black">Nenhuma turma vinculada.</p>
              <p className="mt-2 text-sm font-bold text-slate-600">Procure a coordenação para ser matriculado(a).</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ hasEntry: monthDaysWithEntries }}
                  modifiersClassNames={{
                    hasEntry:
                      "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                  }}
                  className="rounded-2xl"
                />
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
                      Quando o professor criar/salvar a chamada, a aula aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedEntries.map((e) => {
                      const pill = statusPill(e.status, e.isDraft ? "draft" : "final");

                      const canJustify = e.ymd >= todayYmd || e.status === "falta" || e.status === null;

                      const cls = myClasses.find((c) => c.id === e.classId);
                      const teacherNames = (cls?.teacherIds || [])
                        .map((id) => teachersById.get(id)?.fullName)
                        .filter(Boolean) as string[];

                      const currentProjectId = getActiveProjectId();
                      const justification = currentProjectId
                        ? getJustificationForStudent(currentProjectId, e.classId, e.ymd, studentId || "")
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

                              {teacherNames.length > 0 ? (
                                <p className="mt-3 text-sm font-bold text-slate-600">
                                  Professor(es): <span className="font-black">{teacherNames.join(", ")}</span>
                                </p>
                              ) : null}

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

                              {canJustify ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl font-black"
                                  onClick={() => openJustify(e)}
                                >
                                  <FileText className="h-4 w-4 mr-2" /> Justificar falta
                                </Button>
                              ) : null}

                              {statusIcon(e.status) ? (
                                <span className="text-xs font-bold text-slate-500">{statusIcon(e.status)}</span>
                              ) : null}
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
