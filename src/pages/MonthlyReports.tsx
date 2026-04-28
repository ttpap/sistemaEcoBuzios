"use client";

import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getActiveProject, getActiveProjectId, saveProjects, setActiveProjectId } from "@/utils/projects";

import { getTeacherSessionTeacherId, getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionCoordinatorId, getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";
import { fetchModeBStaffProjects } from "@/integrations/supabase/mode-b-projects";
import { readGlobalStudents, readScoped, writeGlobalStudents, writeScoped } from "@/utils/storage";
import { fetchClassesRemoteWithMeta, fetchEnrollmentsRemoteWithMeta, fetchProjectEnrollmentsRemoteWithMeta } from "@/services/classesService";
import { fetchStudentsRemoteWithMeta } from "@/services/studentsService";
import { projectsService } from "@/services/projectsService";
import { monthlyReportsService } from "@/services/monthlyReportsService";
import { coordinatorMonthlyReportsService } from "@/services/coordinatorMonthlyReportsService";

import type { SchoolClass } from "@/types/class";
import type { StudentRegistration } from "@/types/student";
import type { MonthlyReport } from "@/types/monthly-report";
import { getAllMonthlyReports, getMonthlyReportById, upsertMonthlyReport, saveAllMonthlyReports } from "@/utils/monthly-reports";
import { getAllCoordinatorMonthlyReports, getCoordinatorMonthlyReportById, upsertCoordinatorMonthlyReport, saveAllCoordinatorMonthlyReports } from "@/utils/coordinator-monthly-reports";
import { readGlobalTeachers } from "@/utils/teachers";
import { readGlobalCoordinators } from "@/utils/coordinators";
import RichTextEditor from "@/components/RichTextEditor";
import { showError, showSuccess } from "@/utils/toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Check,
  FilePlus2,
  Lock,
  Pencil,
  Send,
  User,
} from "lucide-react";

const NONE = "__none__";

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function nowMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function filenameMonthOptions() {
  return Array.from({ length: 12 }).map((_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      value: m,
      label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)),
    };
  });
}

type ReportLike = {
  submittedAt?: string;
};

