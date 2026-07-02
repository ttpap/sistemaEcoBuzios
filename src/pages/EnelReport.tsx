"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, FileDown, FileText, Loader2, Printer, Zap } from "lucide-react";
import type { Project } from "@/types/project";
import type { SchoolClass } from "@/types/class";
import { useAuth } from "@/context/AuthContext";
import type { EnelRow } from "@/utils/enel-report-pdf";
import { generateEnelPdf } from "@/utils/enel-report-pdf";
import { downloadEnelXls } from "@/utils/enel-report-xls";
import { printEnelReport } from "@/utils/enel-report-print";
import { enelReportService } from "@/services/enelReportService";
import { projectsService } from "@/services/projectsService";
import { fetchClassesRemoteWithMeta } from "@/services/classesService";
import { getActiveProjectId, getProjects, saveProjects } from "@/utils/projects";
import { showError } from "@/utils/toast";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword, getCoordinatorSessionProjectIds } from "@/utils/coordinator-auth";
import { getTeacherSessionLogin, getTeacherSessionPassword, getTeacherSessionTeacherId, getTeacherSessionProjectIds } from "@/utils/teacher-auth";
import { fetchModeBStaffProjects } from "@/integrations/supabase/mode-b-projects";

function monthOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return { value: m, label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)) };
  });
}

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type ClassMultiSelectProps = {
  classes: SchoolClass[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function ClassMultiSelect({ classes, value, onChange, disabled }: ClassMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(value);

  const label = (() => {
    if (!value.length) return "Todas as turmas";
    if (value.length === 1) {
      return classes.find((c) => c.id === value[0])?.name || "1 turma";
    }
    return `${value.length} turmas selecionadas`;
  })();

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 text-left text-sm font-bold text-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <span className={cn("truncate", !value.length && "text-slate-500 font-medium")}>{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[260px] rounded-2xl" align="start">
        <Command
          filter={(itemValue, search) => {
            const n = normalizeText(itemValue);
            const terms = normalizeText(search).split(/\s+/).filter(Boolean);
            if (!terms.length) return 1;
            return terms.every((t) => n.includes(t)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar turma..." />
          <CommandList>
            <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="todas as turmas" onSelect={() => onChange([])}>
                <Check className={cn("mr-2 h-4 w-4", !value.length ? "opacity-100" : "opacity-0")} />
                <span className="font-bold text-slate-700">Todas as turmas</span>
              </CommandItem>
              {classes.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => toggle(c.id)}>
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", selectedSet.has(c.id) ? "opacity-100" : "opacity-0")}
                  />
                  <span className="font-bold text-slate-800 truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function EnelReport() {
  const { profile } = useAuth();

  const isTeacher = Boolean(getTeacherSessionTeacherId());
  const canAccess =
    profile?.role === "admin" ||
    profile?.role === "coordinator" ||
    profile?.role === "teacher" ||
    Boolean(getCoordinatorSessionLogin()) ||
    isTeacher;

  // Nº ENEL visível somente para admin/coordenador (não professor)
  const includeEnelNumber =
    profile?.role === "admin" ||
    profile?.role === "coordinator" ||
    Boolean(getCoordinatorSessionLogin());

  const [projects, setProjects] = useState<Project[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [month, setMonth] = useState<string>(defaultMonth);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EnelRow[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        // Para Mode B teacher/coordinator, usa projetos da sessão (cache local) para evitar bloqueio RLS.
        const teacherIds = getTeacherSessionProjectIds();
        const coordIds = getCoordinatorSessionProjectIds();
        const modeB = teacherIds.length > 0 || coordIds.length > 0;

        let all: Project[];
        if (modeB) {
          const allowedIds = new Set([...teacherIds, ...coordIds]);
          const cached = getProjects();
          all = cached.filter((p) => allowedIds.has(p.id));
          // Cache vazio: busca via RPC Mode B (bypassa RLS, não depende de auth Supabase)
          if (!all.length) {
            const teacherLogin = getTeacherSessionLogin();
            const teacherPw = getTeacherSessionPassword();
            const coordLogin = getCoordinatorSessionLogin();
            const coordPw = getCoordinatorSessionPassword();

            let remote: Project[] = [];
            if (teacherLogin && teacherPw) {
              remote = await fetchModeBStaffProjects({ login: teacherLogin, password: teacherPw });
            } else if (coordLogin && coordPw) {
              remote = await fetchModeBStaffProjects({ login: coordLogin, password: coordPw });
            }

            all = remote.filter((p) => allowedIds.has(p.id));
            if (all.length) saveProjects(all); // salva no cache para próximas navegações
          }
        } else {
          all = await projectsService.fetchProjectsFromDb();
        }

        setProjects(all);
        setSelectedProjectId((prev) => {
          if (prev && all.some((p) => p.id === prev)) return prev;
          const active = getActiveProjectId();
          if (active && all.some((p) => p.id === active)) return active;
          return all[0]?.id || "";
        });
      } catch (e: any) {
        setProjects([]);
        showError(e?.message || "Não foi possível carregar os projetos.");
      }
    };
    void run();
  }, []);

  // Carrega turmas quando o projeto muda
  useEffect(() => {
    if (!selectedProjectId) { setClasses([]); return; }
    const run = async () => {
      try {
        const res = await fetchClassesRemoteWithMeta(selectedProjectId);
        setClasses(res.classes || []);
      } catch {
        setClasses([]);
      }
    };
    void run();
  }, [selectedProjectId]);

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
      // Filtro por múltiplas turmas é feito no servidor (uma chamada por turma,
      // deduplicado por aluno). Vazio = todas as turmas.
      const data = await enelReportService.fetchRowsMulti({
        projectId: selectedProjectId,
        month,
        classIds: selectedClassIds,
      });

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
              O Relatório ENEL está disponível apenas para Administrador, Coordenador e Professor.
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
            Alunos matriculados nas turmas do projeto, filtrado por mês e turma.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Projeto</p>
              <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setSelectedClassIds([]); setRows([]); }}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50/60 border-slate-100">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Turmas</p>
              <ClassMultiSelect
                classes={classes}
                value={selectedClassIds}
                onChange={(ids) => { setSelectedClassIds(ids); setRows([]); }}
                disabled={!selectedProjectId || !classes.length}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mês</p>
              <Select value={selectedMonthPart} onValueChange={(m) => setMonth(`${selectedYear}-${m}`)}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50/60 border-slate-100">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions().map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
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
                    <SelectItem key={y} value={y}>{y}</SelectItem>
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
                printEnelReport({ month, projectName: selectedProject.name, rows, includeEnelNumber });
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
                generateEnelPdf({ month, projectName: selectedProject.name, rows, includeEnelNumber });
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
                downloadEnelXls({ month, rows });
              }}
            >
              <FileDown className="h-4 w-4 mr-2" /> XLS
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                Pré-visualização — {rows.length} aluno(s)
                {selectedClassIds.length
                  ? ` · ${selectedClassIds
                      .map((id) => classes.find((c) => c.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}`
                  : " · Todas as turmas"}
              </p>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {rows.map((row, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 p-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{idx + 1}. {row.fullName}</p>
                        {row.socialName && (
                          <p className="text-[11px] text-slate-400 italic">({row.socialName})</p>
                        )}
                        <p className="text-xs text-slate-500">{row.className || "—"}</p>
                      </div>
                      {row.age && <span className="text-xs font-bold text-slate-400 shrink-0">{row.age}a</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div><span className="text-slate-400">CPF:</span> <span className="font-mono text-slate-600">{row.cpf || "—"}</span></div>
                      {includeEnelNumber && <div><span className="text-slate-400">ENEL:</span> <span className="font-mono text-slate-600">{row.enelClientNumber || "—"}</span></div>}
                      <div><span className="text-slate-400">Tel:</span> <span className="text-slate-600">{row.cellPhone || "—"}</span></div>
                      <div><span className="text-slate-400">Nasc:</span> <span className="text-slate-600">{row.birthDate || "—"}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">#</th>
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Nome</th>
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Turma</th>
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">CPF</th>
                      {includeEnelNumber && (
                        <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Nº ENEL</th>
                      )}
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Telefone</th>
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Nasc.</th>
                      <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Idade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{row.fullName}</div>
                          {row.socialName && (
                            <div className="text-[11px] text-slate-400 italic">({row.socialName})</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.className || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{row.cpf || "—"}</td>
                        {includeEnelNumber && (
                          <td className="px-4 py-3 font-mono text-slate-600">{row.enelClientNumber || "—"}</td>
                        )}
                        <td className="px-4 py-3 text-slate-600">{row.cellPhone || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.birthDate || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.age || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
