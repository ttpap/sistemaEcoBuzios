"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SchoolClass } from "@/types/class";
import { StudentRegistration } from "@/types/student";
import { AttendanceStatus } from "@/types/attendance";
import type { AttendanceSession } from "@/types/attendance";
import { fetchAttendanceSessionsRemote } from "@/integrations/supabase/attendance";
import { isStudentEnrolledOn, ensureStudentEnrollments } from "@/utils/class-enrollment";
import { generateAttendancePdf, AttendanceMatrix } from "@/utils/attendance-pdf";
import { downloadAttendanceXls } from "@/utils/attendance-xls";
import { showError } from "@/utils/toast";
import { readGlobalStudents, readScoped, writeGlobalStudents, writeScoped } from "@/utils/storage";
import { getActiveProject } from "@/utils/projects";
import { fetchClassesRemoteWithMeta, fetchEnrollmentsRemoteWithMeta } from "@/integrations/supabase/classes";
import { fetchStudentsRemoteWithMeta } from "@/integrations/supabase/students";
import { getSystemLogo } from "@/utils/system-settings";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import { useAuth } from "@/context/AuthContext";
import { Zap } from "lucide-react";

import {
  BarChart3,
  CalendarDays,
  FileDown,
  FileSpreadsheet,
  Printer,
  ClipboardCheck,
  ArrowLeft,
  Layers,
  NotebookPen,
  Users,
  FileText,
} from "lucide-react";

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

function getReportLogoUrl(): string {
  const projectLogo = getActiveProject()?.imageUrl;
  return projectLogo || getSystemLogo() || DEFAULT_LOGO;
}

