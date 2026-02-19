"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
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
  GraduationCap,
  MapPinned,
  School,
  Users,
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

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);

  const today = new Date();
  const thisMonth = monthKey(today);

  useEffect(() => {
    setClasses(safeParse(localStorage.getItem("ecobuzios_classes"), []));
    setStudents(safeParse(localStorage.getItem("ecobuzios_students"), []));
    setTeachers(safeParse(localStorage.getItem("ecobuzios_teachers"), []));
  }, []);

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

  const kpis: KPI[] = useMemo(
    () => [
      {
        label: "Alunos ativos nas turmas",
        value: activeStudentsInClasses.length,
        icon: <GraduationCap className="h-6 w-6" />,
        tone: "primary",
      },
      {
        label: "Turmas ativas",
        value: activeClasses.length,
        icon: <BookOpen className="h-6 w-6" />,
        tone: "secondary",
      },
      {
        label: "Professores ativos",
        value: activeTeachers.length,
        icon: <Users className="h-6 w-6" />,
        tone: "sky",
      },
      {
        label: "Chamadas no mês",
        value: attendanceThisMonth.length,
        icon: <ClipboardCheck className="h-6 w-6" />,
        tone: "amber",
      },
    ],
    [
      activeStudentsInClasses.length,
      activeClasses.length,
      activeTeachers.length,
      attendanceThisMonth.length,
    ],
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

  const neighborhoodsData = useMemo(() => neighborhoodsFullData.slice(0, 10), [neighborhoodsFullData]);

  const calendarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thisMonth],
  );

  return (
    <div className="space-y-8">
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
            <Card key={k.label} className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2rem]">
              <CardContent className="p-6">
                <div className={"w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border " + tone}>
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

      {/* Calendar */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-4">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Calendário do mês
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">
              Dias com chamada ficam marcados.
            </p>
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
                  <div key={s.name} className="flex items-center justify-between text-sm font-bold text-slate-600">
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