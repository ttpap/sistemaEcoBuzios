"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronDown, GraduationCap, Loader2, Printer, School, Users } from "lucide-react";
import { printEscolaReport } from "@/utils/escola-report-print";

import type { Project } from "@/types/project";
import type { SchoolClass } from "@/types/class";
import type { StudentRegistration } from "@/types/student";
import { useAuth } from "@/context/AuthContext";
import { projectsService } from "@/services/projectsService";
import {
  fetchClassesRemoteWithMeta,
  fetchEnrollmentsRemoteWithMeta,
} from "@/services/classesService";
import { fetchStudentsRemoteWithMeta } from "@/services/studentsService";
import { fetchModeBStaffProjects } from "@/integrations/supabase/mode-b-projects";
import { getActiveProjectId, getProjects, saveProjects } from "@/utils/projects";
import { showError } from "@/utils/toast";
import {
  getCoordinatorSessionLogin,
  getCoordinatorSessionPassword,
  getCoordinatorSessionProjectIds,
} from "@/utils/coordinator-auth";
import {
  getTeacherSessionLogin,
  getTeacherSessionPassword,
  getTeacherSessionTeacherId,
  getTeacherSessionProjectIds,
} from "@/utils/teacher-auth";

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  municipal: "Municipal",
  state: "Estadual",
  private: "Particular",
  none: "Comunidade",
};

function resolveSchool(s: StudentRegistration): string {
  const name = (s.schoolName || "").trim();
  if (name) return name;
  const other = (s.schoolOther || "").trim();
  if (other) return other;
  if (s.schoolType === "none") return "Comunidade";
  return "Não informado";
}

function displayName(s: StudentRegistration) {
  return s.socialName || s.preferredName || s.fullName;
}