function getReportProjectName(): string {
  return getActiveProject()?.name || "EcoBúzios";
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatDateCol(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function displaySocialName(s: StudentRegistration) {
  return s.socialName || s.preferredName || s.fullName;
}

function statusShort(s?: AttendanceStatus) {
  switch (s) {
    case "presente":
      return "P";
    case "atrasado":
      return "A";
    case "falta":
      return "F";
    case "justificada":
      return "J";
    default:
      return "";
  }
}

function statusPill(s?: AttendanceStatus) {
  if (!s) return null;
  const base = "inline-flex h-8 min-w-8 items-center justify-center rounded-2xl px-2 text-xs font-black border";
  switch (s) {
    case "presente":
      return <span className={cn(base, "bg-emerald-600 text-white border-emerald-600")}>P</span>;
    case "atrasado":
      return <span className={cn(base, "bg-amber-600 text-white border-amber-600")}>A</span>;
    case "falta":
      return <span className={cn(base, "bg-rose-600 text-white border-rose-600")}>F</span>;
    case "justificada":
      return <span className={cn(base, "bg-sky-600 text-white border-sky-600")}>J</span>;
    default:
      return null;
  }
}

function printAttendanceReport(matrix: AttendanceMatrix) {
  const win = window.open("", "_blank");
  if (!win) return;

  const logoUrl = getReportLogoUrl();
  const projectName = getReportProjectName();

  const title = `RELATÓRIO DE CHAMADA`;
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;
  const generatedAt = new Date().toLocaleString("pt-BR");

  const html = `
  <html>
    <head>
      <title>Relatório de Chamada</title>
      <style>
        :root {
          --primary: #008ca0;
          --accent: #ffa534;
          --slate: #0f172a;
          --muted: #64748b;
          --border: #e2e8f0;
          --soft: #f8fafc;
        }

        * { box-sizing: border-box; }
        body { font-family: Inter, Arial, sans-serif; font-size: 10px; margin: 18px; color: var(--slate); }

        .sheet-header {
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #fff;
          overflow: hidden;
        }
        .brandbar { height: 8px; background: var(--primary); }
        .header-inner { padding: 14px 16px 12px; }
        .toprow { display:flex; align-items:center; justify-content: space-between; gap: 14px; }
        .brand { display:flex; align-items:center; gap: 12px; min-width: 0; }
        .logo { height: 44px; width: auto; object-fit: contain; display:block; }
        .titlewrap { min-width: 0; }
        .proj { font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
        .header { font-weight: 950; font-size: 15px; margin: 3px 0 0; letter-spacing: -0.02em; }
        .sub { font-size: 11px; margin-top: 4px; color: #334155; font-weight: 850; }

        .chip {
          display:inline-flex;
          align-items:center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 900;
          font-size: 10px;
          border: 1px solid rgba(0, 140, 160, 0.22);
          background: rgba(0, 140, 160, 0.08);
          color: var(--primary);
          white-space: nowrap;
        }
        .meta {
          margin-top: 10px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 16px;
          background: var(--soft);
          border: 1px solid var(--border);
          color: #334155;
          font-weight: 800;
        }
        .legend { margin: 12px 2px 12px; font-size: 10px; color: var(--muted); font-weight: 750; }

        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #0f172a; padding: 5px 6px; vertical-align: top; }
        th { background: #f1f5f9; text-align: center; font-weight: 950; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
        td.name { width: 260px; }
        .social { font-weight: 950; }
        .full { color: #475569; font-weight: 800; font-size: 9px; margin-top: 2px; }
        .center { text-align: center; font-weight: 950; }

        @media print {
          @page { size: landscape; margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="sheet-header">
        <div class="brandbar"></div>
        <div class="header-inner">
          <div class="toprow">
            <div class="brand">
              <img class="logo" src="${logoUrl}" alt="Logo" />
              <div class="titlewrap">
                <div class="proj">${projectName}</div>
                <p class="header">${title}</p>
                <div class="sub">${subtitle}</div>
              </div>
            </div>
            <div class="chip">EcoBúzios • Chamada</div>
          </div>

          <div class="meta">
            <div>Gerado em <strong>${generatedAt}</strong></div>
            <div>Status: <strong>P</strong>=Presente • <strong>A</strong>=Atrasado • <strong>F</strong>=Falta • <strong>J</strong>=Justificada • <strong>—</strong>=não estava na turma</div>
          </div>
        </div>
      </div>

      <div class="legend">Dica: você pode gerar PDF ou XLS para arquivar mensalmente.</div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Aluno</th>
            ${matrix.dates.map((d) => `<th>${formatDateCol(d)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${matrix.students
            .map((st) => {
              const name = `${st.socialName || st.preferredName || st.fullName}`;
              const full = st.fullName;
              const tds = matrix.dates
                .map((d) => {
                  const isMember = matrix.membershipByStudentByDate[st.id]?.[d];
                  if (!isMember) return `<td class="center">—</td>`;
                  const s = matrix.statusByStudentByDate[st.id]?.[d];
                  return `<td class="center">${statusShort(s)}</td>`;
                })
                .join("");
              return `<tr><td class="name"><div class="social">${name}</div><div class="full">${full}</div></td>${tds}</tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </body>
  </html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const isTeacherArea = useMemo(() => location.pathname.startsWith("/professor"), [location.pathname]);

  const { profile } = useAuth();
  const canSeeEnel = profile?.role === "admin" || profile?.role === "coordinator";

  const [report, setReport] = useState<"home" | "attendance">("home");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);

  const ALL = "__all__";
  const [classId, setClassId] = useState<string>(ALL);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    const run = async () => {
      // Primeiro: carrega cache local
      setClasses(readScoped<SchoolClass[]>("classes", []));
      setStudents(readGlobalStudents<StudentRegistration[]>([]));

      const activeProjectId = getActiveProject()?.id;
      if (activeProjectId) {
        // Atualiza classes + matrículas + alunos do servidor (necessário no modo B)
        const classRes = await fetchClassesRemoteWithMeta(activeProjectId);
        const baseClasses = classRes.classes.length
          ? classRes.classes
          : readScoped<SchoolClass[]>("classes", []);

        const enriched: SchoolClass[] = [];
        for (const c of baseClasses) {
          const enr = await fetchEnrollmentsRemoteWithMeta(c.id);
          const studentIds = (enr.enrollments || []).filter((e) => !e.removed_at).map((e) => e.student_id);
          enriched.push({ ...c, studentIds });
        }

        writeScoped("classes", enriched);
        setClasses(enriched);

        const stuRes = await fetchStudentsRemoteWithMeta(activeProjectId);
        if (stuRes.students.length) {
          writeGlobalStudents(stuRes.students);
          setStudents(stuRes.students);
        }

        const remote = await fetchAttendanceSessionsRemote(activeProjectId);
        setAttendanceSessions(remote);
      } else {
        setAttendanceSessions([]);
      }
    };

    void run();
  }, []);

  const monthParts = month.split("-");
  const selectedYear = monthParts[0] || String(now.getFullYear());
  const selectedMonthPart = monthParts[1] || String(now.getMonth() + 1).padStart(2, "0");

  const sessionsForClass = useCallback(
    (classId: string) => attendanceSessions.filter((s) => s.classId === classId),
    [attendanceSessions],
  );

  const classesWithCounts = useMemo(() => {
    return classes
      .map((c) => ensureStudentEnrollments(c))
      .map((c) => {
        const enrolled = c.studentIds?.length || 0;
        const sessionsInMonth = sessionsForClass(c.id).filter((s) => s.date.startsWith(month));
        const dates = Array.from(new Set(sessionsInMonth.map((s) => s.date))).sort((a, b) => a.localeCompare(b));
        return {
          cls: c,
          studentsCount: enrolled,
          callDaysCount: dates.length,
        };
      })
      .sort((a, b) => a.cls.name.localeCompare(b.cls.name, "pt-BR"));
  }, [classes, month, sessionsForClass]);

  const totalStudentsInClasses = useMemo(() => {
    const ids = new Set<string>();
    for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);
    return ids.size;
  }, [classes]);

  const selectedClass = useMemo(() => {
    if (classId === ALL) return null;
    const c = classes.find((x) => x.id === classId);
    return c ? ensureStudentEnrollments(c) : null;
  }, [classes, classId]);

  const matrix = useMemo((): AttendanceMatrix | null => {
    if (!selectedClass || !month) return null;

    const sessions = sessionsForClass(selectedClass.id).filter((s) => s.date.startsWith(month));
    const dates = Array.from(new Set(sessions.map((s) => s.date))).sort((a, b) => a.localeCompare(b));
    if (dates.length === 0)
      return {
        className: selectedClass.name,
        month,
        dates: [],
        students: [],
        statusByStudentByDate: {},
        membershipByStudentByDate: {},
      };

    const everIds = new Set<string>([
      ...(selectedClass.studentEnrollments || []).map((e) => e.studentId),
      ...(selectedClass.studentIds || []),
    ]);

    const allStudents = students.filter((s) => everIds.has(s.id));

    const membershipByStudentByDate: AttendanceMatrix["membershipByStudentByDate"] = {};
    const statusByStudentByDate: AttendanceMatrix["statusByStudentByDate"] = {};

    for (const st of allStudents) {
      membershipByStudentByDate[st.id] = {};
      statusByStudentByDate[st.id] = {};

      for (const date of dates) {
        const isMember = isStudentEnrolledOn(selectedClass, st.id, date);
        membershipByStudentByDate[st.id][date] = isMember;

        if (!isMember) {
          statusByStudentByDate[st.id][date] = undefined;
          continue;
        }

        const sess = sessions.find((x) => x.date === date);
        statusByStudentByDate[st.id][date] = sess?.records?.[st.id];
      }
    }

    const studentsInMonth = allStudents
      .filter((st) => dates.some((d) => membershipByStudentByDate[st.id]?.[d]))
      .sort((a, b) => displaySocialName(a).localeCompare(displaySocialName(b), "pt-BR"));

    return {
      className: selectedClass.name,
      month,
      dates,
      students: studentsInMonth.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        socialName: s.socialName,
        preferredName: s.preferredName,
      })),
      statusByStudentByDate,
      membershipByStudentByDate,
    };
  }, [
    selectedClass?.id,
    selectedClass?.studentIds?.join(","),
    selectedClass?.studentEnrollments?.length,
    month,
    students,
  ]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const m = String(i + 1).padStart(2, "0");
        return {
          value: m,
          label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)),
        };
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Relatórios</h1>
          <p className="text-slate-500 font-medium">Visão consolidada para conferência e impressão.</p>
        </div>
      </div>

      {report === "home" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
            onClick={() => setReport("attendance")}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-lg font-black text-primary">Relatório de chamada</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Gere um relatório com todas as datas registradas no mês e o status de cada aluno.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canSeeEnel ? (
            <Card
              className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
              onClick={() => navigate(`${base}/relatorios/enel`)}
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-3xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 group-hover:scale-110 transition-transform">
                    <Zap className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                    <p className="text-lg font-black text-primary">Relatório ENEL</p>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      Lista mensal de alunos matriculados nas turmas do projeto, com CPF e Nº ENEL.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
              onClick={() => setReport("home")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>

            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">Legenda:</Badge>
              <span className="text-xs font-black text-emerald-700">P</span>
              <span className="text-xs font-black text-amber-700">A</span>
              <span className="text-xs font-black text-rose-700">F</span>
              <span className="text-xs font-black text-sky-700">J</span>
              <span className="text-xs font-bold text-slate-400">(em branco = não estava na turma)</span>
            </div>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-2xl font-black text-primary mt-1">Chamada</p>
                  <p className="text-slate-500 font-medium mt-1">
                    Primeiro você pode ver o resumo de todas as turmas. Se quiser, escolha uma turma específica.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turma</p>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Todas as turmas</SelectItem>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mês</p>
                    <Select value={selectedMonthPart} onValueChange={(m) => setMonth(`${selectedYear}-${m}`)}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ano</p>
                    <Select value={selectedYear} onValueChange={(y) => setMonth(`${y}-${selectedMonthPart}`)}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm font-bold">{monthLabel(month)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                    <Users className="h-4 w-4 mr-2" />
                    {classId === ALL
                      ? `Alunos (geral nas turmas): ${totalStudentsInClasses}`
                      : `Alunos na turma: ${selectedClass?.studentIds?.length || 0}`}
                  </Badge>

                  <Button
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 font-black border-slate-200"
                    onClick={() => {
                      if (!matrix || !matrix.dates.length) return;
                      printAttendanceReport(matrix);
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 font-black border-slate-200"
                    onClick={async () => {
                      if (!matrix || !matrix.dates.length) return;
                      try {
                        await downloadAttendanceXls(matrix);
                      } catch {
                        showError("Não foi possível gerar o XLS.");
                      }
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Gerar XLS
                  </Button>

                  <Button
                    className="rounded-2xl gap-2 h-11 font-black shadow-lg shadow-primary/20"
                    onClick={async () => {
                      if (!matrix) return;
                      try {
                        await generateAttendancePdf(matrix);
                      } catch {
                        showError("Não foi possível gerar o PDF.");
                      }
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <FileDown className="h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-0">
              {classId === ALL ? (
                <div className="p-6 md:p-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm">
                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</p>
                        <p className="text-xl font-black text-primary mt-1">Todas as turmas</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Turmas cadastradas</span>
                            <span className="text-sm font-black text-slate-900">{classes.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Alunos (únicos) nas turmas</span>
                            <span className="text-sm font-black text-slate-900">{totalStudentsInClasses}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Mês</span>
                            <span className="text-sm font-black text-slate-900">{monthLabel(month)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm md:col-span-2 lg:col-span-2">
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</p>
                          <p className="text-xl font-black text-primary mt-1">Escolha uma turma</p>
                          <p className="text-sm font-bold text-slate-500 mt-1">Clique em qualquer turma abaixo para ver o relatório detalhado.</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-secondary/10 text-primary flex items-center justify-center border border-secondary/20">
                          <Layers className="h-6 w-6" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Turmas</p>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {classesWithCounts.map(({ cls, studentsCount, callDaysCount }) => (
                        <button
                          key={cls.id}
                          onClick={() => setClassId(cls.id)}
                          className="text-left rounded-[2rem] border border-slate-100 bg-white p-5 hover:border-primary/25 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-black text-primary truncate">{cls.name}</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                {cls.period} • {cls.startTime}–{cls.endTime}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "rounded-full border-none font-black",
                                cls.status === "Ativo" ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700",
                              )}
                            >
                              {cls.status}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                              <Users className="h-3.5 w-3.5 mr-1" /> {studentsCount} aluno(s)
                            </Badge>
                            <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {callDaysCount} dia(s) com chamada
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !matrix ? (
                <div className="p-10 text-center bg-white">
                  <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">Selecione turma e mês.</p>
                </div>
              ) : matrix.dates.length === 0 ? (
                <div className="p-10 text-center bg-white">
                  <ClipboardCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">Nenhuma chamada registrada neste mês.</p>
                  <p className="text-xs text-slate-400 mt-1">Crie chamadas na aba "Chamada" da turma.</p>
                </div>
              ) : (
                <div className="p-6 md:p-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm">
                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</p>
                        <p className="text-xl font-black text-primary mt-1">Todas as turmas</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Turmas cadastradas</span>
                            <span className="text-sm font-black text-slate-900">{classes.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Alunos (únicos) nas turmas</span>
                            <span className="text-sm font-black text-slate-900">{totalStudentsInClasses}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Mês</span>
                            <span className="text-sm font-black text-slate-900">{monthLabel(month)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm md:col-span-2 lg:col-span-2">
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</p>
                          <p className="text-xl font-black text-primary mt-1">Escolha uma turma</p>
                          <p className="text-sm font-bold text-slate-500 mt-1">Clique em qualquer turma abaixo para ver o relatório detalhado.</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-secondary/10 text-primary flex items-center justify-center border border-secondary/20">
                          <Layers className="h-6 w-6" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Turmas</p>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {classesWithCounts.map(({ cls, studentsCount, callDaysCount }) => (
                        <button
                          key={cls.id}
                          onClick={() => setClassId(cls.id)}
                          className="text-left rounded-[2rem] border border-slate-100 bg-white p-5 hover:border-primary/25 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-black text-primary truncate">{cls.name}</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                {cls.period} • {cls.startTime}–{cls.endTime}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "rounded-full border-none font-black",
                                cls.status === "Ativo" ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700",
                              )}
                            >
                              {cls.status}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                              <Users className="h-3.5 w-3.5 mr-1" /> {studentsCount} aluno(s)
                            </Badge>
                            <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {callDaysCount} dia(s) com chamada
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}