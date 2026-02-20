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
import { getActiveProject } from "@/utils/projects";
import { getTeacherSessionTeacherId } from "@/utils/teacher-auth";
import { readGlobalStudents, readScoped } from "@/utils/storage";
import type { SchoolClass } from "@/types/class";
import type { StudentRegistration } from "@/types/student";
import type { MonthlyReport } from "@/types/monthly-report";
import { getAllMonthlyReports, getMonthlyReportById, upsertMonthlyReport } from "@/utils/monthly-reports";
import { readGlobalTeachers } from "@/utils/teachers";
import RichTextEditor from "@/components/RichTextEditor";
import { showError, showSuccess } from "@/utils/toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  Lock,
  Pencil,
  Send,
  User,
} from "lucide-react";

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

function statusBadge(r: MonthlyReport) {
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

function projectStudentPool(classes: SchoolClass[], allStudents: StudentRegistration[]) {
  const ids = new Set<string>();
  for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);
  return allStudents
    .filter((s) => ids.has(s.id))
    .sort((a, b) =>
      (a.socialName || a.preferredName || a.fullName).localeCompare(
        b.socialName || b.preferredName || b.fullName,
        "pt-BR",
      ),
    );
}

export default function MonthlyReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const isTeacherArea = location.pathname.startsWith("/professor");
  const teacherId = useMemo(() => (isTeacherArea ? getTeacherSessionTeacherId() : null), [isTeacherArea]);

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);
  const projectId = activeProject?.id || null;

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const basePath = isTeacherArea ? "/professor/relatorios/mensais" : "/relatorios/mensais";

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

  const classes = useMemo(() => readScoped<SchoolClass[]>("classes", []), [projectId]);
  const students = useMemo(() => readGlobalStudents<StudentRegistration[]>([]), [projectId]);

  const selectableStudents = useMemo(() => projectStudentPool(classes, students), [classes, students]);

  const allReports = useMemo(() => {
    if (!projectId) return [];
    return getAllMonthlyReports(projectId);
  }, [projectId]);

  const reports = useMemo(() => {
    if (!teacherId && isTeacherArea) return [];
    const list = isTeacherArea ? allReports.filter((r) => r.teacherId === teacherId) : allReports;
    return [...list].sort((a, b) => {
      const md = b.month.localeCompare(a.month);
      if (md !== 0) return md;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [allReports, isTeacherArea, teacherId]);

  const reportId = params.id || null;

  const openedReport = useMemo(() => {
    if (!projectId || !reportId) return null;
    return getMonthlyReportById(projectId, reportId);
  }, [projectId, reportId, reports.length]);

  const [draft, setDraft] = useState<MonthlyReport | null>(null);

  // Initialize draft when opening a report.
  React.useEffect(() => {
    if (!openedReport) {
      setDraft(null);
      return;
    }
    setDraft({ ...openedReport });
  }, [openedReport?.id]);

  const canEdit = useMemo(() => {
    if (!draft) return false;
    if (!isTeacherArea) return false;
    if (!teacherId) return false;
    if (draft.teacherId !== teacherId) return false;
    return !draft.submittedAt;
  }, [draft, isTeacherArea, teacherId]);

  const hasAccessToOpenedReport = useMemo(() => {
    if (!openedReport) return true;
    if (!isTeacherArea) return true;
    if (!teacherId) return false;
    return openedReport.teacherId === teacherId;
  }, [openedReport, isTeacherArea, teacherId]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const monthOptions = useMemo(() => filenameMonthOptions(), []);

  const createOrOpenForMonth = () => {
    if (!projectId || !teacherId) return;

    const existing = reports.find((r) => r.teacherId === teacherId && r.month === monthKey) || null;
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
    showSuccess("Relatório criado. Preencha e clique em Enviar.");
    navigate(`${basePath}/${next.id}`);
  };

  const saveDraft = () => {
    if (!projectId || !draft) return;
    const next = { ...draft, updatedAt: new Date().toISOString() };
    upsertMonthlyReport(projectId, next);
    setDraft(next);
    showSuccess("Rascunho salvo.");
  };

  const submitReport = () => {
    if (!projectId || !draft) return;
    if (!canEdit) return;

    const next: MonthlyReport = {
      ...draft,
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    };
    upsertMonthlyReport(projectId, next);
    setDraft(next);
    setConfirmSubmitOpen(false);
    showSuccess("Relatório enviado ao administrador.");
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
                Este relatório só pode ser acessado pelo professor que criou e pelo administrador.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const effective = draft || openedReport;
    const isSubmitted = Boolean(effective.submittedAt);

    return (
      <div className="space-y-6">
        <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <AlertDialogContent className="rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-primary">Enviar relatório?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-medium">
                Ao enviar, o relatório fica visível para o administrador e não poderá ser editado pelo professor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl font-black">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-2xl font-black bg-primary hover:bg-primary/90 text-white"
                onClick={submitReport}
              >
                Enviar
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
                  Enviar
                </Button>
              </>
            )}
          </div>
        </div>

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
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professor</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">
                        {teachersById.get(openedReport.teacherId) || "Professor"}
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
                  <Select
                    value={draft?.positiveStudentId || ""}
                    onValueChange={(v) =>
                      setDraft((prev) => (prev ? { ...prev, positiveStudentId: v || undefined } : prev))
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-white">
                      <SelectValue placeholder="Selecione um aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {selectableStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {(s.socialName || s.preferredName || s.fullName).trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno reflexivo</p>
                  <Select
                    value={draft?.reflexiveStudentId || ""}
                    onValueChange={(v) =>
                      setDraft((prev) => (prev ? { ...prev, reflexiveStudentId: v || undefined } : prev))
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-white">
                      <SelectValue placeholder="Selecione um aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {selectableStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {(s.socialName || s.preferredName || s.fullName).trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  ? "Este relatório está enviado e não pode mais ser editado pelo professor."
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
            Envie seu relatório para o administrador do projeto e acompanhe o histórico.
          </p>
        </div>

        {isTeacherArea && (
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
                if (!teacherId) {
                  showError("Sessão do professor inválida.");
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
            const teacherName = teachersById.get(r.teacherId) || "Professor";
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
                          <p className="mt-2 text-sm font-bold text-slate-600 truncate">{teacherName}</p>
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