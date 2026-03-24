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
  Layers,
  MapPinned,
  School,
  Users,
  FileCheck2,
  ExternalLink,
  MessageSquarePlus,
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
import { fetchAttendanceSessionsRemote } from "@/integrations/supabase/attendance";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceSession } from "@/types/attendance";

import { getAreaBaseFromPathname } from "@/utils/route-base";
import { fetchClassesRemoteWithMeta } from "@/services/classesService";
import { fetchStudentsRemote, fetchStudents } from "@/services/studentsService";
import { fetchProjectsFromDb } from "@/integrations/supabase/projects";

import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";
import { readGlobalTeachers } from "@/utils/teachers";
import { readGlobalCoordinators } from "@/utils/coordinators";
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

// ── Feriados ──────────────────────────────────────────────────────────────
type HolidayEntry = { date: string; name: string; type: "nacional" | "rj" };

function computeEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getYearHolidays(year: number): HolidayEntry[] {
  const easter = computeEaster(year);
  const shift = (n: number) => { const d = new Date(easter); d.setDate(d.getDate() + n); return d; };
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [
    { date: `${year}-01-01`, name: "Confraternização Universal", type: "nacional" },
    { date: `${year}-01-20`, name: "São Sebastião", type: "rj" },
    { date: fmt(shift(-48)), name: "Carnaval (2ª feira)", type: "nacional" },
    { date: fmt(shift(-47)), name: "Carnaval (3ª feira)", type: "nacional" },
    { date: fmt(shift(-2)), name: "Paixão de Cristo", type: "nacional" },
    { date: `${year}-04-21`, name: "Tiradentes", type: "nacional" },
    { date: `${year}-04-23`, name: "São Jorge", type: "rj" },
    { date: `${year}-05-01`, name: "Dia do Trabalho", type: "nacional" },
    { date: fmt(shift(60)), name: "Corpus Christi", type: "nacional" },
    { date: `${year}-09-07`, name: "Independência do Brasil", type: "nacional" },
    { date: `${year}-10-12`, name: "Nossa Sra. Aparecida", type: "nacional" },
    { date: `${year}-11-02`, name: "Finados", type: "nacional" },
    { date: `${year}-11-15`, name: "Proclamação da República", type: "nacional" },
    { date: `${year}-11-20`, name: "Consciência Negra", type: "nacional" },
    { date: `${year}-12-25`, name: "Natal", type: "nacional" },
  ].sort((a, b) => a.date.localeCompare(b.date));
}
// ──────────────────────────────────────────────────────────────────────────

