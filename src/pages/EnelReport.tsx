"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Loader2, Printer, Zap } from "lucide-react";
import { fetchProjects } from "@/utils/projects";
import type { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { getCoordinatorSessionProjectIds } from "@/utils/coordinator-auth";
import { fetchClassesRemoteWithMeta, fetchEnrollmentsRemoteWithMeta } from "@/integrations/supabase/classes";
import { fetchStudents, fetchStudentsRemoteWithMeta } from "@/integrations/supabase/students";
import type { EnelRow } from "@/utils/enel-report-pdf";
import { generateEnelPdf } from "@/utils/enel-report-pdf";
import { downloadEnelXls } from "@/utils/enel-report-xls";
import { printEnelReport } from "@/utils/enel-report-print";
import { differenceInYears, endOfMonth, parseISO } from "date-fns";

function monthOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return { value: m, label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)) };
  });
}

function monthRange(month: string) {
  const [y, m] = month.split("-");
  const start = new Date(Number(y), Number(m) - 1, 1, 0, 0, 0, 0);
  const end = endOfMonth(start);
  return { start, end };
}

function enrolledOverlapsMonth(
  enrollment: { enrolled_at?: string; removed_at?: string | null },
  monthStart: Date,
  monthEnd: Date,
) {
  const enrolledAt = new Date(enrollment.enrolled_at || 0);
  const removedAt = enrollment.removed_at ? new Date(enrollment.removed_at) : null;

  // Enrolou até o final do mês e não foi removido antes do início do mês.
  return enrolledAt.getTime() <= monthEnd.getTime() && (!removedAt || removedAt.getTime() >= monthStart.getTime());
}

function displayStudentName(s: any) {
  return (s?.socialName || s?.preferredName || s?.fullName || "").trim();
}

export default function EnelReport() {
  const { profile } = useAuth();

  const canAccess = profile?.role === "admin" || profile?.role === "coordinator";
  const includeEnelNumber = canAccess; // regra: somente admin/coordenador

  const [projects, setProjects] = useState<Project[]>([]);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [month, setMonth] = useState<string>(defaultMonth);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EnelRow[]>([]);

  useEffect(() => {
    const run = async () => {
      const all = await fetchProjects();

      if (profile?.role === "coordinator") {
        const allowed = new Set(getCoordinatorSessionProjectIds());
        setProjects(all.filter((p) => allowed.has(p.id)));
        return;
      }

      setProjects(all);
    };

    void run();
  }, [profile?.role]);

  useEffect(() => {
    if (selectedProjectId) return;
    if (!projects.length) return;
    setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const selectedMonthPart = month.split("-")[1] || "01";
  const selectedYear = month.split("-")[0] || String(now.getFullYear());

  const onGenerate = async () => {
    if (!canAccess) return;
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const { start, end } = monthRange(month);

      // 1) Turmas do projeto
      const clsRes = await fetchClassesRemoteWithMeta(selectedProjectId);
      const classes = clsRes.classes || [];

      // 2) Matrículas do mês (por turma)
      const studentIds = new Set<string>();
      for (const c of classes) {
        const enrRes = await fetchEnrollmentsRemoteWithMeta(c.id);
        for (const e of enrRes.enrollments || []) {
          if (!enrolledOverlapsMonth(e, start, end)) continue;
          studentIds.add(e.student_id);
        }
      }

      // 3) Dados do formulário do aluno
      const students =
        profile?.role === "admin"
          ? await fetchStudents()
          : (await fetchStudentsRemoteWithMeta(selectedProjectId)).students;

      const byId = new Map(students.map((s) => [s.id, s]));

      const nextRows: EnelRow[] = Array.from(studentIds)
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((s: any) => {
          const birthDate = String(s.birthDate || "");
          let age = Number(s.age || 0);
          try {
            if (birthDate) age = differenceInYears(end, parseISO(birthDate));
          } catch {
            // mantém fallback
          }

          return {
            name: displayStudentName(s),
            cellPhone: String(s.cellPhone || ""),
            birthDate,
            age,
            cpf: String(s.cpf || ""),
            enelClientNumber: includeEnelNumber ? String(s.enelClientNumber || "") : "",
          } as EnelRow;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden max-w-lg w-full">
          <CardContent className="p-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">403</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Não autorizado</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              O Relatório ENEL está disponível apenas para Administrador e Coordenador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
          <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6" /> Relatório ENEL
          </h1>
          <p className="text-slate-500 font-medium">
            Alunos matriculados nas turmas do projeto (1 linha por aluno), filtrado por mês.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Projeto</p>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50/60 border-slate-100">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mês</p>
              <Select value={selectedMonthPart} onValueChange={(m) => setMonth(`${selectedYear}-${m}`)}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50/60 border-slate-100">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions().map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Ano</p>
              <Select value={selectedYear} onValueChange={(y) => setMonth(`${y}-${selectedMonthPart}`)}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50/60 border-slate-100">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i)).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Button className="rounded-2xl font-black" onClick={onGenerate} disabled={loading || !selectedProjectId}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Gerar relatório
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl font-black"
              disabled={!rows.length}
              onClick={() => {
                if (!selectedProject) return;
                printEnelReport({
                  month,
                  projectName: selectedProject.name,
                  rows,
                  includeEnelNumber,
                });
              }}
            >
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl font-black"
              disabled={!rows.length}
              onClick={() =>
                generateEnelPdf({
                  month,
                  rows,
                  projectName: selectedProject?.name || undefined,
                  projectLogoUrl: selectedProject?.imageUrl || null,
                  includeEnelNumber,
                })
              }
            >
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl font-black"
              disabled={!rows.length}
              onClick={() => downloadEnelXls({ month, rows })}
            >
              <FileDown className="h-4 w-4 mr-2" /> XLS
            </Button>

            <div className="ml-auto text-sm font-bold text-slate-500">
              {rows.length ? `${rows.length} aluno(s)` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Nome</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Celular</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Data nascimento</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Idade</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">CPF</th>
                  {includeEnelNumber ? (
                    <th className="text-center px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Número ENEL</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r, idx) => (
                    <tr key={`${r.cpf}-${idx}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-4 font-black text-slate-800">{r.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.cellPhone}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.birthDate}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.age}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.cpf}</td>
                      {includeEnelNumber ? (
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{r.enelClientNumber}</td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={includeEnelNumber ? 6 : 5}
                      className="px-6 py-10 text-center text-slate-500 font-medium"
                    >
                      Selecione projeto e mês, e clique em "Gerar relatório".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}