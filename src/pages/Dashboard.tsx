"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Gift,
  GraduationCap,
  MapPinned,
  School,
  Users,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import { SchoolClass } from "@/types/class";
import { TeacherRegistration } from "@/types/teacher";
import { StudentRegistration } from "@/types/student";
import { getAllAttendance } from "@/utils/attendance";
import {
  printInstitutionsReport,
  printNeighborhoodsReport,
  printSchoolTypeReport,
} from "@/utils/dashboard-reports";
import StudentDetailsDialog from "@/components/StudentDetailsDialog";
import { readGlobalStudents, readScoped, writeScoped } from "@/utils/storage";
import { getActiveProjectId } from "@/utils/projects";
import {
  fetchStudentJustificationsRemote,
  type StudentJustification,
} from "@/services/studentJustificationsService";

import { getAreaBaseFromPathname } from "@/utils/route-base";
import { fetchClassesRemoteWithMeta } from "@/services/classesService";
import { fetchStudentsRemote } from "@/services/studentsService";

import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";
import { enrollmentsService, type EnrollmentRow } from "@/services/enrollmentsService";

type KPI = {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "secondary" | "sky" | "amber";
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeSchoolType(student: StudentRegistration): "pública" | "privada" | "outros" {
  const raw = `${student.schoolType || ""} ${student.schoolName || ""} ${student.schoolOther || ""}`.toLowerCase();

  if (
    raw.includes("municipal") ||
    raw.includes("state") ||
    raw.includes("pública") ||
    raw.includes("publica")
  ) {
    return "pública";
  }
  if (raw.includes("private") || raw.includes("priv") || raw.includes("particular")) {
    return "privada";
  }
  return "outros";
}

function getModeBStaffCreds(): { login: string; password: string } | null {
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  return null;
}

async function fetchActiveEnrollmentsByProject(projectId: string): Promise<EnrollmentRow[]> {
  return enrollmentsService.listActiveByProject({ projectId, modeBCreds: getModeBStaffCreds() });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [justifications, setJustifications] = useState<StudentJustification[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [justificationsOpen, setJustificationsOpen] = useState(false);

  const today = new Date();
  const thisMonth = monthKey(today);

  const projectId = useMemo(() => getActiveProjectId(), [location.pathname]);

  const justificationItems = useMemo(() => {
    if (!projectId) return [] as Array<{
      id: string;
      classId: string;
      className: string;
      studentId: string;
      studentName: string;
      date: string;
      message: string;
      createdAt: string;
    }>;

    const clsById = new Map(classes.map((c) => [c.id, c.name] as const));
    const stById = new Map(students.map((s) => [s.id, s.socialName || s.preferredName || s.fullName] as const));

    const all = justifications
      .filter((j) => String(j.date || "").startsWith(thisMonth))
      .slice()
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });

    return all.map((j) => ({
      id: j.id,
      classId: j.classId,
      className: clsById.get(j.classId) || "Turma",
      studentId: j.studentId,
      studentName: stById.get(j.studentId) || "Aluno",
      date: j.date,
      message: j.message,
      createdAt: j.createdAt,
    }));
  }, [projectId, classes, students, thisMonth, justifications]);

  const justificationCount = justificationItems.length;
  const topJustifications = justificationItems.slice(0, 3);

  useEffect(() => {
    const run = async () => {
      // Fallbacks locais (para quando o Supabase não estiver configurado)
      let nextClasses = readScoped<SchoolClass[]>("classes", []);
      let nextStudents = readGlobalStudents<StudentRegistration[]>([]);

      if (projectId) {
        // Não dependemos mais de Supabase Auth aqui: as telas do Modo B usam RPCs.

        // 1) Turmas (fonte da verdade)
        try {
          const res = await fetchClassesRemoteWithMeta(projectId);
          if (res.classes.length) {
            nextClasses = res.classes;
          }
        } catch {
          // ignore
        }

        // 2) Alunos (fonte da verdade, com fallback modo B)
        try {
          const remoteStudents = await fetchStudentsRemote(projectId);
          if (remoteStudents.length) {
            nextStudents = remoteStudents;
          }
        } catch {
          // ignore
        }

        // 3) Matrículas (fonte da verdade) → preenche studentIds nas turmas
        try {
          const enrollments = await fetchActiveEnrollmentsByProject(projectId);
          const byClass = new Map<string, string[]>();
          for (const e of enrollments) {
            const arr = byClass.get(e.class_id) || [];
            arr.push(e.student_id);
            byClass.set(e.class_id, arr);
          }

          nextClasses = nextClasses.map((c) => ({
            ...c,
            studentIds: byClass.get(c.id) || [],
          }));
        } catch {
          // ignore
        }

        try {
          writeScoped("classes", nextClasses);
        } catch {
          // ignore
        }
      }

      // Project-scoped (classes/teachers ainda usam cache local)
      setClasses(nextClasses);
      setStudents(nextStudents);
      setTeachers(readScoped("teachers", []));

      if (projectId) {
        setJustifications(await fetchStudentJustificationsRemote(projectId));
      } else {
        setJustifications([]);
      }
    };

    void run();
  }, [projectId, base]);

  const classesById = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const selectedStudentClassName = useMemo(() => {
    if (!selectedStudent?.id) return "";
    for (const c of classes) {
      if ((c.studentIds || []).includes(selectedStudent.id)) return c.name;
    }
    return "";
  }, [classes, selectedStudent?.id]);

  const kpis = useMemo(() => {
    const active = classes.filter((c) => c.status === "Ativo");
    const closed = classes.filter((c) => c.status !== "Ativo");

    const allAttendance = getAllAttendance();
    const sessionsThisMonth = allAttendance.filter((s) => String(s.date || "").startsWith(thisMonth));

    const uniquePresentStudentIds = new Set<string>();
    for (const s of sessionsThisMonth) {
      for (const pid of ((s as any).presentStudentIds || []) as string[]) uniquePresentStudentIds.add(pid);
    }

    const totalStudents = students.length;
    const activeStudents = uniquePresentStudentIds.size;

    const list: KPI[] = [
      {
        label: "Turmas ativas",
        value: active.length,
        icon: <BookOpen className="h-5 w-5" />,
        tone: "primary",
      },
      {
        label: "Turmas encerradas",
        value: closed.length,
        icon: <FileCheck2 className="h-5 w-5" />,
        tone: "secondary",
      },
      {
        label: "Alunos cadastrados",
        value: totalStudents,
        icon: <GraduationCap className="h-5 w-5" />,
        tone: "sky",
      },
      {
        label: "Alunos ativos (mês)",
        value: activeStudents,
        icon: <ClipboardCheck className="h-5 w-5" />,
        tone: "amber",
      },
    ];

    return list;
  }, [classes, students.length, thisMonth]);

  const activeClasses = useMemo(() => classes.filter((c) => c.status === "Ativo"), [classes]);

  const enrolledStudentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cls of activeClasses) {
      for (const sid of cls.studentIds || []) ids.add(sid);
    }
    return ids;
  }, [activeClasses]);

  const activeStudentsInClasses = useMemo(() => {
    // status no cadastro do aluno é string; tratamos "Ativo" como ativo.
    return students.filter(
      (s) => enrolledStudentIds.has(s.id) && (s.status || "").toLowerCase() !== "inativo",
    );
  }, [students, enrolledStudentIds]);

  const activeTeachers = useMemo(() => teachers.filter((t) => t.status === "Ativo"), [teachers]);

  const attendanceThisMonth = useMemo(() => {
    const sessions = getAllAttendance();
    const activeClassIds = new Set(activeClasses.map((c) => c.id));
    return sessions.filter((s) => activeClassIds.has(s.classId) && s.date.startsWith(thisMonth));
  }, [activeClasses, thisMonth]);

  const attendanceDatesThisMonth = useMemo(() => {
    const set = new Set<string>();
    for (const s of attendanceThisMonth) set.add(s.date);
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((ymd) => {
        const [y, m, d] = ymd.split("-").map(Number);
        return new Date(y, m - 1, d);
      });
  }, [attendanceThisMonth]);

  const birthdaysThisMonth = useMemo(() => {
    const m = today.getMonth() + 1;
    const month = String(m).padStart(2, "0");
    const currentYear = today.getFullYear();

    return activeStudentsInClasses
      .filter((s) => {
        const parts = (s.birthDate || "").split("-");
        if (parts.length !== 3) return false;
        return parts[1] === month;
      })
      .map((s) => {
        const [y, mo, d] = s.birthDate.split("-");
        const day = Number(d);
        const turning = Number.isFinite(Number(y)) ? currentYear - Number(y) : undefined;
        return { student: s, day, month: mo, turning };
      })
      .sort((a, b) => a.day - b.day);
  }, [activeStudentsInClasses, today]);

  const birthdaysTodayCount = useMemo(
    () => birthdaysThisMonth.filter((b) => b.day === today.getDate()).length,
    [birthdaysThisMonth, today],
  );

  const schoolTypeCounts = useMemo(() => {
    const counts = { pública: 0, privada: 0, outros: 0 };
    for (const s of activeStudentsInClasses) counts[normalizeSchoolType(s)] += 1;
    return counts;
  }, [activeStudentsInClasses]);

  const schoolTypeData = useMemo(() => {
    return [
      { name: "Pública", value: schoolTypeCounts["pública"], color: "hsl(var(--primary))" },
      { name: "Privada", value: schoolTypeCounts["privada"], color: "hsl(var(--secondary))" },
      { name: "Outros", value: schoolTypeCounts["outros"], color: "#60a5fa" },
    ].filter((x) => x.value > 0);
  }, [schoolTypeCounts]);

  const institutionsFullData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of activeStudentsInClasses) {
      const name = (s.schoolName || s.schoolOther || "Não informado").trim() || "Não informado";
      map.set(name, (map.get(name) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeStudentsInClasses]);

  const institutionsData = useMemo(() => {
    const top = institutionsFullData.slice(0, 8);
    const rest = institutionsFullData.slice(8);
    const restSum = rest.reduce((acc, cur) => acc + cur.value, 0);
    return restSum > 0 ? [...top, { name: "Outras", value: restSum }] : top;
  }, [institutionsFullData]);

  const neighborhoodsFullData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of activeStudentsInClasses) {
      const name = (s.neighborhood || "Não informado").trim() || "Não informado";
      map.set(name, (map.get(name) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeStudentsInClasses]);

  const neighborhoodsData = useMemo(
    () => neighborhoodsFullData.slice(0, 10),
    [neighborhoodsFullData],
  );

  const calendarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thisMonth],
  );

  const openStudent = (s: StudentRegistration) => {
    setSelectedStudent(s);
    setIsStudentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {justificationCount > 0 && (
        <>
          <Alert
            variant="destructive"
            className="rounded-[2.25rem] border-rose-200 bg-rose-50 text-rose-900 [&>svg]:text-rose-700"
          >
            <FileCheck2 className="h-5 w-5" />
            <div className="flex-1">
              <AlertTitle className="font-black">
                {justificationCount} justificativa(s) de falta enviada(s) no projeto
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  {topJustifications.map((j) => (
                    <div
                      key={j.id}
                      className="rounded-[1.5rem] border border-rose-200/70 bg-white/70 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-rose-900 truncate">
                            {j.studentName} • {j.className}
                          </p>
                          <p className="text-xs font-bold text-rose-800/90 mt-1">
                            Data: {new Date(j.date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </p>
                          <p className="mt-2 text-xs font-bold text-rose-900/90 line-clamp-2 whitespace-pre-wrap">
                            {j.message}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl font-black border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                          onClick={() => navigate(`${base}/turmas/${j.classId}`)}
                        >
                          Ver turma <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      className="rounded-2xl font-black bg-rose-600 hover:bg-rose-700 text-white"
                      onClick={() => setJustificationsOpen(true)}
                    >
                      Ver todas ({justificationCount})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl font-black border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                      onClick={() => navigate(`${base}/turmas`) }
                    >
                      Ir para Turmas
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </Alert>

          <Dialog open={justificationsOpen} onOpenChange={setJustificationsOpen}>
            <DialogContent className="rounded-[2rem] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-primary">
                  Justificativas de falta ({justificationCount})
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-3">
                  {justificationItems.map((j) => (
                    <div key={j.id} className="rounded-[1.75rem] border border-slate-100 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {j.studentName} • {j.className}
                          </p>
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            {new Date(j.date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl font-black"
                          onClick={() => {
                            setJustificationsOpen(false);
                            navigate(`${base}/turmas/${j.classId}`);
                          }}
                        >
                          Abrir
                        </Button>
                      </div>
                      <p className="mt-3 text-sm font-bold text-slate-700 whitespace-pre-wrap">{j.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </>
      )}

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isStudentDialogOpen}
        onClose={() => setIsStudentDialogOpen(false)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 font-medium">
            Indicadores e visões rápidas com base nas turmas e chamadas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 border border-slate-100 shadow-sm text-slate-600">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-black capitalize">{calendarMonthLabel}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const tone =
            k.tone === "primary"
              ? "bg-primary/10 text-primary border-primary/15"
              : k.tone === "secondary"
                ? "bg-secondary/10 text-secondary border-secondary/15"
                : k.tone === "sky"
                  ? "bg-sky-500/10 text-sky-700 border-sky-500/15"
                  : "bg-amber-500/10 text-amber-700 border-amber-500/15";

          return (
            <Card
              key={k.label}
              className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2rem]"
            >
              <CardContent className="p-6">
                <div
                  className={"w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border " + tone}
                >
                  {k.icon}
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  {k.label}
                </p>
                <div className="text-3xl font-black text-primary tracking-tight">{k.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* BIRTHDAYS (HIGHLIGHT) */}
      <Card className="border-none shadow-2xl shadow-primary/10 bg-white rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-black text-primary flex items-center gap-3">
                <span className="h-12 w-12 rounded-[1.6rem] bg-secondary/15 border border-secondary/25 text-primary flex items-center justify-center">
                  <Gift className="h-6 w-6" />
                </span>
                Aniversariantes do mês
              </CardTitle>
              <p className="text-slate-500 font-medium mt-2">
                Clique no nome para abrir a ficha do aluno.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/15 px-4 py-2 text-xs font-black">
                Total: {birthdaysThisMonth.length}
              </span>
              <span
                className={
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black " +
                  (birthdaysTodayCount > 0
                    ? "bg-secondary/15 text-primary border-secondary/25"
                    : "bg-slate-50 text-slate-600 border-slate-200")
                }
              >
                Hoje: {birthdaysTodayCount}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 pt-0">
          <div className="rounded-[2.25rem] border border-slate-100 bg-slate-50/50 p-4 md:p-5">
            {birthdaysThisMonth.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-bold text-slate-500">Nenhum aniversariante neste mês.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[360px] pr-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {birthdaysThisMonth.map(({ student: s, day, turning }) => {
                    const isToday = day === today.getDate();
                    const displayName = s.socialName || s.preferredName || s.fullName;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openStudent(s)}
                        className={
                          "group w-full text-left flex items-center justify-between gap-3 rounded-[1.75rem] border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 " +
                          (isToday
                            ? "border-primary/30 bg-white"
                            : "border-white/60 bg-white hover:bg-slate-50")
                        }
                        title="Abrir ficha do aluno"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={
                              "h-12 w-12 rounded-2xl overflow-hidden ring-1 flex items-center justify-center font-black shrink-0 " +
                              (isToday
                                ? "bg-primary text-white ring-primary/20"
                                : "bg-white text-primary ring-slate-200")
                            }
                          >
                            {s.photo ? (
                              <img
                                src={s.photo}
                                alt={s.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (displayName || "A").charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-primary truncate group-hover:underline">
                              {displayName}
                            </p>
                            <p className="text-xs font-bold text-slate-500 truncate">{s.fullName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {typeof turning === "number" && (
                            <span className="hidden sm:inline-flex rounded-full bg-secondary/15 text-primary border border-secondary/25 px-3 py-1 text-xs font-black">
                              {turning} anos
                            </span>
                          )}
                          <span
                            className={
                              "rounded-2xl px-3 py-2 text-sm font-black border " +
                              (isToday
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-slate-700 border-slate-200")
                            }
                          >
                            {String(day).padStart(2, "0")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Calendar */}
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-4">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Calendário do mês
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">Dias com chamada ficam marcados.</p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-2">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-3">
              <Calendar
                mode="single"
                month={today}
                selected={undefined}
                onSelect={() => {}}
                modifiers={{ attendance: attendanceDatesThisMonth }}
                modifiersClassNames={{
                  attendance:
                    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                }}
                className="rounded-2xl"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {attendanceDatesThisMonth.length} dia(s) com chamada
              </span>
            </div>
          </CardContent>
        </Card>

        {/* School / institutions */}
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <School className="h-5 w-5" /> Escolaridade / Instituições
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">
              Clique nos gráficos para imprimir o relatório.
            </p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 grid gap-6 lg:grid-cols-[280px_1fr]">
            <button
              type="button"
              className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() =>
                printSchoolTypeReport({
                  monthKey: thisMonth,
                  classCount: activeClasses.length,
                  teacherCount: activeTeachers.length,
                  studentCount: activeStudentsInClasses.length,
                  rows: [
                    { name: "Pública", value: schoolTypeCounts["pública"] },
                    { name: "Privada", value: schoolTypeCounts["privada"] },
                    { name: "Outros", value: schoolTypeCounts["outros"] },
                  ].filter((r) => r.value > 0),
                })
              }
              title="Imprimir relatório de tipo de escola"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de escola</p>
                <span className="text-[10px] font-black text-primary/80">Imprimir</span>
              </div>
              {schoolTypeData.length === 0 ? (
                <div className="py-10 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={schoolTypeData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {schoolTypeData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 space-y-2">
                {schoolTypeData.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-sm font-bold text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span>{s.name}</span>
                    </div>
                    <span className="text-slate-700 font-black">{s.value}</span>
                  </div>
                ))}
              </div>
            </button>

            <button
              type="button"
              className="rounded-[2rem] border border-slate-100 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() =>
                printInstitutionsReport({
                  monthKey: thisMonth,
                  classCount: activeClasses.length,
                  teacherCount: activeTeachers.length,
                  studentCount: activeStudentsInClasses.length,
                  rows: institutionsFullData,
                })
              }
              title="Imprimir relatório de instituições"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instituições</p>
                <span className="text-[10px] font-black text-primary/80">Imprimir</span>
              </div>
              {institutionsData.length === 0 ? (
                <div className="py-10 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={institutionsData} layout="vertical" margin={{ left: 40, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 800 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={160}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]}>
                        {institutionsData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                            opacity={0.9}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Total instituições: {institutionsFullData.length}</span>
                <span className="text-xs font-black text-slate-700">Clique para ver a lista completa</span>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Neighborhoods */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() =>
          printNeighborhoodsReport({
            monthKey: thisMonth,
            classCount: activeClasses.length,
            teacherCount: activeTeachers.length,
            studentCount: activeStudentsInClasses.length,
            rows: neighborhoodsFullData,
          })
        }
        title="Imprimir relatório de bairros"
      >
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden hover:bg-slate-50/50 transition-colors">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <MapPinned className="h-5 w-5" /> Bairros
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">
              Clique no gráfico para imprimir o relatório completo.
            </p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            {neighborhoodsData.length === 0 ? (
              <div className="py-12 text-center text-sm font-bold text-slate-400">Sem dados.</div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={neighborhoodsData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 900 }}
                      tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + "…" : v)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                      }}
                    />
                    <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                      {neighborhoodsData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={index % 2 === 0 ? "#60a5fa" : "hsl(var(--primary))"}
                          opacity={0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500">Total bairros: {neighborhoodsFullData.length}</span>
              <span className="text-xs font-black text-slate-700">Clique para ver a lista completa</span>
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}