export default function Dashboard({ embeddedForRole }: { embeddedForRole?: "professor" | "coordenador" } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(
    () => embeddedForRole
      ? (`/${embeddedForRole}` as AreaBase)
      : getAreaBaseFromPathname(location.pathname),
    [location.pathname, embeddedForRole],
  );

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [justifications, setJustifications] = useState<StudentJustification[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [adminStats, setAdminStats] = useState<{
    projects: number;
    activeClasses: number;
    enrolledStudents: number;
    justificationsThisMonth: number;
  } | null>(null);

  const [allAdminStudents, setAllAdminStudents] = useState<StudentRegistration[]>([]);
  const [adminProjectCounts, setAdminProjectCounts] = useState<{ name: string; value: number }[]>([]);
  const [adminProjects, setAdminProjects] = useState<{ id: string; name: string }[]>([]);
  const [adminStudentIdsByProject, setAdminStudentIdsByProject] = useState<Record<string, string[]>>({});
  const [adminChartProjectFilter, setAdminChartProjectFilter] = useState<"all" | string>("all");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSelectedProjects, setShareSelectedProjects] = useState<string[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [justificationsOpen, setJustificationsOpen] = useState(false);

  // Justificativas de professores do projeto (coordenador)
  const [teacherJustifications, setTeacherJustifications] = useState<Array<{
    id: string;
    teacherId: string;
    teacherName: string;
    startDate: string;
    endDate: string | null;
    message: string;
    createdAt: string;
  }>>([]);

  const today = new Date();
  const thisMonth = monthKey(today);

  const projectId = useMemo(() => getActiveProjectId(), [location.pathname]);

  const currentUser = useMemo(() => {
    const tLogin = getTeacherSessionLogin();
    if (tLogin) {
      const t = readGlobalTeachers([]).find((x) => x.authLogin === tLogin);
      if (t) return { name: t.preferredName || t.fullName, photo: t.photo || null, role: "Professor" };
    }
    const cLogin = getCoordinatorSessionLogin();
    if (cLogin) {
      const c = readGlobalCoordinators([]).find((x) => x.authLogin === cLogin);
      if (c) return { name: c.fullName, photo: c.photo || null, role: "Coordenador" };
    }
    return null;
  }, []);

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
        try {
          const sessions = await fetchAttendanceSessionsRemote(projectId);
          setAttendanceSessions(sessions);
        } catch {
          // ignore
        }

        // Justificativas de professores do projeto (visível para coordenador e admin)
        if (base === "/coordenador" || base === "") {
          try {
            const monthStart = `${thisMonth}-01`;
            const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
            // Busca 31 dias antes para capturar ranges que começaram no mês anterior
            const extStart = new Date(monthStart);
            extStart.setDate(extStart.getDate() - 31);
            const extStartStr = extStart.toISOString().slice(0, 10);

            const { data: tjData } = await supabase
              .from("teacher_justifications")
              .select("*")
              .eq("project_id", projectId)
              .gte("start_date", extStartStr)
              .lt("start_date", nextMonthStr)
              .order("start_date", { ascending: false });

            if (tjData && tjData.length > 0) {
              // Fallback: busca nomes do localStorage caso teacher_name não esteja preenchido
              const localTeachers = readGlobalTeachers([]);
              const localMap = new Map<string, string>(
                localTeachers.map((t: any) => [t.id, t.fullName || t.full_name || "Professor"]),
              );

              // Filtra apenas os que se sobrepõem ao mês corrente
              const items = (tjData as any[]).filter((r) => {
                const end = r.end_date || r.start_date;
                return r.start_date <= nextMonthStr && end >= monthStart;
              });

              setTeacherJustifications(
                items.map((r) => ({
                  id: r.id,
                  teacherId: r.teacher_id,
                  teacherName: r.teacher_name || localMap.get(r.teacher_id) || "Professor",
                  startDate: r.start_date,
                  endDate: r.end_date ?? null,
                  message: r.message,
                  createdAt: r.created_at,
                })),
              );
            } else {
              setTeacherJustifications([]);
            }
          } catch {
            // ignore
          }
        }
      } else {
        setJustifications([]);
        setAttendanceSessions([]);
        setTeacherJustifications([]);
      }

      // Admin: agrega KPIs de todos os projetos
      if (base === "") {
        try {
          const [
            { count: projectCount },
            { count: classCount },
            { data: enrollData },
          ] = await Promise.all([
            supabase.from("projects").select("id", { count: "exact", head: true }),
            supabase.from("classes").select("id", { count: "exact", head: true }).eq("status", "Ativo"),
            supabase.from("class_student_enrollments").select("student_id"),
          ]);

          const uniqueStudents = new Set((enrollData || []).map((e: any) => e.student_id)).size;

          const monthStart = `${thisMonth}-01`;
          const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
          const { count: justifCount } = await supabase
            .from("student_justifications")
            .select("id", { count: "exact", head: true })
            .gte("date", monthStart)
            .lt("date", nextMonthStr);

          setAdminStats({
            projects: projectCount ?? 0,
            activeClasses: classCount ?? 0,
            enrolledStudents: uniqueStudents,
            justificationsThisMonth: justifCount ?? 0,
          });
        } catch {
          // ignore
        }

          // Todos os alunos do sistema (para gráficos globais)
          try {
            const all = await fetchStudents();
            setAllAdminStudents(all);
          } catch {
            // ignore
          }

          // Alunos por projeto
          try {
            const projects = await fetchProjectsFromDb();
            const { data: enrollData2 } = await supabase
              .from("class_student_enrollments")
              .select("student_id, classes!inner(project_id)");

            const byProject = new Map<string, Set<string>>();
            for (const e of (enrollData2 || []) as any[]) {
              const pid = e.classes?.project_id;
              if (!pid) continue;
              if (!byProject.has(pid)) byProject.set(pid, new Set());
              byProject.get(pid)!.add(e.student_id);
            }

            const projectCountsList = projects
              .map((p) => ({ name: p.name, value: byProject.get(p.id)?.size ?? 0 }))
              .filter((p) => p.value > 0)
              .sort((a, b) => b.value - a.value);

            setAdminProjectCounts(projectCountsList);
            setAdminProjects(projects.map((p) => ({ id: p.id, name: p.name })));
            setAdminStudentIdsByProject(
              Object.fromEntries(
                Array.from(byProject.entries()).map(([k, v]) => [k, Array.from(v)]),
              ),
            );
          } catch {
            // ignore
          }
      }
    };

    void run();
  }, [projectId, base, thisMonth]);

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

  const kpis = useMemo((): KPI[] => {
    // Admin: KPIs agregados de todos os projetos
    if (base === "") {
      const stats = adminStats ?? { projects: 0, activeClasses: 0, enrolledStudents: 0, justificationsThisMonth: 0 };
      return [
        {
          label: "Projetos",
          value: stats.projects,
          icon: <Layers className="h-5 w-5" />,
          tone: "primary",
        },
        {
          label: "Turmas ativas",
          value: stats.activeClasses,
          icon: <BookOpen className="h-5 w-5" />,
          tone: "sky",
        },
        {
          label: "Alunos matriculados",
          value: stats.enrolledStudents,
          icon: <GraduationCap className="h-5 w-5" />,
          tone: "secondary",
        },
        {
          label: "Justificativas (mês)",
          value: stats.justificationsThisMonth,
          icon: <ClipboardCheck className="h-5 w-5" />,
          tone: stats.justificationsThisMonth > 0 ? "amber" : "secondary",
        },
      ];
    }

    // Professor / Coordenador: dados do projeto ativo vinculado a eles
    const active = classes.filter((c) => c.status === "Ativo");
    // Alunos únicos matriculados nas turmas do projeto (via class_student_enrollments)
    const enrolledIds = new Set(active.flatMap((c) => c.studentIds || []));

    return [
      {
        label: "Turmas ativas",
        value: active.length,
        icon: <BookOpen className="h-5 w-5" />,
        tone: "primary",
      },
      {
        label: "Alunos matriculados",
        value: enrolledIds.size,
        icon: <GraduationCap className="h-5 w-5" />,
        tone: "sky",
      },
    ];
  }, [base, adminStats, classes]);

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

  // ── Gráficos globais admin ────────────────────────────────────────────────

  const adminChartStudents = useMemo(() => {
    if (adminChartProjectFilter === "all") return allAdminStudents;
    const ids = new Set(adminStudentIdsByProject[adminChartProjectFilter] || []);
    return allAdminStudents.filter((s) => ids.has(s.id));
  }, [allAdminStudents, adminChartProjectFilter, adminStudentIdsByProject]);

  const globalNeighborhoodsData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of adminChartStudents) {
      const name = (s.neighborhood || "Não informado").trim() || "Não informado";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [adminChartStudents]);

  const globalSchoolTypeData = useMemo(() => {
    const counts = { pública: 0, privada: 0, outros: 0 };
    for (const s of adminChartStudents) counts[normalizeSchoolType(s)] += 1;
    return [
      { name: "Pública", value: counts["pública"], color: "hsl(var(--primary))" },
      { name: "Privada", value: counts["privada"], color: "hsl(var(--secondary))" },
      { name: "Outros", value: counts["outros"], color: "#60a5fa" },
    ].filter((x) => x.value > 0);
  }, [adminChartStudents]);

  const globalAgeRangeData = useMemo(() => {
    const buckets: Record<string, number> = {
      "Até 10": 0,
      "11 – 14": 0,
      "15 – 17": 0,
      "18 – 24": 0,
      "25 – 35": 0,
      "36+": 0,
    };
    const currentYear = new Date().getFullYear();
    for (const s of adminChartStudents) {
      const parts = (s.birthDate || "").split("-");
      if (parts.length !== 3) continue;
      const age = currentYear - Number(parts[0]);
      if (!Number.isFinite(age) || age < 0) continue;
      if (age <= 10) buckets["Até 10"] += 1;
      else if (age <= 14) buckets["11 – 14"] += 1;
      else if (age <= 17) buckets["15 – 17"] += 1;
      else if (age <= 24) buckets["18 – 24"] += 1;
      else if (age <= 35) buckets["25 – 35"] += 1;
      else buckets["36+"] += 1;
    }
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0);
  }, [adminChartStudents]);

  // Faixa de idade — professor/coordenador (dados do projeto)
  const localAgeRangeData = useMemo(() => {
    const buckets: Record<string, number> = {
      "Até 10": 0, "11 – 14": 0, "15 – 17": 0, "18 – 24": 0, "25 – 35": 0, "36+": 0,
    };
    const currentYear = new Date().getFullYear();
    for (const s of activeStudentsInClasses) {
      const parts = (s.birthDate || "").split("-");
      if (parts.length !== 3) continue;
      const age = currentYear - Number(parts[0]);
      if (!Number.isFinite(age) || age < 0) continue;
      if (age <= 10) buckets["Até 10"] += 1;
      else if (age <= 14) buckets["11 – 14"] += 1;
      else if (age <= 17) buckets["15 – 17"] += 1;
      else if (age <= 24) buckets["18 – 24"] += 1;
      else if (age <= 35) buckets["25 – 35"] += 1;
      else buckets["36+"] += 1;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0);
  }, [activeStudentsInClasses]);

  // Alunos por turma — professor/coordenador
  const studentsByClassData = useMemo(() => {
    return activeClasses
      .map((c) => ({ name: c.name, value: (c.studentIds || []).length }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeClasses]);

  const calendarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thisMonth],
  );

  const holidays = useMemo(() => getYearHolidays(today.getFullYear()), []);

  const holidayDatesThisMonth = useMemo(
    () => holidays
      .filter((h) => h.date.startsWith(thisMonth))
      .map((h) => { const [y, m, d] = h.date.split("-").map(Number); return new Date(y, m - 1, d); }),
    [holidays, thisMonth],
  );

  const attendanceStats = useMemo(() => {
    const finalized = attendanceSessions.filter((s) => s.finalizedAt);

    // Mês atual
    const monthSessions = finalized.filter((s) => s.date.startsWith(thisMonth));
    const mc = { presente: 0, falta: 0, atrasado: 0, justificada: 0 };
    let monthTotal = 0;
    for (const s of monthSessions) {
      for (const st of Object.values(s.records || {})) {
        if (st in mc) { (mc as any)[st]++; monthTotal++; }
      }
    }

    // Por mês no ano corrente
    const year = new Date().getFullYear();
    const perMonth = Array.from({ length: 12 }, (_, i) => {
      const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
      const mSess = finalized.filter((s) => s.date.startsWith(mk));
      const c = { presente: 0, falta: 0, atrasado: 0, justificada: 0 };
      for (const s of mSess) {
        for (const st of Object.values(s.records || {})) {
          if (st in c) (c as any)[st]++;
        }
      }
      return { monthKey: mk, ...c };
    });

    const activeMonths = perMonth.filter((m) => m.presente + m.falta + m.atrasado + m.justificada > 0);
    const n = activeMonths.length || 1;
    const annualAvg = {
      presente: Math.round(activeMonths.reduce((a, m) => a + m.presente, 0) / n),
      falta: Math.round(activeMonths.reduce((a, m) => a + m.falta, 0) / n),
      atrasado: Math.round(activeMonths.reduce((a, m) => a + m.atrasado, 0) / n),
      justificada: Math.round(activeMonths.reduce((a, m) => a + m.justificada, 0) / n),
    };

    return { mc, monthTotal, perMonth, annualAvg, hasData: finalized.length > 0, activeMonths: activeMonths.length };
  }, [attendanceSessions, thisMonth]);

  const openStudent = (s: StudentRegistration) => {
    setSelectedStudent(s);
    setIsStudentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {justificationCount > 0 && !embeddedForRole && (
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
        <div className="flex items-center gap-4">
          {currentUser?.photo && (
            <div className="shrink-0 w-14 h-14 rounded-[1.25rem] overflow-hidden border-2 border-white shadow-lg">
              <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            {currentUser && (
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5">
                {currentUser.role}
              </p>
            )}
            <h1 className="text-3xl font-black text-primary tracking-tight">
              {currentUser ? `Olá, ${currentUser.name.split(" ")[0]}.` : "Painel de Controle"}
            </h1>
            <p className="text-slate-500 font-medium">
              Indicadores e visões rápidas com base nas turmas e chamadas.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 border border-slate-100 shadow-sm text-slate-600">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-black capitalize">{calendarMonthLabel}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className={`grid gap-6 ${base === "" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
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

      {/* Card de justificativas de professores — destaque para coordenador e admin */}
      {(base === "/coordenador" || base === "") && teacherJustifications.length > 0 && (
        <Card className="border-none shadow-xl shadow-amber-100/60 bg-amber-50 rounded-[2rem] overflow-hidden">
          <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <MessageSquarePlus className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-amber-900">
                  Justificativas de professores — {new Date(thisMonth + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </CardTitle>
                <p className="text-xs font-bold text-amber-700/80 mt-0.5">
                  {teacherJustifications.length} justificativa(s) registrada(s) este mês
                </p>
              </div>
            </div>
            <Badge className="rounded-full bg-amber-500 text-white border-none font-black shrink-0">
              {teacherJustifications.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-2">
            {teacherJustifications.map((tj) => {
              const start = new Date(tj.startDate + "T00:00:00").toLocaleDateString("pt-BR");
              const end = tj.endDate ? new Date(tj.endDate + "T00:00:00").toLocaleDateString("pt-BR") : null;
              const periodo = end && end !== start ? `${start} até ${end}` : start;
              return (
                <div key={tj.id} className="rounded-[1.5rem] bg-white border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-amber-900">{tj.teacherName}</span>
                      <Badge className="rounded-full bg-amber-100 text-amber-800 border-none font-black text-[10px]">
                        <CalendarDays className="h-3 w-3 mr-1" />{periodo}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">{tj.message}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Gráficos professor/coordenador */}
      {base !== "" && activeStudentsInClasses.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Alunos por turma */}
          {studentsByClassData.length > 0 && (
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8 pb-2">
                <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Alunos por turma
                </CardTitle>
                <p className="text-slate-500 font-medium mt-1">Matrículas por turma do projeto.</p>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentsByClassData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 900 }} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any) => [v, "Alunos"]} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {studentsByClassData.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} opacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bairros */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <MapPinned className="h-5 w-5" /> Bairros
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Residência dos participantes deste projeto.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4">
              {neighborhoodsData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={neighborhoodsData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any) => [v, "Alunos"]} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {neighborhoodsData.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "#60a5fa" : "hsl(var(--primary))"} opacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Situação escolar */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <School className="h-5 w-5" /> Situação escolar
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Tipo de escola — participantes deste projeto.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4 flex flex-col items-center">
              {schoolTypeData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={schoolTypeData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {schoolTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 w-full space-y-1.5">
                    {schoolTypeData.map((d) => {
                      const total = schoolTypeData.reduce((s, x) => s + x.value, 0);
                      return (
                        <div key={d.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </div>
                          <span className="font-black text-slate-800">{d.value} · {Math.round((d.value / total) * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Faixa de idade */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <Users className="h-5 w-5" /> Faixa de idade
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Distribuição etária — participantes deste projeto.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4">
              {localAgeRangeData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={localAgeRangeData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 900 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any) => [v, "Alunos"]} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {localAgeRangeData.map((_, i) => (
                          <Cell key={i} fill={["hsl(var(--primary))", "hsl(var(--secondary))", "#60a5fa", "#34d399", "#f59e0b", "#f87171"][i % 6]} opacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Gráficos globais — apenas admin */}
      {base === "" && allAdminStudents.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Indicadores globais</p>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl font-black border-slate-200 text-slate-600 gap-2 text-xs"
                onClick={() => {
                  setShareSelectedProjects([]);
                  setShareModalOpen(true);
                }}
              >
                <ExternalLink className="h-4 w-4" /> Compartilhar gráficos
              </Button>

              {/* Modal de compartilhamento */}
              <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
                <DialogContent className="rounded-[2rem] max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black text-primary">Compartilhar gráficos</DialogTitle>
                  </DialogHeader>
                  <div className="mt-2 space-y-4">
                    <p className="text-sm font-medium text-slate-600">
                      Escolha quais projetos deseja incluir no link público:
                    </p>

                    {/* Opção: todos */}
                    <button
                      type="button"
                      onClick={() => setShareSelectedProjects([])}
                      className={
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold transition-colors " +
                        (shareSelectedProjects.length === 0
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                      }
                    >
                      <Layers className="h-4 w-4 shrink-0" />
                      Geral — todos os projetos
                    </button>

                    {/* Projetos individuais */}
                    {adminProjects.map((p) => {
                      const selected = shareSelectedProjects.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setShareSelectedProjects((prev) =>
                              selected ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                            );
                          }}
                          className={
                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold transition-colors " +
                            (selected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                          }
                        >
                          <span className={
                            "h-4 w-4 rounded-md border-2 shrink-0 flex items-center justify-center " +
                            (selected ? "border-white bg-white/20" : "border-slate-300")
                          }>
                            {selected && <span className="h-2 w-2 rounded-sm bg-white" />}
                          </span>
                          {p.name}
                        </button>
                      );
                    })}

                    <Button
                      className="w-full rounded-2xl font-black h-11 gap-2"
                      onClick={() => {
                        let url = `${window.location.origin}/graficos`;
                        if (shareSelectedProjects.length > 0) {
                          url += `?projetos=${shareSelectedProjects.join(",")}`;
                        }
                        navigator.clipboard.writeText(url).then(() => {
                          import("@/utils/toast").then(({ showSuccess }) => showSuccess("Link copiado!"));
                          setShareModalOpen(false);
                        });
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {shareSelectedProjects.length === 0 ? "Copiar link geral" : `Copiar link (${shareSelectedProjects.length} projeto${shareSelectedProjects.length > 1 ? "s" : ""})`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {/* Filtro por projeto */}
            {adminProjects.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAdminChartProjectFilter("all")}
                  className={
                    "h-8 px-4 rounded-2xl text-xs font-black border transition-colors " +
                    (adminChartProjectFilter === "all"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                  }
                >
                  Todos os projetos
                </button>
                {adminProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAdminChartProjectFilter(p.id)}
                    className={
                      "h-8 px-4 rounded-2xl text-xs font-black border transition-colors " +
                      (adminChartProjectFilter === p.id
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Alunos por projeto — só quando "todos" está selecionado */}
          {adminChartProjectFilter === "all" && (
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8 pb-2">
                <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                  <Layers className="h-5 w-5" /> Alunos por projeto
                </CardTitle>
                <p className="text-slate-500 font-medium mt-1">Matrículas únicas em cada projeto.</p>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-4">
                {adminProjectCounts.length === 0 ? (
                  <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
                ) : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adminProjectCounts} margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 11, fontWeight: 900 }}
                          tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 14) + "…" : v)}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                          formatter={(v: any) => [v, "Alunos"]}
                        />
                        <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                          {adminProjectCounts.map((_, i) => (
                            <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} opacity={0.9} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bairros (global) */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <MapPinned className="h-5 w-5" /> Bairros (todos os projetos)
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Top 12 bairros de residência.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4">
              {globalNeighborhoodsData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalNeighborhoodsData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                        tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + "…" : v)}
                        interval={0}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                        formatter={(v: any) => [v, "Alunos"]}
                      />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {globalNeighborhoodsData.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "#60a5fa" : "hsl(var(--primary))"} opacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs font-bold text-slate-400">Total de bairros: {globalNeighborhoodsData.length}</p>
            </CardContent>
          </Card>

          {/* Situação escolar (global) */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <School className="h-5 w-5" /> Situação escolar
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Tipo de escola — todos os projetos.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4 flex flex-col items-center">
              {globalSchoolTypeData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={globalSchoolTypeData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                          {globalSchoolTypeData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any, n: any) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 w-full space-y-1.5">
                    {globalSchoolTypeData.map((d) => {
                      const total = globalSchoolTypeData.reduce((s, x) => s + x.value, 0);
                      return (
                        <div key={d.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </div>
                          <span className="font-black text-slate-800">{d.value} · {Math.round((d.value / total) * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Faixa de idade (global) */}
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <Users className="h-5 w-5" /> Faixa de idade
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">Distribuição etária — todos os projetos.</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4">
              {globalAgeRangeData.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-400">Sem dados.</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalAgeRangeData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12, fontWeight: 900 }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                        formatter={(v: any) => [v, "Alunos"]}
                      />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {globalAgeRangeData.map((_, i) => (
                          <Cell key={i} fill={["hsl(var(--primary))", "hsl(var(--secondary))", "#60a5fa", "#34d399", "#f59e0b", "#f87171"][i % 6]} opacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
        </div>
      )}

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
      <div className={base === "" ? "grid gap-6 lg:grid-cols-[420px_1fr]" : ""}>
        {/* Calendar */}
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-4">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Calendário do mês
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">Chamadas marcadas · feriados destacados.</p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-2 space-y-4">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-3">
              <Calendar
                mode="single"
                month={today}
                selected={undefined}
                onSelect={() => {}}
                modifiers={{ attendance: attendanceDatesThisMonth, holiday: holidayDatesThisMonth }}
                modifiersClassNames={{
                  attendance:
                    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                  holiday: "!bg-orange-100 !text-orange-800 !rounded-full font-black",
                }}
                className="rounded-2xl"
              />
            </div>
            {/* Feriados do mês vigente */}
            {holidayDatesThisMonth.length > 0 && (
            <div className="rounded-[2rem] border border-orange-100 bg-orange-50/50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3">
                Feriados de {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(today)}
              </p>
              <div className="space-y-1.5">
                {holidays.filter((h) => h.date.startsWith(thisMonth)).map((h) => {
                  const [y, m, d] = h.date.split("-").map(Number);
                  const dt = new Date(y, m - 1, d);
                  return (
                    <div key={h.date} className="flex items-center gap-2 text-xs font-bold">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${h.type === "rj" ? "bg-orange-400" : "bg-primary"}`} />
                      <span className="text-slate-500 shrink-0 w-12">
                        {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="text-slate-700">{h.name}</span>
                      {h.type === "rj" && (
                        <span className="ml-auto text-[9px] font-black text-orange-600 bg-orange-100 border border-orange-200 rounded-full px-1.5 py-0.5">RJ</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* School / institutions — apenas admin */}
        {base === "" && <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
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
        </Card>}
      </div>

      {/* Neighborhoods — apenas admin */}
      {base === "" && <button
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
      </button>}

      {/* FREQUÊNCIA — gráfico de roda (pizza) */}
      {attendanceStats.hasData && (
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-4">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Frequência do Projeto
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">Distribuição de presenças, faltas, atrasos e justificativas.</p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Gráfico mês atual */}
              {attendanceStats.monthTotal > 0 && (() => {
                const chartData = [
                  { name: "Presenças", value: attendanceStats.mc.presente, color: "#10b981" },
                  { name: "Faltas", value: attendanceStats.mc.falta, color: "#ef4444" },
                  { name: "Atrasos", value: attendanceStats.mc.atrasado, color: "#f59e0b" },
                  { name: "Justificativas", value: attendanceStats.mc.justificada, color: "#8b5cf6" },
                ].filter((d) => d.value > 0);
                return (
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Este mês</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                            {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any, n: any) => [`${v} (${Math.round((v / attendanceStats.monthTotal) * 100)}%)`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {chartData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</div>
                          <span className="font-black text-slate-800">{d.value} · {Math.round((d.value / attendanceStats.monthTotal) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Gráfico média anual */}
              {attendanceStats.activeMonths > 0 && (() => {
                const annual = { presente: 0, falta: 0, atrasado: 0, justificada: 0 };
                let annualTotal = 0;
                for (const m of attendanceStats.perMonth) {
                  annual.presente += m.presente; annual.falta += m.falta;
                  annual.atrasado += m.atrasado; annual.justificada += m.justificada;
                  annualTotal += m.presente + m.falta + m.atrasado + m.justificada;
                }
                const chartData = [
                  { name: "Presenças", value: annual.presente, color: "#10b981" },
                  { name: "Faltas", value: annual.falta, color: "#ef4444" },
                  { name: "Atrasos", value: annual.atrasado, color: "#f59e0b" },
                  { name: "Justificativas", value: annual.justificada, color: "#8b5cf6" },
                ].filter((d) => d.value > 0);
                return (
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Acumulado {new Date().getFullYear()} ({attendanceStats.activeMonths} mes{attendanceStats.activeMonths !== 1 ? "es" : ""})
                    </p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                            {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={(v: any, n: any) => [`${v} (${annualTotal > 0 ? Math.round((v / annualTotal) * 100) : 0}%)`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {chartData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</div>
                          <span className="font-black text-slate-800">{d.value} · {annualTotal > 0 ? Math.round((d.value / annualTotal) * 100) : 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}