function normalizeText(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type Option = { value: string; label: string };

type MultiSelectProps = {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  allLabel: string;
  disabled?: boolean;
};

function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  allLabel,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(value);

  const label = (() => {
    if (!value.length) return allLabel;
    if (value.length === 1) return options.find((o) => o.value === value[0])?.label || "1";
    return `${value.length} selecionadas`;
  })();

  const toggle = (v: string) => {
    if (selectedSet.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
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
          <span className={cn("truncate", !value.length && "text-slate-500 font-medium")}>
            {value.length ? label : placeholder}
          </span>
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
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={normalizeText(allLabel)} onSelect={() => onChange([])}>
                <Check className={cn("mr-2 h-4 w-4", !value.length ? "opacity-100" : "opacity-0")} />
                <span className="font-bold text-slate-700">{allLabel}</span>
              </CommandItem>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", selectedSet.has(o.value) ? "opacity-100" : "opacity-0")}
                  />
                  <span className="font-bold text-slate-800 truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function EscolaReport() {
  const { profile } = useAuth();

  const isTeacher = Boolean(getTeacherSessionTeacherId());
  const canAccess =
    profile?.role === "admin" ||
    profile?.role === "coordinator" ||
    profile?.role === "teacher" ||
    Boolean(getCoordinatorSessionLogin()) ||
    isTeacher;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Carrega projetos (Mode B usa projetos da sessão para evitar bloqueio RLS)
  useEffect(() => {
    const run = async () => {
      try {
        const teacherIds = getTeacherSessionProjectIds();
        const coordIds = getCoordinatorSessionProjectIds();
        const modeB = teacherIds.length > 0 || coordIds.length > 0;

        let all: Project[];
        if (modeB) {
          const allowedIds = new Set([...teacherIds, ...coordIds]);
          const cached = getProjects();
          all = cached.filter((p) => allowedIds.has(p.id));
          if (!all.length) {
            const tLogin = getTeacherSessionLogin();
            const tPw = getTeacherSessionPassword();
            const cLogin = getCoordinatorSessionLogin();
            const cPw = getCoordinatorSessionPassword();
            let remote: Project[] = [];
            if (tLogin && tPw) remote = await fetchModeBStaffProjects({ login: tLogin, password: tPw });
            else if (cLogin && cPw) remote = await fetchModeBStaffProjects({ login: cLogin, password: cPw });
            all = remote.filter((p) => allowedIds.has(p.id));
            if (all.length) saveProjects(all);
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

  // Carrega turmas (com matrículas ativas) + alunos do projeto selecionado
  useEffect(() => {
    if (!selectedProjectId) {
      setClasses([]);
      setStudents([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const classRes = await fetchClassesRemoteWithMeta(selectedProjectId);
        const baseClasses = classRes.classes || [];

        const enriched: SchoolClass[] = [];
        for (const c of baseClasses) {
          const enr = await fetchEnrollmentsRemoteWithMeta(c.id);
          const studentIds = (enr.enrollments || [])
            .filter((e) => !e.removed_at)
            .map((e) => e.student_id);
          enriched.push({ ...c, studentIds });
        }

        const stuRes = await fetchStudentsRemoteWithMeta(selectedProjectId);

        if (!alive) return;
        setClasses(enriched);
        setStudents(stuRes.students || []);
        setSelectedSchools([]);
        setSelectedClassIds([]);
      } catch (e: any) {
        if (alive) {
          setClasses([]);
          setStudents([]);
          showError(e?.message || "Não foi possível carregar os dados do projeto.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [selectedProjectId]);

  const studentsById = useMemo(() => {
    const m = new Map<string, StudentRegistration>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  // Opções de escola (distintas, entre alunos que estão em alguma turma)
  const schoolOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) {
      for (const sid of c.studentIds || []) {
        const st = studentsById.get(sid);
        if (st) set.add(resolveSchool(st));
      }
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((s) => ({ value: s, label: s }));
  }, [classes, studentsById]);

  const classOptions = useMemo(
    () =>
      [...classes]
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .map((c) => ({ value: c.id, label: c.name })),
    [classes],
  );

  // Agrupamento: Escola -> Turma -> alunos (aplicando filtros)
  const { grouped, totals } = useMemo(() => {
    const schoolFilter = new Set(selectedSchools);
    const classFilter = new Set(selectedClassIds);

    type StudentRow = { id: string; name: string; full: string };
    const bySchool = new Map<
      string,
      { school: string; classes: Map<string, { className: string; students: StudentRow[] }> }
    >();

    const distinctStudents = new Set<string>();
    const distinctClasses = new Set<string>();

    for (const c of classes) {
      if (classFilter.size && !classFilter.has(c.id)) continue;
      for (const sid of c.studentIds || []) {
        const st = studentsById.get(sid);
        if (!st) continue;
        const school = resolveSchool(st);
        if (schoolFilter.size && !schoolFilter.has(school)) continue;

        distinctStudents.add(st.id);
        distinctClasses.add(c.id);

        let entry = bySchool.get(school);
        if (!entry) {
          entry = { school, classes: new Map() };
          bySchool.set(school, entry);
        }
        let cls = entry.classes.get(c.id);
        if (!cls) {
          cls = { className: c.name, students: [] };
          entry.classes.set(c.id, cls);
        }
        cls.students.push({ id: st.id, name: displayName(st), full: st.fullName });
      }
    }

    const schools = Array.from(bySchool.values()).map((entry) => {
      const classList = Array.from(entry.classes.values())
        .map((cl) => ({
          ...cl,
          students: [...cl.students].sort((a, b) => a.full.localeCompare(b.full, "pt-BR")),
        }))
        .sort((a, b) => a.className.localeCompare(b.className, "pt-BR"));

      const distinct = new Set<string>();
      for (const cl of classList) for (const st of cl.students) distinct.add(st.id);

      return {
        school: entry.school,
        classes: classList,
        totalStudents: distinct.size,
        totalClasses: classList.length,
      };
    });

    schools.sort((a, b) => a.school.localeCompare(b.school, "pt-BR"));

    return {
      grouped: schools,
      totals: { escolas: schools.length, alunos: distinctStudents.size, turmas: distinctClasses.size },
    };
  }, [classes, studentsById, selectedSchools, selectedClassIds]);

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden max-w-lg w-full">
          <CardContent className="p-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">403</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Não autorizado</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              O Relatório de Escolas está disponível apenas para Administrador, Coordenador e Professor.
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
            <School className="h-6 w-6" /> Relatório de Escolas
          </h1>
          <p className="text-slate-500 font-medium">
            Quais alunos e turmas estão em cada escola, filtrando por escola e turma.
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
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Escolas</p>
              <MultiSelect
                options={schoolOptions}
                value={selectedSchools}
                onChange={setSelectedSchools}
                placeholder="Todas as escolas"
                searchPlaceholder="Buscar escola..."
                allLabel="Todas as escolas"
                disabled={!selectedProjectId || loading || !schoolOptions.length}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Turmas</p>
              <MultiSelect
                options={classOptions}
                value={selectedClassIds}
                onChange={setSelectedClassIds}
                placeholder="Todas as turmas"
                searchPlaceholder="Buscar turma..."
                allLabel="Todas as turmas"
                disabled={!selectedProjectId || loading || !classOptions.length}
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-slate-500 font-bold">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando dados do projeto...
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 text-primary border border-primary/15 px-4 py-2 text-sm font-black">
                  <Building2 className="h-4 w-4" /> {totals.escolas} escola(s)
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 text-sm font-black">
                  <GraduationCap className="h-4 w-4" /> {totals.turmas} turma(s)
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 text-sm font-black">
                  <Users className="h-4 w-4" /> {totals.alunos} aluno(s)
                </span>
                <Button
                  variant="outline"
                  className="rounded-2xl font-black ml-auto"
                  disabled={!grouped.length}
                  onClick={() =>
                    printEscolaReport({
                      projectName: projects.find((p) => p.id === selectedProjectId)?.name || "",
                      totals,
                      grouped,
                    })
                  }
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
              </div>

              {grouped.length === 0 ? (
                <div className="mt-8 rounded-[2rem] border border-slate-100 bg-slate-50/60 p-10 text-center">
                  <School className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-black text-slate-600">Nenhum aluno para os filtros selecionados.</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Selecione um projeto e ajuste os filtros de escola e turma.
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-5">
                  {grouped.map((sc) => (
                    <div key={sc.school} className="rounded-[2rem] border border-slate-100 overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <School className="h-5 w-5" />
                          </div>
                          <p className="text-base font-black text-slate-800 truncate">{sc.school}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-full border-none bg-primary text-white font-black">
                            {sc.totalStudents} aluno(s)
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 text-slate-600 font-bold"
                          >
                            {sc.totalClasses} turma(s)
                          </Badge>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-50">
                        {sc.classes.map((cl) => (
                          <div key={cl.className} className="px-5 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <GraduationCap className="h-4 w-4 text-slate-400" />
                              <p className="text-sm font-black text-slate-700">{cl.className}</p>
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 text-slate-500 font-bold text-[11px]"
                              >
                                {cl.students.length}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cl.students.map((st) => (
                                <span
                                  key={st.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                                >
                                  {st.full}
                                  {st.name !== st.full && (
                                    <span className="font-medium text-slate-400">({st.name})</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