function statusBadge(r: ReportLike) {
  const submitted = Boolean(r.submittedAt);
  if (submitted) {
    return (
      <Badge className="rounded-full border-none bg-emerald-600 text-white font-black">
        <CheckCircle2 className="h-4 w-4 mr-1" /> Enviado
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-black">
      <Pencil className="h-4 w-4 mr-1" /> Rascunho
    </Badge>
  );
}

function projectStudentPoolFromIds(ids: Set<string>, allStudents: StudentRegistration[]) {
  if (!ids.size) return [];
  return allStudents
    .filter((s) => ids.has(s.id))
    .sort((a, b) =>
      (a.socialName || a.preferredName || a.fullName).localeCompare(
        b.socialName || b.preferredName || b.fullName,
        "pt-BR",
      ),
    );
}

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type StudentComboboxProps = {
  students: StudentRegistration[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
};

function StudentCombobox({ students, value, onChange, disabled, placeholder }: StudentComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);
  const selectedLabel = selected ? selected.fullName.trim() : "";

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "mt-2 flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <span className={cn("truncate", !selected && "text-slate-400 font-normal")}>
            {selected ? selectedLabel : placeholder || "Selecione um aluno"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[280px] rounded-2xl"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const n = normalizeText(itemValue);
            const terms = normalizeText(search).split(/\s+/).filter(Boolean);
            if (!terms.length) return 1;
            return terms.every((t) => n.includes(t)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar aluno..." />
          <CommandList>
            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="nenhum"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="font-bold text-slate-700">Nenhum</span>
              </CommandItem>
              {students.map((s) => {
                const social = (s.socialName || s.preferredName || "").trim();
                const full = s.fullName.trim();
                const haystack = `${social} ${full}`;
                return (
                  <CommandItem
                    key={s.id}
                    value={haystack}
                    onSelect={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4 shrink-0", value === s.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-slate-800 truncate">{full}</span>
                      {social && social !== full && (
                        <span className="text-xs text-slate-500 truncate">{social}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function MonthlyReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const isTeacherArea = location.pathname.startsWith("/professor");
  const isCoordinatorArea = location.pathname.startsWith("/coordenador");

  const teacherId = useMemo(() => (isTeacherArea ? getTeacherSessionTeacherId() : null), [isTeacherArea]);
  const coordinatorId = useMemo(
    () => (isCoordinatorArea ? getCoordinatorSessionCoordinatorId() : null),
    [isCoordinatorArea],
  );

  const [projectNonce, setProjectNonce] = useState(0);
  const [reportsNonce, setReportsNonce] = useState(0);

  // Em máquina nova: activeProjectId pode estar setado mas lista de projetos vazia no localStorage.
  // Busca projetos do servidor e salva no cache para que getActiveProject() funcione.
  React.useEffect(() => {
    const run = async () => {
      if (getActiveProjectId() && getActiveProject()) return;
      try {
        const teacherLogin = getTeacherSessionLogin();
        const teacherPw = getTeacherSessionPassword();
        const coordLogin = getCoordinatorSessionLogin();
        const coordPw = getCoordinatorSessionPassword();

        const fetchProjects = () => {
          if (teacherLogin && teacherPw)
            return fetchModeBStaffProjects({ login: teacherLogin, password: teacherPw });
          if (coordLogin && coordPw)
            return fetchModeBStaffProjects({ login: coordLogin, password: coordPw });
          return projectsService.fetchProjectsFromDb();
        };

        const prjs = await fetchProjects();
        if (!prjs.length) return;
        saveProjects(prjs);
        if (!getActiveProjectId()) setActiveProjectId(prjs[0]!.id);
        setProjectNonce((x) => x + 1);
      } catch {
        // Sem projeto: a UI já orienta "Selecione um projeto".
      }
    };

    void run();
  }, []);

  const activeProject = useMemo(() => getActiveProject(), [location.pathname, projectNonce]);
  const projectId = activeProject?.id || getActiveProjectId() || null;

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const basePath = isTeacherArea
    ? "/professor/relatorios/mensais"
    : isCoordinatorArea
      ? "/coordenador/relatorios/mensais"
      : "/relatorios/mensais";

  const now = new Date();
  const monthParts = nowMonthKey(now).split("-");
  const [selectedYear, setSelectedYear] = useState(monthParts[0] || String(now.getFullYear()));
  const [selectedMonthPart, setSelectedMonthPart] = useState(
    monthParts[1] || String(now.getMonth() + 1).padStart(2, "0"),
  );

  const monthKey = `${selectedYear}-${selectedMonthPart}`;

  const teachersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of readGlobalTeachers([])) map.set(t.id, t.fullName);
    return map;
  }, []);

  const coordinatorsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of readGlobalCoordinators([])) map.set(c.id, c.fullName);
    return map;
  }, []);

  const [classes, setClasses] = useState<SchoolClass[]>(() => readScoped<SchoolClass[]>("classes", []));
  const [students, setStudents] = useState<StudentRegistration[]>(() => readGlobalStudents<StudentRegistration[]>([]));
  const [enrollmentIds, setEnrollmentIds] = useState<Set<string>>(new Set());

  // Garante que a área do professor/coordenador tenha classes + matrículas + alunos carregados do servidor.
  // E também sincroniza os relatórios mensais do banco para o cache local.
  React.useEffect(() => {
    const run = async () => {
      if (!projectId) return;

      try {
        const classRes = await fetchClassesRemoteWithMeta(projectId);
        const baseClasses = classRes.classes.length ? classRes.classes : readScoped<SchoolClass[]>("classes", []);

        const enriched: SchoolClass[] = [];
        for (const c of baseClasses) {
          const enr = await fetchEnrollmentsRemoteWithMeta(c.id);
          const studentIds = (enr.enrollments || []).filter((e) => !e.removed_at).map((e) => e.student_id);
          enriched.push({ ...c, studentIds });
        }

        writeScoped("classes", enriched);
        setClasses(enriched);

        // Carrega pool de alunos (por matrículas do projeto)
        const prjEnr = await fetchProjectEnrollmentsRemoteWithMeta(projectId);
        const ids = new Set<string>();
        for (const e of prjEnr.enrollments) ids.add(String(e.student_id));
        setEnrollmentIds(ids);

        const stuRes = await fetchStudentsRemoteWithMeta(projectId);
        if (stuRes.issue === "rpc_missing") {
          showError("O servidor ainda não foi atualizado com as permissões (RPC).");
        }
        if (stuRes.issue === "not_allowed") {
          showError("Acesso bloqueado: este usuário não está alocado neste projeto.");
        }

        if (stuRes.students.length) {
          writeGlobalStudents(stuRes.students);
          setStudents(stuRes.students);
        } else {
          setStudents(readGlobalStudents<StudentRegistration[]>([]));
        }

        // Sincroniza relatórios do banco → cache local
        const [teacherRemote, coordRemote] = await Promise.all([
          monthlyReportsService.fetchReports(projectId),
          coordinatorMonthlyReportsService.fetchReports(projectId),
        ]);

        // Evita sobrescrever cache local com vazio (ex.: RLS/RPC ausente). Só atualiza quando vier conteúdo.
        if (teacherRemote.length) saveAllMonthlyReports(projectId, teacherRemote);
        if (coordRemote.length) saveAllCoordinatorMonthlyReports(projectId, coordRemote);

        setReportsNonce((x) => x + 1);
      } catch (e: any) {
        showError(e?.message || "Não foi possível carregar os dados do relatório mensal.");
      }
    };

    void run();
  }, [projectId]);

  const selectableStudents = useMemo(() => projectStudentPoolFromIds(enrollmentIds, students), [enrollmentIds, students]);

  const teacherReportsAll = useMemo(() => {
    if (!projectId) return [];
    void reportsNonce;
    return getAllMonthlyReports(projectId);
  }, [projectId, reportsNonce]);

  const coordinatorReportsAll = useMemo(() => {
    if (!projectId) return [];
    void reportsNonce;
    return getAllCoordinatorMonthlyReports(projectId);
  }, [projectId, reportsNonce]);

  const reports = useMemo(() => {
    if (isTeacherArea) {
      if (!teacherId) return [];
      const list = teacherReportsAll.filter((r) => r.teacherId === teacherId);
      return [...list].sort((a, b) => {
        const md = b.month.localeCompare(a.month);
        if (md !== 0) return md;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    if (isCoordinatorArea) {
      if (!coordinatorId) return [];
      // Coordinator can see teacher reports + their own coordinator reports
      const ownCoord = coordinatorReportsAll.filter((r) => r.coordinatorId === coordinatorId);
      const list = [...teacherReportsAll, ...ownCoord];
      return list.sort((a: any, b: any) => {
        const md = b.month.localeCompare(a.month);
        if (md !== 0) return md;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    // Admin sees teacher reports + coordinator reports
    const list = [...teacherReportsAll, ...coordinatorReportsAll];
    return list.sort((a: any, b: any) => {
      const md = b.month.localeCompare(a.month);
      if (md !== 0) return md;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [teacherReportsAll, coordinatorReportsAll, isTeacherArea, isCoordinatorArea, teacherId, coordinatorId]);

  const reportId = params.id || null;

  const openedReport = useMemo(() => {
    if (!projectId || !reportId) return null;

    // Teacher area: only teacher report
    if (isTeacherArea) return getMonthlyReportById(projectId, reportId);

    // Admin/Coordinator area: try teacher report first, then coordinator report
    return getMonthlyReportById(projectId, reportId) || getCoordinatorMonthlyReportById(projectId, reportId);
  }, [projectId, reportId, reports.length, isTeacherArea, isCoordinatorArea, reportsNonce]);

  const [draft, setDraft] = useState<(MonthlyReport & { authorRole?: "teacher" | "coordinator" }) | null>(null);

  React.useEffect(() => {
    if (!openedReport) {
      setDraft(null);
      return;
    }

    const authorRole = "teacherId" in openedReport ? "teacher" : "coordinator";
    setDraft({ ...(openedReport as any), authorRole });
  }, [openedReport?.id]);

  const canEdit = useMemo(() => {
    if (!draft) return false;

    // Teacher can edit only their own teacher report
    if (isTeacherArea) {
      if (!teacherId) return false;
      if (draft.authorRole !== "teacher") return false;
      return (draft as any).teacherId === teacherId;
    }

    // Coordinator can edit only their own coordinator report
    if (isCoordinatorArea) {
      if (!coordinatorId) return false;
      if (draft.authorRole !== "coordinator") return false;
      return (draft as any).coordinatorId === coordinatorId;
    }

    // Admin is view-only here
    return false;
  }, [draft, isTeacherArea, isCoordinatorArea, teacherId, coordinatorId]);

  const hasAccessToOpenedReport = useMemo(() => {
    if (!openedReport) return true;

    // Teacher can access only their own teacher report
    if (isTeacherArea) {
      if (!teacherId) return false;
      return "teacherId" in openedReport && openedReport.teacherId === teacherId;
    }

    // Coordinator area: coordinator can see teacher reports and their own coordinator reports
    if (isCoordinatorArea) {
      if (!coordinatorId) return false;
      if ("teacherId" in openedReport) return true;
      return openedReport.coordinatorId === coordinatorId;
    }

    // Admin: can see both
    return true;
  }, [openedReport, isTeacherArea, isCoordinatorArea, teacherId, coordinatorId]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const monthOptions = useMemo(() => filenameMonthOptions(), []);

  const createOrOpenForMonth = () => {
    if (!projectId) return;

    // Teacher creates teacher report
    if (isTeacherArea) {
      if (!teacherId) return;
      const existing = teacherReportsAll.find((r) => r.teacherId === teacherId && r.month === monthKey) || null;
      if (existing) {
        navigate(`${basePath}/${existing.id}`);
        return;
      }

      const nowIso = new Date().toISOString();
      const next: MonthlyReport = {
        id: crypto.randomUUID(),
        projectId,
        teacherId,
        month: monthKey,
        strategyHtml: "",
        adaptationHtml: "",
        observationHtml: "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      upsertMonthlyReport(projectId, next);
      setReportsNonce((x) => x + 1);
      showSuccess("Relatório criado. Preencha e clique em Enviar.");
      navigate(`${basePath}/${next.id}`);
      return;
    }

    // Coordinator creates coordinator report
    if (isCoordinatorArea) {
      if (!coordinatorId) return;
      const existing = coordinatorReportsAll.find((r) => r.coordinatorId === coordinatorId && r.month === monthKey) || null;
      if (existing) {
        navigate(`${basePath}/${existing.id}`);
        return;
      }

      const nowIso = new Date().toISOString();
      const next: any = {
        id: crypto.randomUUID(),
        projectId,
        coordinatorId,
        month: monthKey,
        strategyHtml: "",
        adaptationHtml: "",
        observationHtml: "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      upsertCoordinatorMonthlyReport(projectId, next);
      setReportsNonce((x) => x + 1);
      showSuccess("Relatório do coordenador criado. Preencha e clique em Enviar.");
      navigate(`${basePath}/${next.id}`);
      return;
    }
  };

  const saveDraft = async () => {
    if (!projectId || !draft) return;
    if (!canEdit) return;

    const next = { ...(draft as any), updatedAt: new Date().toISOString() };

    try {
      if (draft.authorRole === "teacher") {
        upsertMonthlyReport(projectId, next);
        await monthlyReportsService.upsertReport(next);
      } else {
        upsertCoordinatorMonthlyReport(projectId, next);
        await coordinatorMonthlyReportsService.upsertReport(next);
      }

      setDraft(next);
      setReportsNonce((x) => x + 1);
      showSuccess("Rascunho salvo.");
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar o rascunho.");
    }
  };

  const submitReport = async () => {
    if (!projectId || !draft) return;
    if (!canEdit) return;

    const nowIso = new Date().toISOString();
    const next: any = {
      ...(draft as any),
      updatedAt: nowIso,
      submittedAt: (draft as any).submittedAt || nowIso,
    };

    try {
      if (draft.authorRole === "teacher") {
        upsertMonthlyReport(projectId, next);
        await monthlyReportsService.upsertReport(next);
      } else {
        upsertCoordinatorMonthlyReport(projectId, next);
        await coordinatorMonthlyReportsService.upsertReport(next);
      }

      setDraft(next);
      setReportsNonce((x) => x + 1);
      setConfirmSubmitOpen(false);
      showSuccess("Relatório enviado/atualizado.");
    } catch (e: any) {
      showError(e?.message || "Não foi possível enviar o relatório.");
    }
  };

  if (!activeProject) {
    return (
      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-10 text-center">
          <p className="text-sm font-bold text-slate-500">Selecione um projeto para continuar.</p>
        </CardContent>
      </Card>
    );
  }

  // Detail view
  if (reportId) {
    if (!openedReport) {
      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 text-center">
              <p className="text-sm font-bold text-slate-500">Relatório não encontrado.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!hasAccessToOpenedReport) {
      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900/5 text-slate-600 flex items-center justify-center border border-slate-200">
                <Lock className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">Acesso restrito</p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {isCoordinatorArea
                  ? "Relatórios do coordenador só podem ser acessados pelo coordenador que criou e pelo administrador."
                  : "Este relatório só pode ser acessado pelo professor que criou e pelo administrador."}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const effective = draft || (openedReport as any);
    const alreadySubmitted = Boolean((effective as any).submittedAt);

    return (
      <div className="space-y-6">
        <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <AlertDialogContent className="rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-primary">
                {alreadySubmitted ? "Reenviar relatório?" : "Enviar relatório?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-medium">
                {alreadySubmitted
                  ? "O administrador verá a versão atualizada. Você pode editar e reenviar sempre que precisar."
                  : "Ao enviar, o relatório fica visível para o administrador. Você pode editar e reenviar sempre que precisar."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl font-black">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-2xl font-black bg-primary hover:bg-primary/90 text-white"
                onClick={submitReport}
              >
                {alreadySubmitted ? "Reenviar" : "Enviar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(effective)}
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  className="rounded-2xl gap-2 h-11 font-black border-slate-200"
                  onClick={saveDraft}
                >
                  <Pencil className="h-4 w-4" />
                  Salvar
                </Button>
                <Button
                  className="rounded-2xl gap-2 h-11 font-black shadow-lg shadow-primary/20"
                  onClick={() => setConfirmSubmitOpen(true)}
                >
                  <Send className="h-4 w-4" />
                  {alreadySubmitted ? "Reenviar" : "Enviar"}
                </Button>
              </>
            )}
          </div>
        </div>

        {isTeacherArea && alreadySubmitted && (
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-900">
            Este relatório já foi enviado. Você pode editar, salvar e reenviar a qualquer momento.
          </div>
        )}

        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-[1.75rem] bg-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {activeProject.imageUrl ? (
                      <img
                        src={activeProject.imageUrl}
                        alt={activeProject.name}
                        className="h-12 w-auto max-w-[120px] object-contain"
                      />
                    ) : (
                      <span className="text-primary font-black text-xl">{activeProject.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {activeProject.name}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight">
                      Relatório mensal
                    </h1>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-slate-200">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-black text-slate-700">{monthLabel(effective.month)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {draft?.authorRole === "coordinator" ? "Coordenador" : "Professor"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">
                        {draft?.authorRole === "coordinator"
                          ? coordinatorsById.get((openedReport as any).coordinatorId) || "Coordenador"
                          : teachersById.get((openedReport as any).teacherId) || "Professor"}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        {effective.submittedAt
                          ? `Enviado em ${new Date(effective.submittedAt).toLocaleString("pt-BR")}`
                          : `Atualizado em ${new Date(effective.updatedAt).toLocaleString("pt-BR")}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno em destaque</p>
                  <StudentCombobox
                    students={selectableStudents}
                    value={draft?.positiveStudentId}
                    onChange={(id) =>
                      setDraft((prev) => (prev ? { ...prev, positiveStudentId: id } : prev))
                    }
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno reflexivo</p>
                  <StudentCombobox
                    students={selectableStudents}
                    value={draft?.reflexiveStudentId}
                    onChange={(id) =>
                      setDraft((prev) => (prev ? { ...prev, reflexiveStudentId: id } : prev))
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg font-black text-primary">Estratégia</CardTitle>
                  <p className="text-sm font-bold text-slate-500">
                    O que foi planejado e aplicado no mês.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <RichTextEditor
                    value={draft?.strategyHtml || ""}
                    onChange={(html) => setDraft((prev) => (prev ? { ...prev, strategyHtml: html } : prev))}
                    placeholder="Descreva a estratégia pedagógica..."
                    disabled={!canEdit}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg font-black text-primary">Adaptação</CardTitle>
                  <p className="text-sm font-bold text-slate-500">
                    Ajustes feitos para atender diferentes necessidades.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <RichTextEditor
                    value={draft?.adaptationHtml || ""}
                    onChange={(html) => setDraft((prev) => (prev ? { ...prev, adaptationHtml: html } : prev))}
                    placeholder="Descreva as adaptações..."
                    disabled={!canEdit}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg font-black text-primary">Observações</CardTitle>
                  <p className="text-sm font-bold text-slate-500">
                    Registros, percepções e próximos passos.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <RichTextEditor
                    value={draft?.observationHtml || ""}
                    onChange={(html) => setDraft((prev) => (prev ? { ...prev, observationHtml: html } : prev))}
                    placeholder="Descreva suas observações..."
                    disabled={!canEdit}
                  />
                </CardContent>
              </Card>
            </div>

            {!canEdit && (
              <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                {isTeacherArea
                  ? "Você não tem permissão para editar este relatório."
                  : "Visualização do relatório enviado pelo professor."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Relatório mensal</h1>
          <p className="text-slate-500 font-medium">
            {isTeacherArea
              ? "Envie seu relatório para o administrador do projeto e acompanhe o histórico."
              : isCoordinatorArea
                ? "Veja os relatórios dos professores e faça também o relatório do coordenador (visível só para você e o administrador)."
                : "Veja os relatórios dos professores e do coordenador neste projeto."}
          </p>
        </div>

        {(isTeacherArea || isCoordinatorArea) && (
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="grid gap-2 grid-cols-2">
              <Select value={selectedMonthPart} onValueChange={setSelectedMonthPart}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
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

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
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

            <Button
              className="rounded-2xl gap-2 h-11 font-black shadow-lg shadow-primary/20"
              onClick={() => {
                if (isTeacherArea && !teacherId) {
                  showError("Sessão do professor inválida.");
                  return;
                }
                if (isCoordinatorArea && !coordinatorId) {
                  showError("Sessão do coordenador inválida.");
                  return;
                }
                createOrOpenForMonth();
              }}
            >
              <FilePlus2 className="h-4 w-4" />
              Criar / abrir ({monthLabel(monthKey)})
            </Button>
          </div>
        )}
      </div>

      <div className={cn("grid gap-4", reports.length === 0 ? "" : "md:grid-cols-2 lg:grid-cols-3")}>
        {reports.length === 0 ? (
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                <CalendarDays className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">Nenhum relatório ainda.</p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {isTeacherArea ? "Crie seu primeiro relatório mensal." : "Ainda não há relatórios enviados neste projeto."}
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((r) => {
            const authorName = "teacherId" in (r as any)
              ? (teachersById.get((r as any).teacherId) || "Professor")
              : (coordinatorsById.get((r as any).coordinatorId) || "Coordenador");

            return (
              <button
                key={r.id}
                onClick={() => navigate(`${basePath}/${r.id}`)}
                className="text-left"
              >
                <Card className="border border-slate-100 bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{monthLabel(r.month)}</p>
                        <p className="text-lg font-black text-primary mt-1">Relatório mensal</p>
                        {!isTeacherArea && (
                          <p className="mt-2 text-sm font-bold text-slate-600 truncate">{authorName}</p>
                        )}
                      </div>
                      {statusBadge(r)}
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-bold text-slate-600">
                      {r.submittedAt
                        ? `Enviado em ${new Date(r.submittedAt).toLocaleDateString("pt-BR")}`
                        : `Rascunho (atualizado em ${new Date(r.updatedAt).toLocaleDateString("pt-BR")})`}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/15 px-3 py-2 text-xs font-black">
                      Abrir relatório
                    </div>
                  </div>
                </Card>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}