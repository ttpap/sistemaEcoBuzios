"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { ensureStudentAuthForModeB } from "@/utils/mode-b-student";

import type { StudentRegistration } from "@/types/student";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import type { AttendanceSession, AttendanceStatus } from "@/types/attendance";

import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

import { fetchAttendanceSessionsRemote } from "@/integrations/supabase/attendance";
import type { StudentJustification } from "@/integrations/supabase/student-justifications";
import {
  fetchStudentJustificationsRemote,
} from "@/integrations/supabase/student-justifications";

import { setModeBStudentJustification } from "@/integrations/supabase/mode-b";

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

function statusPill(status: AttendanceStatus | null, variant: "scheduled" | "final") {
  if (!status) {
    return variant === "scheduled"
      ? { label: "Marcada", className: "bg-sky-600 text-white" }
      : { label: "Em branco", className: "bg-slate-100 text-slate-700" };
  }

  switch (status) {
    case "presente":
      return { label: "Presente", className: "bg-emerald-600 text-white" };
    case "atrasado":
      return { label: "Atrasado", className: "bg-amber-600 text-white" };
    case "falta":
      return { label: "Faltou", className: "bg-rose-600 text-white" };
    case "justificada":
      return { label: "Justificada", className: "bg-orange-500 text-white" };
  }
}

function statusIcon(status: AttendanceStatus | null) {
  if (!status) return null;
  switch (status) {
    case "presente":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "atrasado":
      return <Clock4 className="h-4 w-4 text-amber-600" />;
    case "falta":
      return <XCircle className="h-4 w-4 text-rose-600" />;
    case "justificada":
      return <FileCheck2 className="h-4 w-4 text-orange-500" />;
  }
}

type StudentDayEntry = {
  ymd: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
  isScheduled: boolean; // aula futura ou chamada ainda não finalizada
  sessionId: string;
};

