"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Loader2, Printer, Zap } from "lucide-react";
import type { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import type { EnelRow } from "@/utils/enel-report-pdf";
import { generateEnelPdf } from "@/utils/enel-report-pdf";
import { downloadEnelXls } from "@/utils/enel-report-xls";
import { printEnelReport } from "@/utils/enel-report-print";
import { enelReportService } from "@/services/enelReportService";
import { projectsService } from "@/services/projectsService";
import { getActiveProjectId } from "@/utils/projects";
import { showError } from "@/utils/toast";

function monthOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return { value: m, label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)) };
  });
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
      try {
        const all = await projectsService.fetchProjectsFromDb();
        setProjects(all);

        // Default: projeto ativo (se existir), senão o primeiro da lista.
        setSelectedProjectId((prev) => {
          if (prev) return prev;
          const active = getActiveProjectId();
          if (active && all.some((p) => p.id === active)) return active;
          return all[0]?.id || "";
        });
      } catch (e: any) {
        setProjects([]);
        setSelectedProjectId("");
        showError(e?.message || "Não foi possível carregar os projetos.");
      }
    };

    void run();
  }, []);

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
      const data = await enelReportService.fetchRows({ projectId: selectedProjectId, month });

      // Se, por regra de acesso, não puder mostrar Nº ENEL, limpamos o campo antes de render/exportar.
      const nextRows = includeEnelNumber
        ? data
        : data.map((r) => ({ ...r, enelClientNumber: "" }));

      setRows(nextRows);
    } catch (e: any) {
      setRows([]);
      showError(e?.message || "Não foi possível gerar o relatório ENEL.");
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
              onClick={() => {
                if (!selectedProject) return;
                generateEnelPdf({
                  month,
                  projectName: selectedProject.name,
                  rows,
                  includeEnelNumber,
                });
              }}
            >
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl font-black"
              disabled={!rows.length}
              onClick={() => {
                if (!selectedProject) return;
                downloadEnelXls({
                  month,
                  rows,
                });

              }}
            >
              <FileDown className="h-4 w-4 mr-2" /> XLS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}