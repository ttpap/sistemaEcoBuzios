"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Settings,
  FileDown,
  Upload,
  Trash2,
  Plus,
  Minus,
  Users,
  CheckSquare,
  Square,
  Eye,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { getActiveProjectId, getActiveProject } from "@/utils/projects";
import { certificateService } from "@/services/certificateService";
import { fetchStudentsRemoteWithMeta } from "@/services/studentsService";
import { generateCertificatePdf } from "@/utils/certificate-pdf";
import { generateStudentReportPdf } from "@/utils/student-report-pdf";
import type { StudentReportData, NumeroStats } from "@/utils/student-report-pdf";
import { fetchAttendanceSessionsRemote } from "@/integrations/supabase/attendance";
import {
  fetchClassesRemoteWithMeta,
  fetchEnrollmentsRemoteWithMeta,
  fetchProjectEnrollmentsRemoteWithMeta,
  fetchProjectNucleosRemote,
} from "@/services/classesService";
import { imageFileToCompressedDataUrl } from "@/utils/image-compress";
import type { CertificateConfig, CertificateSignature } from "@/types/certificate";
import type { StudentRegistration } from "@/types/student";
import type { SchoolClass } from "@/types/class";

// ─── Componente de upload de imagem ──────────────────────────────────────────
function ImageUploadField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await imageFileToCompressedDataUrl(file, {
        maxSide: 800,
        outputType: "image/png",
      });
      onChange(dataUrl);
    } catch {
      showError("Erro ao carregar imagem.");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="flex items-center gap-2">
            <img
              src={value}
              alt={label}
              className="h-14 w-auto max-w-[120px] object-contain rounded border border-slate-200 bg-white p-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 text-slate-500 hover:border-primary hover:text-primary transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">Clique para enviar</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            Trocar
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Certificates() {
  const projectId = getActiveProjectId() ?? "";
  const projectName = getActiveProject()?.name ?? "Projeto";

  // Config
  const [config, setConfig] = useState<CertificateConfig>(() =>
    certificateService.getDefault(projectId),
  );
  const [savingConfig, setSavingConfig] = useState(false);

  // Turmas e filtro
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [projectEnrolledIds, setProjectEnrolledIds] = useState<Set<string> | null>(null);
  const [classEnrolledIds, setClassEnrolledIds] = useState<Set<string> | null>(null);
  const [loadingClassFilter, setLoadingClassFilter] = useState(false);

  // Emitir
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [workload, setWorkload] = useState("");
  const [generating, setGenerating] = useState(false);

  // Relatório
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [generatingReport, setGeneratingReport] = useState(false);
  const [previewReportOpen, setPreviewReportOpen] = useState(false);
  const [previewReportDataList, setPreviewReportDataList] = useState<StudentReportData[]>([]);
  const [previewReportIndex, setPreviewReportIndex] = useState(0);
  const [loadingPreviewReport, setLoadingPreviewReport] = useState(false);

  // Carrega config, turmas, matrículas e alunos ao montar
  useEffect(() => {
    if (!projectId) return;

    certificateService.getByProject(projectId).then((cfg) => {
      if (cfg) {
        setConfig(cfg);
        setCustomText(cfg.text_template);
      } else {
        setCustomText("");
      }
    });

    Promise.all([
      fetchClassesRemoteWithMeta(projectId).then(({ classes: cls }) => cls),
      fetchProjectNucleosRemote(projectId),
    ]).then(([turmas, nucleos]) => {
      const merged = [...turmas, ...nucleos];
      const uniq = Array.from(new Map(merged.map((c) => [c.id, c])).values());
      setClasses(uniq);
    });

    fetchProjectEnrollmentsRemoteWithMeta(projectId).then(({ enrollments }) => {
      setProjectEnrolledIds(new Set(enrollments.map((e) => e.student_id)));
    });

    setLoadingStudents(true);
    fetchStudentsRemoteWithMeta(projectId)
      .then(({ students: s }) => {
        setStudents(s);
      })
      .finally(() => setLoadingStudents(false));
  }, [projectId]);

  // Quando muda o filtro de turma, busca matrículas da turma selecionada
  useEffect(() => {
    if (selectedClassId === "all") {
      setClassEnrolledIds(null);
      return;
    }
    setLoadingClassFilter(true);
    fetchEnrollmentsRemoteWithMeta(selectedClassId)
      .then(({ enrollments }) => {
        setClassEnrolledIds(
          new Set(enrollments.filter((e) => !e.removed_at).map((e) => e.student_id)),
        );
        // Limpa seleções ao trocar de turma
        setSelectedIds(new Set());
        setSelectedReportIds(new Set());
      })
      .finally(() => setLoadingClassFilter(false));
  }, [selectedClassId]);

  // Lista de alunos filtrada pela turma selecionada, em ordem alfabética
  const displayedStudents = useMemo(() => {
    let list: StudentRegistration[];
    if (selectedClassId === "all") {
      list = projectEnrolledIds
        ? students.filter((s) => projectEnrolledIds.has(s.id))
        : students;
    } else {
      list = classEnrolledIds
        ? students.filter((s) => classEnrolledIds.has(s.id))
        : students;
    }
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [students, selectedClassId, projectEnrolledIds, classEnrolledIds]);

  // Sincroniza texto customizado quando config muda por fora
  const handleConfigTextTemplate = (val: string) => {
    setConfig((c) => ({ ...c, text_template: val }));
    setCustomText(val);
  };

  // ── Configurações ──────────────────────────────────────────────────────────
  const updateSignatureCount = (n: number) => {
    const count = Math.max(1, Math.min(5, n));
    setConfig((c) => {
      const sigs = [...c.signatures];
      while (sigs.length < count)
        sigs.push({ name: "", title: "", image: "" });
      return { ...c, signatures_count: count, signatures: sigs };
    });
  };

  const updateSignature = (index: number, field: keyof CertificateSignature, value: string) => {
    setConfig((c) => {
      const sigs = [...c.signatures];
      sigs[index] = { ...sigs[index], [field]: value };
      return { ...c, signatures: sigs };
    });
  };

  const handleSaveConfig = async () => {
    if (!projectId) return;
    setSavingConfig(true);
    try {
      await certificateService.save({ ...config, project_id: projectId });
      showSuccess("Configurações salvas com sucesso!");
    } catch (e) {
      showError("Erro ao salvar configurações.");
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Emitir ─────────────────────────────────────────────────────────────────
  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(displayedStudents.map((s) => s.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleGenerate = async (all: boolean) => {
    const targets = all
      ? displayedStudents
      : displayedStudents.filter((s) => selectedIds.has(s.id));

    if (targets.length === 0) {
      showError("Selecione pelo menos um aluno.");
      return;
    }

    setGenerating(true);
    try {
      await generateCertificatePdf(
        config,
        targets.map((s) => ({
          fullName: s.fullName,
          socialName: s.socialName || s.preferredName,
        })),
        { customText, periodStart, periodEnd, workload },
        projectName,
      );
      showSuccess(
        targets.length === 1
          ? "Certificado gerado!"
          : `${targets.length} certificados gerados!`,
      );
    } catch (e) {
      showError("Erro ao gerar certificado.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleReport = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllReport = () => setSelectedReportIds(new Set(displayedStudents.map((s) => s.id)));
  const clearAllReport = () => setSelectedReportIds(new Set());

  const buildReportData = (student: StudentRegistration, finalized: any[]): StudentReportData => {
    const studentSessions = finalized.filter((s) => s.studentIds?.includes(student.id));
    const stats = { totalSessions: studentSessions.length, presente: 0, falta: 0, atrasado: 0, justificada: 0 };
    const perClass = new Map<string, typeof stats>();

    for (const session of studentSessions) {
      const status = session.records[student.id];
      if (!status) continue;
      if (status === "presente") stats.presente++;
      else if (status === "falta") stats.falta++;
      else if (status === "atrasado") stats.atrasado++;
      else if (status === "justificada") stats.justificada++;

      const cid = session.classId;
      const cur = perClass.get(cid) || { totalSessions: 0, presente: 0, falta: 0, atrasado: 0, justificada: 0 };
      cur.totalSessions += 1;
      if (status === "presente") cur.presente++;
      else if (status === "falta") cur.falta++;
      else if (status === "atrasado") cur.atrasado++;
      else if (status === "justificada") cur.justificada++;
      perClass.set(cid, cur);
    }

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const numeros: NumeroStats[] = [];
    for (const [cid, st] of perClass.entries()) {
      const cls = classMap.get(cid);
      if (cls?.parentClassId) {
        const parent = classMap.get(cls.parentClassId);
        numeros.push({
          classId: cid,
          className: cls.name,
          parentClassName: parent?.name,
          stats: st,
        });
      }
    }

    return {
      studentId: student.id,
      fullName: student.fullName,
      socialName: student.socialName || student.preferredName,
      stats,
      numeros: numeros.length > 0 ? numeros : undefined,
    };
  };

  const handlePreviewReport = async () => {
    const targets = displayedStudents.filter((s) => selectedReportIds.has(s.id));
    if (targets.length === 0) {
      showError("Selecione pelo menos um aluno para pré-visualizar.");
      return;
    }
    setLoadingPreviewReport(true);
    setPreviewReportIndex(0);
    setPreviewReportOpen(true);
    try {
      const sessions = await fetchAttendanceSessionsRemote(projectId);
      const finalized = sessions.filter((s) => !!s.finalizedAt);
      const allData = targets.map((student) => buildReportData(student, finalized));
      setPreviewReportDataList(allData);
    } finally {
      setLoadingPreviewReport(false);
    }
  };

  const handleGenerateReport = async (all: boolean) => {
    const targets = all
      ? displayedStudents
      : displayedStudents.filter((s) => selectedReportIds.has(s.id));

    if (targets.length === 0) {
      showError("Selecione pelo menos um aluno.");
      return;
    }

    setGeneratingReport(true);
    try {
      const sessions = await fetchAttendanceSessionsRemote(projectId);
      const finalized = sessions.filter((s) => !!s.finalizedAt);

      const reportData = targets.map((student) => buildReportData(student, finalized));

      await generateStudentReportPdf(reportData, projectName, config.logo_top, config.logo_bottom);
      showSuccess(
        targets.length === 1
          ? "Relatório gerado!"
          : `${targets.length} relatórios gerados!`,
      );
    } catch {
      showError("Erro ao gerar relatório.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const displayName = (s: StudentRegistration) =>
    s.socialName || s.preferredName || s.fullName;

  // ── Pré-visualização ───────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  const previewStudents = useMemo(
    () => displayedStudents.filter((s) => selectedIds.has(s.id)),
    [displayedStudents, selectedIds],
  );
  const previewStudentName = (() => {
    const s = previewStudents[previewStudentIndex];
    if (!s) return "Nome do Aluno";
    const social = s.socialName || s.preferredName;
    return social ? `${s.fullName} (${social})` : s.fullName;
  })();

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Award className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Certificados</h1>
          <p className="text-sm text-slate-500">{projectName}</p>
        </div>
      </div>

      {/* Filtro de turma */}
      <div className="flex items-center gap-3">
        <Users className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="text-sm font-bold text-slate-600 shrink-0">Turma:</span>
        <Select
          value={selectedClassId}
          onValueChange={(v) => {
            setSelectedClassId(v);
            setSelectedIds(new Set());
            setSelectedReportIds(new Set());
          }}
        >
          <SelectTrigger className="rounded-xl h-9 w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loadingClassFilter && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      <Tabs defaultValue="emitir">
        <TabsList className="rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="emitir" className="rounded-xl font-bold px-5">
            <FileDown className="h-4 w-4 mr-2" />
            Emitir
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="rounded-xl font-bold px-5">
            <BarChart2 className="h-4 w-4 mr-2" />
            Relatório
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="rounded-xl font-bold px-5">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* ══════════════ ABA EMITIR ══════════════ */}
        <TabsContent value="emitir" className="mt-6 space-y-5">
          {/* Texto do certificado */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black text-slate-700">
                Texto do Certificado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Use{" "}
                <code className="bg-slate-100 px-1 rounded font-mono">**</code> onde
                o nome do aluno deve aparecer em destaque.
              </p>
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                placeholder="Certificamos que ** concluiu com êxito..."
                className="rounded-2xl font-medium text-sm resize-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-600">Período — início</Label>
                  <Input
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    placeholder="ex: Julho de 2024"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-600">Período — fim</Label>
                  <Input
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    placeholder="ex: Maio de 2025"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-600">Carga horária</Label>
                  <Input
                    value={workload}
                    onChange={(e) => setWorkload(e.target.value)}
                    placeholder="ex: 260 horas/aula"
                    className="mt-1 rounded-xl text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de alunos */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Alunos do projeto
                  <Badge variant="secondary" className="rounded-full font-bold">
                    {displayedStudents.length}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs font-bold text-primary"
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs font-bold text-slate-500"
                  >
                    <Square className="h-3.5 w-3.5 mr-1" />
                    Nenhum
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents || loadingClassFilter ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : displayedStudents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nenhum aluno encontrado nesta turma.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {displayedStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(s.id)}
                        onCheckedChange={() => toggleStudent(s.id)}
                      />
                      <span className="text-sm font-bold text-slate-700">{s.fullName}</span>
                      {(s.socialName || s.preferredName) && (
                        <span className="text-xs text-slate-400">({s.socialName || s.preferredName})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                <Button
                  onClick={() => { setPreviewStudentIndex(0); setPreviewOpen(true); }}
                  variant="outline"
                  className="rounded-2xl font-black border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Pré-visualizar
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={generating || selectedIds.size === 0}
                  className="flex-1 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {generating ? "Gerando..." : `Gerar selecionados (${selectedIds.size})`}
                </Button>
                <Button
                  onClick={() => handleGenerate(true)}
                  disabled={generating || displayedStudents.length === 0}
                  variant="outline"
                  className="flex-1 rounded-2xl font-black border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {generating ? "Gerando..." : `Gerar todos (${displayedStudents.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ ABA RELATÓRIO ══════════════ */}
        <TabsContent value="relatorio" className="mt-6 space-y-5">
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Relatório por Aluno
                    <Badge variant="secondary" className="rounded-full font-bold">
                      {displayedStudents.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    Gera um PDF A4 por aluno com horas, frequência, faltas, atrasos e justificativas.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllReport}
                    className="text-xs font-bold text-primary"
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllReport}
                    className="text-xs font-bold text-slate-500"
                  >
                    <Square className="h-3.5 w-3.5 mr-1" />
                    Nenhum
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents || loadingClassFilter ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : displayedStudents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nenhum aluno encontrado nesta turma.
                </p>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {displayedStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedReportIds.has(s.id)}
                        onCheckedChange={() => toggleReport(s.id)}
                      />
                      <span className="text-sm font-bold text-slate-700">{s.fullName}</span>
                      {(s.socialName || s.preferredName) && (
                        <span className="text-xs text-slate-400">
                          ({s.socialName || s.preferredName})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                <Button
                  onClick={handlePreviewReport}
                  disabled={loadingPreviewReport || displayedStudents.length === 0}
                  variant="outline"
                  className="rounded-2xl font-black border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {loadingPreviewReport ? "Carregando..." : "Pré-visualizar"}
                </Button>
                <Button
                  onClick={() => handleGenerateReport(false)}
                  disabled={generatingReport || selectedReportIds.size === 0}
                  className="flex-1 rounded-2xl font-black bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  {generatingReport ? "Gerando..." : `Gerar selecionados (${selectedReportIds.size})`}
                </Button>
                <Button
                  onClick={() => handleGenerateReport(true)}
                  disabled={generatingReport || displayedStudents.length === 0}
                  variant="outline"
                  className="flex-1 rounded-2xl font-black border-indigo-400 text-indigo-700 hover:bg-indigo-50"
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  {generatingReport ? "Gerando..." : `Gerar todos (${displayedStudents.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ ABA CONFIGURAÇÕES ══════════════ */}
        <TabsContent value="configuracoes" className="mt-6 space-y-5">
          {/* Template de texto */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black text-slate-700">
                Template do Texto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-400">
                Este texto será pré-carregado ao emitir certificados. Use{" "}
                <code className="bg-slate-100 px-1 rounded font-mono">**</code> onde
                o nome do aluno deve aparecer em destaque.
              </p>
              <Textarea
                value={config.text_template}
                onChange={(e) => handleConfigTextTemplate(e.target.value)}
                rows={5}
                placeholder="Certificamos que ** concluiu com êxito o ciclo do projeto..."
                className="rounded-2xl font-medium text-sm resize-none"
              />
            </CardContent>
          </Card>

          {/* Logos */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black text-slate-700">Logos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <ImageUploadField
                label="Logo do topo (projeto)"
                value={config.logo_top}
                onChange={(v) => setConfig((c) => ({ ...c, logo_top: v }))}
                hint="Exibida centralizada no topo do certificado"
              />
              <ImageUploadField
                label="Logo do rodapé (instituição)"
                value={config.logo_bottom}
                onChange={(v) => setConfig((c) => ({ ...c, logo_bottom: v }))}
                hint="Exibida centralizada no rodapé do certificado"
              />
            </CardContent>
          </Card>

          {/* Borda */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black text-slate-700">Borda</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Cor da borda</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.border_color ?? "#C9A84C"}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, border_color: e.target.value }))
                    }
                    className="h-10 w-14 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={config.border_color ?? "#C9A84C"}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, border_color: e.target.value }))
                    }
                    className="rounded-xl font-mono text-sm w-32"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Estilo da borda</Label>
                <Select
                  value={config.border_style}
                  onValueChange={(v) =>
                    setConfig((c) => ({ ...c, border_style: v as "solid" | "double" }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Simples</SelectItem>
                    <SelectItem value="double">Dupla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assinaturas */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-700">Assinaturas</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSignatureCount(config.signatures_count - 1)}
                    disabled={config.signatures_count <= 1}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-black text-slate-700 w-6 text-center">
                    {config.signatures_count}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSignatureCount(config.signatures_count + 1)}
                    disabled={config.signatures_count >= 5}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {Array.from({ length: config.signatures_count }).map((_, i) => {
                const sig = config.signatures[i] ?? { name: "", title: "", image: "" };
                return (
                  <div
                    key={i}
                    className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50"
                  >
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Assinatura {i + 1}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-600">Nome</Label>
                        <Input
                          value={sig.name ?? ""}
                          onChange={(e) => updateSignature(i, "name", e.target.value)}
                          placeholder="Nome completo"
                          className="mt-1 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-600">Cargo / Título</Label>
                        <Input
                          value={sig.title ?? ""}
                          onChange={(e) => updateSignature(i, "title", e.target.value)}
                          placeholder="ex: Coordenador Geral"
                          className="mt-1 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <ImageUploadField
                      label="Imagem da assinatura"
                      value={sig.image}
                      onChange={(v) => updateSignature(i, "image", v)}
                      hint="Imagem PNG com fundo transparente recomendada"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Tipografia */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black text-slate-700">Tipografia</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Família da fonte</Label>
                <Select
                  value={config.font_family}
                  onValueChange={(v) =>
                    setConfig((c) => ({ ...c, font_family: v as "times" | "helvetica" | "courier" }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="times">Times New Roman (serif)</SelectItem>
                    <SelectItem value="helvetica">Helvetica (sans-serif)</SelectItem>
                    <SelectItem value="courier">Courier (monoespaçada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Tamanho da fonte</Label>
                <Select
                  value={String(config.font_size)}
                  onValueChange={(v) =>
                    setConfig((c) => ({ ...c, font_size: Number(v) }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}pt
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Botão salvar */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="rounded-2xl font-black px-8 bg-primary hover:bg-primary/90"
            >
              {savingConfig ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════════════ DIALOG PRÉ-VISUALIZAÇÃO RELATÓRIO ══════════════ */}
      <Dialog open={previewReportOpen} onOpenChange={setPreviewReportOpen}>
        <DialogContent className="max-w-2xl p-4">
          <DialogTitle className="sr-only">Pré-visualização do Relatório</DialogTitle>
          {loadingPreviewReport ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : previewReportDataList.length > 0 ? (
            <div className="space-y-3">
              {previewReportDataList.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={previewReportIndex === 0}
                    onClick={() => setPreviewReportIndex((i) => i - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-500">
                    {previewReportIndex + 1} / {previewReportDataList.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={previewReportIndex === previewReportDataList.length - 1}
                    onClick={() => setPreviewReportIndex((i) => i + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <ReportPreview
                data={previewReportDataList[previewReportIndex]}
                projectName={projectName}
                logoProject={config.logo_top}
                logoEco={config.logo_bottom}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ══════════════ DIALOG DE PRÉ-VISUALIZAÇÃO ══════════════ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-4">
          <DialogTitle className="sr-only">Pré-visualização do Certificado</DialogTitle>
          {previewStudents.length > 1 && (
            <div className="flex items-center justify-between px-1 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                disabled={previewStudentIndex === 0}
                onClick={() => setPreviewStudentIndex((i) => i - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-slate-500">
                {previewStudentIndex + 1} / {previewStudents.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                disabled={previewStudentIndex === previewStudents.length - 1}
                onClick={() => setPreviewStudentIndex((i) => i + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <CertificatePreview
            config={config}
            studentName={previewStudentName}
            customText={customText}
            periodStart={periodStart}
            periodEnd={periodEnd}
            workload={workload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Gráfico donut SVG ────────────────────────────────────────────────────────
function DonutChartSvg({ stats }: { stats: StudentReportData["stats"] }) {
  const total = stats.presente + stats.falta + stats.atrasado + stats.justificada;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const segments = [
    { value: stats.presente, color: "#22c55e" },
    { value: stats.falta, color: "#ef4444" },
    { value: stats.atrasado, color: "#f59e0b" },
    { value: stats.justificada, color: "#8b5cf6" },
  ];

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill="#94a3b8">Sem dados</text>
      </svg>
    );
  }

  const nonZero = segments.filter((s) => s.value > 0);
  const pct = Math.round(((stats.presente + stats.atrasado) / total) * 100);

  // Caso 1 segmento só (100%) — círculo cheio, evita arco degenerado
  if (nonZero.length === 1) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx={cx} cy={cy} r={r} fill={nonZero[0].color} />
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontWeight="bold" fontSize={13} fill="#0f172a">{pct}%</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={7} fill="#64748b">freq.</text>
      </svg>
    );
  }

  let current = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];

  for (const seg of segments) {
    if (seg.value === 0) continue;
    const sweep = (seg.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(current);
    const y1 = cy + r * Math.sin(current);
    const x2 = cx + r * Math.cos(current + sweep);
    const y2 = cy + r * Math.sin(current + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({ d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: seg.color });
    current += sweep;
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontWeight="bold" fontSize={13} fill="#0f172a">{pct}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={7} fill="#64748b">freq.</text>
    </svg>
  );
}

// ─── Pré-visualização HTML do relatório do aluno ─────────────────────────────
function ReportPreview({
  data,
  projectName,
  logoProject,
  logoEco,
}: {
  data: StudentReportData;
  projectName: string;
  logoProject: string;
  logoEco: string;
}) {
  const { stats } = data;
  const total = stats.presente + stats.falta + stats.atrasado + stats.justificada;
  const freqPct = total > 0 ? Math.round(((stats.presente + stats.atrasado) / total) * 100) : 0;
  const totalHours = (stats.presente + stats.atrasado) * 2;
  const studentName = data.socialName ? `${data.fullName} (${data.socialName})` : data.fullName;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const cardData = [
    { label: "Horas participadas", value: `${totalHours}h`, bg: "#22c55e" },
    { label: "Frequência", value: `${freqPct}%`, bg: "#3b82f6" },
    { label: "Presenças", value: String(stats.presente), bg: "#10b981" },
    { label: "Faltas", value: String(stats.falta), bg: "#ef4444" },
    { label: "Atrasos", value: String(stats.atrasado), bg: "#f59e0b" },
    { label: "Justificadas", value: String(stats.justificada), bg: "#8b5cf6" },
  ];

  const legendItems = [
    { label: "Presenças", count: stats.presente, color: "#22c55e" },
    { label: "Faltas", count: stats.falta, color: "#ef4444" },
    { label: "Atrasos", count: stats.atrasado, color: "#f59e0b" },
    { label: "Justificadas", count: stats.justificada, color: "#8b5cf6" },
  ];

  return (
    <div className="w-full">
      <p className="text-xs text-slate-400 mb-3 text-center">
        Pré-visualização — proporcional ao relatório A4 retrato
      </p>
      <div
        className="w-full bg-white overflow-hidden flex flex-col gap-0"
        style={{ aspectRatio: "210 / 297", padding: "4% 5%", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
      >
        {/* Logos */}
        <div className="flex justify-between items-center" style={{ height: "8%" }}>
          {logoProject ? (
            <img src={logoProject} alt="logo projeto" style={{ maxHeight: "100%", maxWidth: "30%", objectFit: "contain" }} />
          ) : <div className="text-slate-300 text-xs italic">[ logo projeto ]</div>}
          {logoEco ? (
            <img src={logoEco} alt="logo eco" style={{ maxHeight: "100%", maxWidth: "30%", objectFit: "contain" }} />
          ) : <div className="text-slate-300 text-xs italic">[ logo ecobúzios ]</div>}
        </div>

        {/* Separator */}
        <div style={{ height: "1px", background: "#e2e8f0", margin: "1.5% 0" }} />

        {/* Header */}
        <div className="flex justify-between items-baseline" style={{ marginBottom: "1%" }}>
          <span style={{ fontSize: "1.1vw", fontWeight: 700, color: "#1e293b" }}>RELATÓRIO DE FREQUÊNCIA</span>
          <span style={{ fontSize: "0.7vw", color: "#94a3b8" }}>{today}</span>
        </div>
        <div style={{ fontSize: "1.35vw", fontWeight: 800, color: "#0f172a", marginBottom: "0.5%" }}>{studentName}</div>
        <div style={{ fontSize: "0.8vw", color: "#64748b", marginBottom: "2.5%" }}>Projeto: {projectName}</div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5%", marginBottom: "3%" }}>
          {cardData.map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: "4px", padding: "2.5% 3%", textAlign: "center" }}>
              <div style={{ fontSize: "1.6vw", fontWeight: 700, color: "#fff" }}>{c.value}</div>
              <div style={{ fontSize: "0.6vw", color: "rgba(255,255,255,.85)", marginTop: "1px" }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Chart + legend */}
        <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#1e293b", marginBottom: "1.5%" }}>
          Distribuição de Frequência
        </div>
        <div className="flex items-center" style={{ gap: "4%", flex: 1 }}>
          <div style={{ width: "32%", aspectRatio: "1" }}>
            <DonutChartSvg stats={stats} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4%" }}>
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div style={{ width: "1vw", height: "1vw", borderRadius: "2px", background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.75vw", color: "#334155" }}>
                  <strong>{item.label}:</strong> {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Números participados */}
        {data.numeros && data.numeros.length > 0 && (
          <div style={{ marginTop: "3%" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#1e293b", marginBottom: "1.5%" }}>
              Números participados
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2%" }}>
              {data.numeros.map((n) => {
                const nTotal = n.stats.presente + n.stats.falta + n.stats.atrasado + n.stats.justificada;
                const nFreq = nTotal > 0 ? Math.round(((n.stats.presente + n.stats.atrasado) / nTotal) * 100) : 0;
                const nHours = (n.stats.presente + n.stats.atrasado) * 2;
                const numeroCards = [
                  { label: "Horas", value: `${nHours}h`, bg: "#22c55e" },
                  { label: "Frequência", value: `${nFreq}%`, bg: "#3b82f6" },
                  { label: "Presenças", value: String(n.stats.presente + n.stats.atrasado), bg: "#10b981" },
                  { label: "Faltas", value: String(n.stats.falta), bg: "#ef4444" },
                  { label: "Justificadas", value: String(n.stats.justificada), bg: "#8b5cf6" },
                  { label: "Aulas", value: String(nTotal), bg: "#64748b" },
                ];
                return (
                  <div key={n.classId} style={{ border: "2px solid #fbbf24", borderRadius: "6px", padding: "1.5% 2%", background: "#fffbeb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.2%" }}>
                      <div style={{ fontSize: "1.05vw", fontWeight: 800, color: "#92400e" }}>
                        {n.className}
                      </div>
                      {n.parentClassName && (
                        <div style={{ fontSize: "0.65vw", color: "#a16207", fontWeight: 600 }}>
                          Turma: {n.parentClassName}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "2%", alignItems: "center" }}>
                      <div style={{ width: "18%", aspectRatio: "1", flexShrink: 0 }}>
                        <DonutChartSvg stats={n.stats} />
                      </div>
                      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5%" }}>
                        {numeroCards.map((c, i) => (
                          <div key={i} style={{ background: c.bg, borderRadius: "4px", padding: "1.5% 1%", textAlign: "center" }}>
                            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{c.value}</div>
                            <div style={{ fontSize: "0.55vw", color: "rgba(255,255,255,.85)", marginTop: "3px" }}>{c.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: "0.65vw", color: "#94a3b8", textAlign: "center", paddingTop: "2%" }}>
          Total de aulas: {total} · Carga horária total: {total * 2}h · Horas frequentadas: {totalHours}h
        </div>
      </div>
    </div>
  );
}

// ─── Componente de pré-visualização HTML do certificado ───────────────────────
function CertificatePreview({
  config,
  studentName,
  customText,
  periodStart,
  periodEnd,
  workload,
}: {
  config: CertificateConfig;
  studentName: string;
  customText: string;
  periodStart: string;
  periodEnd: string;
  workload: string;
}) {
  const borderColor = config.border_color || "#C9A84C";
  const isDouble = config.border_style === "double";
  const sigs = config.signatures.slice(0, config.signatures_count);
  const fontFamilyMap: Record<string, string> = {
    times: "'Times New Roman', Times, serif",
    helvetica: "Helvetica, Arial, sans-serif",
    courier: "'Courier New', Courier, monospace",
  };
  const previewFontFamily = fontFamilyMap[config.font_family] ?? fontFamilyMap.times;
  const previewFontSize = `${(config.font_size || 14) * 0.08}vw`;

  const resolvedText = (customText || "")
    .replace(/\*\*/g, "[[NOME]]");

  const parts = resolvedText.split("[[NOME]]");
  const before = parts[0] ?? "";
  const after = parts[1] ?? "";

  const borderStyle = isDouble
    ? `4px double ${borderColor}`
    : `3px solid ${borderColor}`;

  return (
    <div className="w-full">
      <p className="text-xs text-slate-400 mb-3 text-center">
        Pré-visualização — proporcional ao certificado A4 paisagem
      </p>

      {/* Moldura proporcional A4 paisagem */}
      <div
        className="w-full bg-white overflow-hidden flex flex-col"
        style={{
          aspectRatio: "297 / 210",
          border: borderStyle,
          boxShadow: isDouble ? `inset 0 0 0 3px ${borderColor}` : `inset 0 0 0 2px ${borderColor}`,
          padding: "3% 4%",
        }}
      >
        {/* Logo topo */}
        <div className="flex justify-center items-center" style={{ height: "22%" }}>
          {config.logo_top ? (
            <img
              src={config.logo_top}
              alt="Logo topo"
              style={{ maxHeight: "100%", maxWidth: "28%", objectFit: "contain" }}
            />
          ) : (
            <div className="text-slate-300 text-xs italic">[ logo do projeto ]</div>
          )}
        </div>

        {/* Texto — cresce para preencher espaço disponível */}
        <div
          className="flex-1 flex items-center justify-center text-center leading-relaxed"
          style={{ fontSize: previewFontSize, fontFamily: previewFontFamily }}
        >
          <p>
            <span>{before}</span>
            <span className="font-bold underline" style={{ textDecorationColor: "#222" }}>
              {studentName}
            </span>
            <span>{after}</span>
          </p>
        </div>

        {/* Assinaturas */}
        {sigs.length > 0 && (
          <div className="flex justify-around items-end" style={{ height: "24%", paddingBottom: "1%" }}>
            {sigs.map((sig, i) => (
              <div key={i} className="flex flex-col items-center" style={{ flex: 1 }}>
                {sig.image ? (
                  <img
                    src={sig.image}
                    alt={sig.name}
                    style={{ maxHeight: "3.5vw", maxWidth: "80%", objectFit: "contain", marginBottom: "2px" }}
                  />
                ) : (
                  <div style={{ width: "60%", height: "2.5vw", borderBottom: "1px solid #aaa", marginBottom: "2px" }} />
                )}
                <div
                  className="text-center w-full pt-1"
                  style={{ borderTop: "1px solid #666", fontSize: "0.6vw" }}
                >
                  <div className="font-bold text-slate-700">{sig.name || "—"}</div>
                  <div className="text-slate-500 italic">{sig.title || ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logo rodapé — acima da borda, abaixo das assinaturas */}
        <div className="flex justify-center items-center" style={{ height: "11%", borderTop: "none" }}>
          {config.logo_bottom ? (
            <img
              src={config.logo_bottom}
              alt="Logo rodapé"
              style={{ maxHeight: "90%", maxWidth: "14%", objectFit: "contain" }}
            />
          ) : (
            <div className="text-slate-300 text-xs italic">[ logo rodapé ]</div>
          )}
        </div>
      </div>
    </div>
  );
}