type DayStatus = "scheduled" | "present" | "late" | "absent" | "justified";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const localStudentId = useMemo(() => getStudentSessionStudentId(), []);
  const effectiveStudentId = profile?.student_id || localStudentId;

  // DEBUG
  useEffect(() => {
    console.log("[StudentDashboard] auth", {
      hasSession: Boolean(session),
      userId: session?.user?.id,
      role: profile?.role,
      profileStudentId: profile?.student_id,
      localStudentId,
      effectiveStudentId,
      projectId: getActiveProjectId(),
    });
  }, [session, profile?.role, profile?.student_id, localStudentId, effectiveStudentId]);

  const project = getActiveProject();
  const projectId = getActiveProjectId();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const selectedYmd = useMemo(() => (selectedDate ? toYMD(selectedDate) : null), [selectedDate]);
  const selectedMonthKey = useMemo(() => (selectedYmd ? monthKey(selectedYmd) : null), [selectedYmd]);
  const todayYmd = useMemo(() => toYMD(new Date()), []);

  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [justifications, setJustifications] = useState<StudentJustification[]>([]);
  const [futureJustDrafts, setFutureJustDrafts] = useState<Record<string, string>>({});

  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyTarget, setJustifyTarget] = useState<StudentDayEntry | null>(null);
  const [justifyText, setJustifyText] = useState("");

  useEffect(() => {
    if (!projectId) {
      navigate("/aluno/selecionar-projeto", { replace: true });
    }
  }, [projectId, navigate]);

  // Garante Supabase Auth para o aluno (necessário para RLS em attendance/justifications)
  useEffect(() => {
    void ensureStudentAuthForModeB().catch(() => {
      // se falhar, as telas só não vão carregar dados remotos; mostramos mensagens na UI.
    });
  }, []);

  // Garante profiles.student_id = nosso studentId (para RLS)
  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return;
      if (profile?.student_id) return;
      if (!localStudentId) return;

      await supabase.from("profiles").update({ student_id: localStudentId }).eq("user_id", session.user.id);
    };
    void run();
  }, [session?.user?.id, profile?.student_id, localStudentId]);

  // Carrega dados remotos (só depois de ter um effectiveStudentId)
  useEffect(() => {
    const run = async () => {
      if (!projectId || !effectiveStudentId) {
        setAttendanceSessions([]);
        setJustifications([]);
        return;
      }

      const [remoteAttendance, remoteJust] = await Promise.all([
        fetchAttendanceSessionsRemote(projectId),
        fetchStudentJustificationsRemote(projectId),
      ]);

      console.log("[StudentDashboard] loaded", {
        attendanceCount: remoteAttendance.length,
        justificationsCount: remoteJust.length,
      });

      setAttendanceSessions(remoteAttendance);
      setJustifications(remoteJust);
    };

    void run();
  }, [projectId, effectiveStudentId, profile?.student_id]);

  const student = useMemo(() => {
    if (!effectiveStudentId) return null;
    const all = readGlobalStudents<StudentRegistration[]>([]);
    return all.find((s) => s.id === effectiveStudentId) || null;
  }, [effectiveStudentId]);

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
    if (!effectiveStudentId) return [] as SchoolClass[];
    const all = readScoped<SchoolClass[]>("classes", []);
    return all.filter(
      (c) => (c.status || "").toLowerCase() !== "inativo" && isStudentCurrentlyInClass(c, effectiveStudentId),
    );
  }, [effectiveStudentId]);

  const classById = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of myClasses) map.set(c.id, c);
    return map;
  }, [myClasses]);

  const myAttendanceSessions = useMemo(() => {
    const allowed = new Set(myClasses.map((c) => c.id));
    return attendanceSessions.filter((s) => allowed.has(s.classId));
  }, [attendanceSessions, myClasses]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, StudentDayEntry[]>();
    if (!effectiveStudentId) return map;

    for (const sess of myAttendanceSessions) {
      const cls = classById.get(sess.classId);
      if (!cls) continue;

      const isScheduled = !sess.finalizedAt || sess.date >= todayYmd;
      const status = !sess.finalizedAt ? null : ((sess.records?.[effectiveStudentId] ?? null) as AttendanceStatus | null);

      const entry: StudentDayEntry = {
        ymd: sess.date,
        classId: cls.id,
        className: cls.name,
        startTime: cls.startTime,
        endTime: cls.endTime,
        status,
        isScheduled,
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
  }, [myAttendanceSessions, classById, effectiveStudentId, todayYmd]);

  const selectedEntries = (selectedYmd && entriesByDate.get(selectedYmd)) || [];

  const dayStatusByYmd = useMemo(() => {
    const map = new Map<string, DayStatus>();

    const justKey = (classId: string, ymd: string) => `${classId}:${ymd}`;
    const justSet = new Set<string>();
    for (const j of justifications) {
      justSet.add(justKey(j.classId, j.date));
    }

    for (const [ymd, arr] of entriesByDate) {
      if (selectedMonthKey && !ymd.startsWith(selectedMonthKey)) continue;

      let hasAbsent = false;
      let hasJustified = false;
      let hasLate = false;
      let hasPresent = false;
      let hasScheduled = false;
      let hasStudentJustification = false;

      for (const e of arr) {
        if (e.status === "falta") hasAbsent = true;
        else if (e.status === "justificada") hasJustified = true;
        else if (e.status === "atrasado") hasLate = true;
        else if (e.status === "presente") hasPresent = true;
        else if (e.isScheduled) hasScheduled = true;

        if (justSet.has(justKey(e.classId, e.ymd))) {
          hasStudentJustification = true;
        }
      }

      // Se o aluno enviou justificativa, marcamos o dia como "justified" no calendário
      // (mesmo que o professor ainda não tenha alterado o status para 'justificada').
      if (hasJustified || hasStudentJustification) map.set(ymd, "justified");
      else if (hasAbsent) map.set(ymd, "absent");
      else if (hasLate) map.set(ymd, "late");
      else if (hasPresent) map.set(ymd, "present");
      else if (hasScheduled) map.set(ymd, "scheduled");
    }

    return map;
  }, [entriesByDate, selectedMonthKey, justifications]);

  const calendarModifiers = useMemo(() => {
    const scheduled: Date[] = [];
    const present: Date[] = [];
    const late: Date[] = [];
    const absent: Date[] = [];
    const justified: Date[] = [];

    for (const [ymd, st] of dayStatusByYmd) {
      const d = new Date(`${ymd}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (st === "scheduled") scheduled.push(d);
      else if (st === "present") present.push(d);
      else if (st === "late") late.push(d);
      else if (st === "absent") absent.push(d);
      else if (st === "justified") justified.push(d);
    }

    return { scheduled, present, late, absent, justified };
  }, [dayStatusByYmd]);

  const openJustify = (entry: StudentDayEntry) => {
    setJustifyTarget(entry);

    const existing =
      projectId && effectiveStudentId
        ? justifications.find(
            (j) =>
              j.projectId === projectId &&
              j.classId === entry.classId &&
              j.date === entry.ymd &&
              j.studentId === effectiveStudentId,
          ) || null
        : null;

    setJustifyText(existing?.message || "");
    setJustifyOpen(true);
  };

  const saveJustificationModal = async () => {
    const currentProjectId = getActiveProjectId();
    if (!currentProjectId) return;
    if (!effectiveStudentId) return;
    if (!justifyTarget) return;

    const now = new Date().toISOString();

    const message = justifyText.trim();
    if (!message) {
      showError("Escreva uma justificativa antes de salvar.");
      return;
    }

    let id: string;
    try {
      id = await setModeBStudentJustification({
        projectId: currentProjectId,
        classId: justifyTarget.classId,
        studentId: effectiveStudentId,
        ymd: justifyTarget.ymd,
        message,
      });
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar a justificativa.");
      return;
    }

    const next: StudentJustification = {
      id,
      projectId: currentProjectId,
      classId: justifyTarget.classId,
      studentId: effectiveStudentId,
      date: justifyTarget.ymd,
      message,
      createdAt: now,
    };

    setJustifications((prev) => [next, ...prev.filter((j) => j.id !== next.id)]);
    setJustifyOpen(false);
    showSuccess("Justificativa enviada.");
  };

  const saveFutureJustification = async (entry: StudentDayEntry) => {
    const currentProjectId = getActiveProjectId();
    if (!currentProjectId) return;
    if (!effectiveStudentId) return;

    const key = `${entry.classId}:${entry.ymd}`;
    const message = (futureJustDrafts[key] || "").trim();

    if (!message) {
      showError("Escreva uma justificativa antes de salvar.");
      return;
    }

    const now = new Date().toISOString();

    let id: string;
    try {
      id = await setModeBStudentJustification({
        projectId: currentProjectId,
        classId: entry.classId,
        studentId: effectiveStudentId,
        ymd: entry.ymd,
        message,
      });
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar a justificativa.");
      return;
    }

    const next: StudentJustification = {
      id,
      projectId: currentProjectId,
      classId: entry.classId,
      studentId: effectiveStudentId,
      date: entry.ymd,
      message,
      createdAt: now,
    };

    setJustifications((prev) => [next, ...prev.filter((j) => j.id !== next.id)]);
    showSuccess("Justificativa enviada.");
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
                  onClick={() => {
                    copyToClipboard(login);
                    showSuccess("Login copiado!");
                  }}
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
                  onClick={() => {
                    copyToClipboard(DEFAULT_STUDENT_PASSWORD);
                    showSuccess("Senha copiada!");
                  }}
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

      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Minhas aulas</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                O calendário mostra todas as aulas do mês e o status de cada dia.
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
              <div className="lg:sticky lg:top-6 lg:self-start space-y-3">
                <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={calendarModifiers}
                    modifiersClassNames={{
                      scheduled:
                        "[&>button]:bg-sky-600/15 [&>button]:text-sky-950 [&>button:hover]:bg-sky-600/20",
                      present:
                        "[&>button]:bg-emerald-600/15 [&>button]:text-emerald-950 [&>button:hover]:bg-emerald-600/20",
                      late:
                        "[&>button]:bg-amber-600/15 [&>button]:text-amber-950 [&>button:hover]:bg-amber-600/20",
                      absent:
                        "[&>button]:bg-rose-600/15 [&>button]:text-rose-950 [&>button:hover]:bg-rose-600/20",
                      justified:
                        "[&>button]:bg-orange-500/15 [&>button]:text-orange-950 [&>button:hover]:bg-orange-500/20",
                    }}
                    modifiersStyles={{
                      scheduled: { backgroundColor: "rgba(2, 132, 199, 0.14)" },
                      present: { backgroundColor: "rgba(5, 150, 105, 0.14)" },
                      late: { backgroundColor: "rgba(217, 119, 6, 0.14)" },
                      absent: { backgroundColor: "rgba(225, 29, 72, 0.14)" },
                      justified: { backgroundColor: "rgba(249, 115, 22, 0.14)" },
                    }}
                    className="rounded-2xl"
                  />
                </div>

                <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legenda</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> Marcada
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Presente
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Atrasado
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Falta
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Justificado
                    </div>
                  </div>
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
                    <p className="text-slate-700 font-black">Sem aula marcada neste dia.</p>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Quando o professor ou o administrador marcar uma aula, ela aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedEntries.map((e) => {
                      const pill = statusPill(e.status, e.isScheduled ? "scheduled" : "final");

                      const cls = classById.get(e.classId);
                      const teacherNames = (cls?.teacherIds || [])
                        .map((id) => teachersById.get(id)?.fullName)
                        .filter(Boolean) as string[];

                      const existing =
                        projectId && effectiveStudentId
                          ? justifications.find(
                              (j) =>
                                j.projectId === projectId &&
                                j.classId === e.classId &&
                                j.date === e.ymd &&
                                j.studentId === effectiveStudentId,
                            ) || null
                          : null;

                      const key = `${e.classId}:${e.ymd}`;
                      const isFutureOrToday = e.ymd >= todayYmd;

                      const value = futureJustDrafts[key] ?? existing?.message ?? "";
                      const hasExistingJustification = Boolean(existing?.message?.trim());
                      const canJustifyNow = e.status === "falta" || isFutureOrToday;

                      return (
                        <div key={e.sessionId} className="rounded-[2rem] border border-slate-100 bg-white p-5">
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

                              {isFutureOrToday ? (
                                <div className="mt-4 rounded-[2rem] border border-slate-100 bg-slate-50/60 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Justificativa (para hoje ou datas futuras)
                                  </p>
                                  <Textarea
                                    value={value}
                                    onChange={(ev) =>
                                      setFutureJustDrafts((prev) => ({ ...prev, [key]: ev.target.value }))
                                    }
                                    placeholder="Escreva aqui se você vai faltar / faltou hoje..."
                                    className="mt-3 min-h-[120px] rounded-[1.5rem] bg-white"
                                  />
                                  <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-2xl font-black"
                                      onClick={() => setFutureJustDrafts((prev) => ({ ...prev, [key]: existing?.message ?? "" }))}
                                    >
                                      Desfazer
                                    </Button>
                                    <Button
                                      type="button"
                                      className="rounded-2xl font-black"
                                      onClick={() => saveFutureJustification(e)}
                                    >
                                      Enviar justificativa
                                    </Button>
                                  </div>
                                </div>
                              ) : hasExistingJustification ? (
                                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Sua justificativa enviada
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">
                                    {existing!.message}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-col gap-2 sm:items-end">
                              <Badge className={`rounded-full border-none font-black ${pill.className}`}>{pill.label}</Badge>

                              {canJustifyNow && (
                                <Button
                                  type="button"
                                  variant={hasExistingJustification ? "outline" : "default"}
                                  className="rounded-2xl font-black"
                                  onClick={() => openJustify(e)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {hasExistingJustification ? "Ver/editar justificativa" : "Justificar falta"}
                                </Button>
                              )}

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
            <DialogTitle className="text-xl font-black text-primary">Justificativa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-black text-slate-700">
                {justifyTarget ? `${justifyTarget.className} — ${formatDatePt(justifyTarget.ymd)}` : ""}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                O professor, coordenação e admin verão isso.
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
              <Button className="rounded-2xl font-black" onClick={saveJustificationModal}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}