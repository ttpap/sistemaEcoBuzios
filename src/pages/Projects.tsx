"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

const _pctLabel = (v: number, t: number) => t > 0 ? `${Math.round((v / t) * 1000) / 10}%` : "0%";
const _fmtPct = (t: number) => (v: any, n: any) => [`${v} (${_pctLabel(Number(v), t)})`, n ?? "Alunos"];
import { showError, showSuccess } from "@/utils/toast";
import {
  createProject,
  fetchProjects,
  getActiveProjectId,
  getProjectScopedKey,
  getProjects,
  migrateLegacyProjectDataToProjectIfNeeded,
  migrateLegacyStudentsToGlobalIfNeeded,
  setActiveProjectId,
  clearActiveProjectId,
  updateProject,
  saveProjects,
} from "@/utils/projects";
import { projectsService } from "@/services/projectsService";
import { fetchStudents, fetchStudentsCount, fetchStudentsByIds } from "@/services/studentsService";
import { fetchProjectEnrollmentsRemoteWithMeta } from "@/integrations/supabase/classes";

import { readGlobalStudents, writeGlobalStudents } from "@/utils/storage";
import { getSystemLogo, setSystemLogo } from "@/utils/system-settings";
import { invalidateProjectTheme } from "@/utils/theme";
import {
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Pencil,
  Shield,
  Users,
  Search,
  Save,
  X,
  MapPin,
  PieChart as PieChartIcon,
  Settings,
  Trash2,
  Code2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { StudentRegistration } from "@/types/student";
import { SchoolClass } from "@/types/class";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isPdfDataUrl(url?: string) {
  return Boolean(url && url.startsWith("data:application/pdf"));
}

function isImageDataUrl(url?: string) {
  return Boolean(url && (url.startsWith("data:image/png") || url.startsWith("data:image/jpeg")));
}

export default function Projects() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"projetos" | "sistema">("projetos");

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFileName, setImageFileName] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editImageUrl, setEditImageUrl] = useState<string>("");
  const [editImageFileName, setEditImageFileName] = useState<string>("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemLogo, setSystemLogoState] = useState<string>(getSystemLogo() || "");
  const [systemLogoFileName, setSystemLogoFileName] = useState<string>("");

  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [studentsSearch, setStudentsSearch] = useState("");
  // projectId → Set<studentId> — matrículas vindas do Supabase
  const [enrollmentsByProject, setEnrollmentsByProject] = useState<Map<string, Set<string>>>(new Map());
  const [enrolledStudentsData, setEnrolledStudentsData] = useState<StudentRegistration[]>([]);
  const [apiCopied, setApiCopied] = useState(false);
  const [apiFilterProject, setApiFilterProject] = useState<string>("");

  const [dbMode, setDbMode] = useState<"supabase" | "local">("local");

  const activeId = useMemo(() => getActiveProjectId(), [projects]);

  const refresh = React.useCallback(async () => {
    try {
      const dbProjects = await projectsService.fetchProjectsFromDb();
      setProjects(dbProjects);
      // Mantém cache local porque outras partes do app (sidebar/tema) usam o localStorage.
      saveProjects(dbProjects);
      setDbMode("supabase");
    } catch {
      const local = getProjects();
      setProjects(local);
      setDbMode("local");
    }

    // Admin: lista global de alunos vem do Supabase quando possível.
    try {
      const [remoteStudents, count] = await Promise.all([
        fetchStudents(),
        fetchStudentsCount(),
      ]);

      setTotalStudentsCount(count);
      if (remoteStudents.length > 0) {
        writeGlobalStudents(remoteStudents);
        setStudents(remoteStudents);
      } else {
        setStudents(readGlobalStudents<StudentRegistration[]>([]));
      }
    } catch {
      setStudents(readGlobalStudents<StudentRegistration[]>([]));
    }

    setSystemLogoState(getSystemLogo() || "");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Busca matrículas do Supabase para todos os projetos quando a lista muda
  useEffect(() => {
    if (projects.length === 0) return;
    void (async () => {
      const map = new Map<string, Set<string>>();
      await Promise.all(
        projects.map(async (p) => {
          const { enrollments } = await fetchProjectEnrollmentsRemoteWithMeta(p.id);
          const ids = new Set<string>(enrollments.map((e) => e.student_id));
          map.set(p.id, ids);
        })
      );
      setEnrollmentsByProject(new Map(map));
    })();
  }, [projects]);

  const onCreate = async () => {
    const n = name.trim();
    if (!n) {
      showError("Informe o nome do projeto.");
      return;
    }

    migrateLegacyStudentsToGlobalIfNeeded();

    try {
      const created = await projectsService.insertProjectToDb({ name: n, imageUrl });
      setActiveProjectId(created.id);
      migrateLegacyProjectDataToProjectIfNeeded(created.id);

      setName("");
      setImageUrl("");
      setImageFileName("");

      await refresh();
      showSuccess("Projeto criado e selecionado (Supabase).");
      navigate("/");
      return;
    } catch (e: any) {
      showError(`Erro ao criar no Supabase: ${e?.message || "erro"}`);
      return;
    }
  };

  const onSelect = (p: Project) => {
    migrateLegacyStudentsToGlobalIfNeeded();
    setActiveProjectId(p.id);
    migrateLegacyProjectDataToProjectIfNeeded(p.id);

    void refresh();
    showSuccess("Projeto selecionado.");
    navigate("/");
  };

  const onPickFile = async (file: File | null) => {
    if (!file) {
      setImageUrl("");
      setImageFileName("");
      return;
    }

    const okTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!okTypes.includes(file.type)) {
      showError("Arquivo inválido. Envie PNG, JPG ou PDF.");
      return;
    }

    setImageFileName(file.name);

    // Se for imagem, comprime para não pesar.
    if (file.type.startsWith("image/")) {
      try {
        const { imageFileToCompressedDataUrl } = await import("@/utils/image-compress");
        const dataUrl = await imageFileToCompressedDataUrl(file, {
          maxSide: 1024,
          quality: 0.82,
          outputType: "image/jpeg",
        });
        setImageUrl(dataUrl);
        return;
      } catch {
        // fallback abaixo
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (p: Project) => {
    setEditProjectId(p.id);
    setEditName(p.name);
    setEditImageUrl(p.imageUrl || "");
    setEditImageFileName("");
    setEditOpen(true);
  };

  const onPickEditFile = async (file: File | null) => {
    if (!file) {
      setEditImageUrl("");
      setEditImageFileName("");
      return;
    }

    const okTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!okTypes.includes(file.type)) {
      showError("Arquivo inválido. Envie PNG, JPG ou PDF.");
      return;
    }

    setEditImageFileName(file.name);

    if (file.type.startsWith("image/")) {
      try {
        const { imageFileToCompressedDataUrl } = await import("@/utils/image-compress");
        const dataUrl = await imageFileToCompressedDataUrl(file, {
          maxSide: 1024,
          quality: 0.82,
          outputType: "image/jpeg",
        });
        setEditImageUrl(dataUrl);
        return;
      } catch {
        // fallback abaixo
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      setEditImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onSaveEdit = async () => {
    const n = editName.trim();
    if (!n) {
      showError("Informe o nome do projeto.");
      return;
    }

    try {
      await projectsService.updateProjectInDb(editProjectId, {
        name: n,
        imageUrl: editImageUrl.trim() ? editImageUrl : null,
      });

      invalidateProjectTheme(editProjectId);
      setEditOpen(false);
      await refresh();
      showSuccess("Projeto atualizado (Supabase).");
      return;
    } catch (e: any) {
      showError(`Erro ao salvar no Supabase: ${e?.message || "erro"}`);
      return;
    }
  };

  const onDeleteProject = (p: Project) => {
    const run = async () => {
      const ok = window.confirm(
        `Excluir o projeto "${p.name}"?\n\nIsso vai remover também as turmas, chamadas e justificativas deste projeto. Essa ação não pode ser desfeita.`,
      );
      if (!ok) return;

      try {
        await projectsService.deleteProjectRemote(p.id);
      } catch (e: any) {
        showError(`Não foi possível excluir no Supabase: ${e?.message || "erro"}`);
        return;
      }

      // Limpa caches locais vinculados ao projeto
      localStorage.removeItem(getProjectScopedKey(p.id, "classes"));
      localStorage.removeItem(getProjectScopedKey(p.id, "teachers"));
      localStorage.removeItem(getProjectScopedKey(p.id, "attendance"));
      invalidateProjectTheme(p.id);

      if (getActiveProjectId() === p.id) {
        clearActiveProjectId();
      }

      await refresh();
      showSuccess("Projeto excluído.");
    };

    void run();
  };

  const onPickSystemLogo = async (file: File | null) => {
    if (!file) {
      setSystemLogoState("");
      setSystemLogoFileName("");
      return;
    }

    const okTypes = ["image/png", "image/jpeg"];
    if (!okTypes.includes(file.type)) {
      showError("Arquivo inválido. Envie PNG ou JPG.");
      return;
    }

    setSystemLogoFileName(file.name);

    try {
      const { imageFileToCompressedDataUrl } = await import("@/utils/image-compress");
      const dataUrl = await imageFileToCompressedDataUrl(file, {
        maxSide: 1024,
        quality: 0.82,
        outputType: "image/jpeg",
      });
      setSystemLogoState(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || "");
        setSystemLogoState(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSaveSettings = () => {
    // Save system logo
    if (systemLogo) {
      setSystemLogo(systemLogo);
    }

    setSettingsOpen(false);
    refresh();
    showSuccess("Configurações salvas.");
  };

  const allEnrolledStudentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const projectIds of enrollmentsByProject.values()) {
      for (const sid of projectIds) ids.add(sid);
    }
    return ids;
  }, [enrollmentsByProject]);

  // Busca os dados completos dos alunos matriculados diretamente do banco,
  // porque o array `students` é limitado a 1000 registros mais recentes
  // e os alunos matriculados podem estar fora dessa janela.
  useEffect(() => {
    if (allEnrolledStudentIds.size === 0) {
      setEnrolledStudentsData([]);
      return;
    }
    void fetchStudentsByIds(Array.from(allEnrolledStudentIds))
      .then(setEnrolledStudentsData)
      .catch(() => {});
  }, [allEnrolledStudentIds]);

  const studentsInAnyProject = enrolledStudentsData;

  const enrollmentPieData = useMemo(() => {
    const enrolled = studentsInAnyProject.length;
    const notEnrolled = Math.max(0, students.length - enrolled);
    return [
      { name: "Em turmas (projetos)", value: enrolled },
      { name: "Sem turma", value: notEnrolled },
    ];
  }, [studentsInAnyProject.length, students.length]);

  const neighborhoodsData = useMemo(() => {
    const map = new Map<string, number>();

    for (const s of studentsInAnyProject) {
      const key = (s.neighborhood || "").toString().trim() || "Não informado";
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [studentsInAnyProject]);

  const schoolTypeData = useMemo(() => {
    const counts: Record<string, number> = { municipal: 0, state: 0, private: 0, higher: 0, none: 0, outros: 0 };
    for (const s of studentsInAnyProject) {
      const raw = (s.schoolType || "").toLowerCase().trim();
      if (raw === "municipal") counts.municipal += 1;
      else if (raw === "state") counts.state += 1;
      else if (raw === "private") counts.private += 1;
      else if (raw === "higher") counts.higher += 1;
      else if (raw === "none") counts.none += 1;
      else counts.outros += 1;
    }
    return [
      { name: "Municipal", value: counts.municipal, color: "#008ca0" },
      { name: "Estadual", value: counts.state, color: "#0ea5e9" },
      { name: "Particular", value: counts.private, color: "#f59e0b" },
      { name: "Ens. Superior", value: counts.higher, color: "#6366f1" },
      { name: "Não estuda", value: counts.none, color: "#f43f5e" },
      { name: "Não informado", value: counts.outros, color: "#cbd5e1" },
    ].filter((d) => d.value > 0);
  }, [studentsInAnyProject]);

  const perProjectCounts = useMemo(() => {
    return projects
      .map((p) => {
        const ids = enrollmentsByProject.get(p.id) ?? new Set<string>();
        return {
          project: p,
          studentsCount: ids.size,
          classesCount: 0,
          isActive: p.id === activeId,
        };
      })
      .sort((a, b) => a.project.name.localeCompare(b.project.name, "pt-BR"));
  }, [projects, activeId, enrollmentsByProject]);

  const studentsFiltered = useMemo(() => {
    const q = studentsSearch.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) => {
      const nm = (s.fullName || "").toLowerCase();
      const reg = (s.registration || "").toLowerCase();
      return nm.includes(q) || reg.includes(q);
    });
  }, [students, studentsSearch]);

  return (
    <div className="space-y-8">
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.75rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do administrador
            </DialogTitle>
            <p className="mt-1 text-white/80 text-sm font-bold">Alterar logo do sistema.</p>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Logo do sistema</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={(e) => onPickSystemLogo(e.target.files?.[0] || null)}
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/60 file:font-black file:text-primary file:border-0 file:bg-white file:rounded-xl file:px-4 file:py-2"
              />
              <div className="mt-3 flex items-center gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-4">
                <div className="h-14 w-14 rounded-[1.6rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-400">
                  {systemLogo ? (
                    <img src={systemLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">
                    {systemLogoFileName ? systemLogoFileName : systemLogo ? "Logo definida" : "Sem logo"}
                  </p>
                  <p className="text-xs font-bold text-slate-500">Aparece no topo quando não há projeto ativo.</p>
                </div>
                <div className="ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-black border-slate-200"
                    onClick={() => {
                      setSystemLogoState("");
                      setSystemLogoFileName("");
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl font-black border-slate-200"
                onClick={() => setSettingsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="rounded-2xl font-black shadow-lg shadow-primary/20 gap-2"
                onClick={onSaveSettings}
              >
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight">Editar projeto</DialogTitle>
            <p className="mt-1 text-white/80 text-sm font-bold">
              Você pode alterar o nome e o arquivo (PNG/JPG/PDF).
            </p>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Nome do projeto
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Arquivo (PNG / JPG / PDF)
              </Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                onChange={(e) => onPickEditFile(e.target.files?.[0] || null)}
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/60 file:font-black file:text-primary file:border-0 file:bg-white file:rounded-xl file:px-4 file:py-2"
              />
            </div>

            <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-4">
              <div className="h-12 w-12 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-400">
                {editImageUrl && !isPdfDataUrl(editImageUrl) && isImageDataUrl(editImageUrl) ? (
                  <img src={editImageUrl} alt="Prévia" className="h-full w-full object-cover" />
                ) : editImageUrl && isPdfDataUrl(editImageUrl) ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">
                  {editName.trim() || "Nome do projeto"}
                </p>
                <p className="text-xs font-bold text-slate-500 truncate">
                  {editImageFileName
                    ? editImageFileName
                    : editImageUrl.trim()
                      ? "Arquivo definido"
                      : "Sem arquivo"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl font-black border-slate-200"
                  onClick={() => {
                    setEditImageUrl("");
                    setEditImageFileName("");
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl font-black border-slate-200"
                onClick={() => setEditOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
                onClick={onSaveEdit}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Projetos</h1>
          <p className="text-slate-500 font-medium">
            Você pode criar/selecionar projetos e também ver a visão geral do sistema.
          </p>
          <div className="mt-2">
            <Badge
              className={
                "rounded-full border-none font-black " +
                (dbMode === "supabase"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900")
              }
            >
              Fonte: {dbMode === "supabase" ? "Supabase" : "Local"}
            </Badge>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 border border-slate-100 shadow-sm text-slate-600">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-black">Projetos: {projects.length}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="w-full justify-start gap-2 rounded-[1.75rem] bg-white p-2 border border-slate-100 shadow-sm">
          <TabsTrigger value="projetos" className="rounded-2xl font-black">
            <FolderPlus className="h-4 w-4 mr-2" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="sistema" className="rounded-2xl font-black">
            <Shield className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-2xl font-black">
            <Code2 className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>

        </TabsList>

        <TabsContent value="projetos" className="mt-6 space-y-8">
          <Card className="border-none shadow-2xl shadow-slate-200/40 bg-white rounded-[2.75rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-4">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-3">
                <span className="h-11 w-11 rounded-[1.4rem] bg-primary/10 border border-primary/15 text-primary flex items-center justify-center">
                  <FolderPlus className="h-5 w-5" />
                </span>
                Novo projeto
              </CardTitle>
              <p className="text-slate-500 font-medium mt-2">
                Informe um nome e envie uma imagem (PNG/JPG) ou um arquivo PDF.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Nome do projeto
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: EcoBúzios – Núcleo Centro"
                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Arquivo do projeto (PNG / JPG / PDF)
                  </Label>
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/60 file:font-black file:text-primary file:border-0 file:bg-white file:rounded-xl file:px-4 file:py-2"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-4">
                  <div className="h-12 w-12 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-400">
                    {imageUrl && !isPdfDataUrl(imageUrl) && (isImageDataUrl(imageUrl) || imageUrl.startsWith("http")) ? (
                      <img src={imageUrl} alt="Prévia" className="h-full w-full object-cover" />
                    ) : imageUrl && isPdfDataUrl(imageUrl) ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">
                      {name.trim() || "Nome do projeto"}
                    </p>
                    <p className="text-xs font-bold text-slate-500 truncate">
                      {imageFileName
                        ? imageFileName
                        : imageUrl.trim()
                          ? "Arquivo definido"
                          : "Sem arquivo (opcional)"}
                    </p>
                  </div>
                </div>

                <Button
                  className="rounded-2xl gap-2 h-12 px-6 font-black shadow-lg shadow-primary/20"
                  onClick={onCreate}
                >
                  <FolderPlus className="h-5 w-5" />
                  Criar e abrir
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-3">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <Pencil className="h-5 w-5" /> Projetos existentes
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">
                Selecione um projeto para trabalhar com os dados dele.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-3">
              {projects.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <p className="text-sm font-bold text-slate-500">Nenhum projeto criado ainda.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {projects.map((p) => {
                    const isActive = p.id === activeId;
                    const isPdf = isPdfDataUrl(p.imageUrl);

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "w-full rounded-[2rem] border transition-colors",
                          isActive ? "border-primary/25 bg-primary/5" : "border-slate-100 bg-white",
                        )}
                      >
                        <div className="flex items-stretch">
                          <button
                            type="button"
                            onClick={() => onSelect(p)}
                            className="flex-1 text-left p-4 rounded-[2rem] hover:bg-slate-50/70 transition-colors"
                            title="Selecionar projeto"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                                  {p.imageUrl && !isPdf ? (
                                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                                  ) : p.imageUrl && isPdf ? (
                                    <FileText className="h-5 w-5 text-primary" />
                                  ) : (
                                    <span className="text-primary font-black">{p.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">{p.name}</p>
                                  <p className="text-xs font-bold text-slate-500 truncate">
                                    Criado em {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {p.imageUrl && isPdf && (
                                  <Badge className="rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-black">
                                    PDF
                                  </Badge>
                                )}
                                {isActive && (
                                  <Badge className="rounded-full bg-secondary/15 text-primary border border-secondary/25 font-black">
                                    Ativo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="p-4 pr-4 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 w-11 rounded-2xl p-0 border-slate-200 bg-white hover:bg-slate-50"
                              onClick={() => openEdit(p)}
                              title="Editar projeto"
                            >
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 w-11 rounded-2xl p-0 border-rose-200 bg-white hover:bg-rose-50"
                              onClick={() => onDeleteProject(p)}
                              title="Excluir projeto"
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="mt-6 space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-800">Painel do Administrador</h2>
              <p className="text-sm font-bold text-slate-500">Estatísticas, gráficos e configurações.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-2xl font-black border-slate-200 bg-white hover:bg-slate-50 gap-2"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 text-primary" />
              Configurações
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.25rem] overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-sm font-black text-slate-500 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Alunos (global)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-4xl font-black text-primary tracking-tight">{totalStudentsCount > 0 ? totalStudentsCount : students.length}</div>
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Total de alunos cadastrados no sistema.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.25rem] overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-sm font-black text-slate-500 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Projetos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-4xl font-black text-primary tracking-tight">{projects.length}</div>
                <p className="mt-2 text-xs font-bold text-slate-500">Projetos criados (cada um com suas turmas).</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.25rem] overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-sm font-black text-slate-500 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg font-black text-slate-800">Administrador</div>
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Você está na visão geral (admin) para ver alunos e contagem por projeto.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8 pb-2">
                <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" /> Alunos em turmas (todos os projetos)
                </CardTitle>
                <p className="text-slate-500 font-medium mt-1">
                  Total de alunos que estão vinculados a alguma turma em qualquer projeto.
                </p>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-4">
                <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
                  <div className="space-y-2">
                    {perProjectCounts
                      .filter((pc) => pc.studentsCount > 0)
                      .map((pc) => (
                        <div key={pc.project.id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500 leading-tight">
                            {pc.project.name}
                          </p>
                          <p className="text-2xl font-black text-primary tracking-tight">
                            {pc.studentsCount}
                          </p>
                        </div>
                      ))}
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Total em turmas</p>
                      <p className="text-2xl font-black text-slate-800">
                        {studentsInAnyProject.length}
                      </p>
                    </div>
                  </div>

                  <div className="h-[240px] rounded-[2rem] border border-slate-100 bg-white p-4">
                    {(() => {
                      const _pieData = perProjectCounts.filter((pc) => pc.studentsCount > 0).map((pc) => ({ name: pc.project.name, value: pc.studentsCount }));
                      const _t = _pieData.reduce((s, x) => s + x.value, 0);
                      return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={_pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {_pieData.map((_, idx) => {
                              const colors = ["#008ca0", "#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6"];
                              return <Cell key={idx} fill={colors[idx % colors.length]} />;
                            })}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(226,232,240,1)",
                            boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
                          }}
                          formatter={_fmtPct(_t)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8 pb-2">
                <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Bairros (alunos em turmas)
                </CardTitle>
                <p className="text-slate-500 font-medium mt-1">
                  Top 12 bairros entre os alunos que estão em turmas dos projetos.
                </p>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-4">
                <div className="h-[320px] rounded-[2rem] border border-slate-100 bg-white p-4">
                  {neighborhoodsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">
                      Nenhum aluno vinculado a turmas ainda.
                    </div>
                  ) : (() => { const _t = neighborhoodsData.reduce((s, x) => s + x.value, 0); return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={neighborhoodsData} margin={{ left: 20, right: 12, top: 18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          height={60}
                          tick={{ fontSize: 11, fill: "#475569", fontWeight: 800 }}
                          angle={-18}
                          textAnchor="end"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={30}
                          tick={{ fontSize: 12, fill: "#475569", fontWeight: 800 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(2,132,199,0.08)" }}
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(226,232,240,1)",
                            boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
                          }}
                          formatter={_fmtPct(_t)}
                        />
                        <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#ffa534">
                          <LabelList dataKey="value" position="top" formatter={(v: any) => _pctLabel(Number(v), _t)} style={{ fill: "#475569", fontSize: 9, fontWeight: 900 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ); })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Instituição (alunos em turmas)
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">
                Distribuição por tipo de escola — rede pública, particular e outros.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4">
              {schoolTypeData.length === 0 ? (
                <div className="h-[200px] rounded-[2rem] border border-slate-100 bg-white flex items-center justify-center text-sm font-bold text-slate-500">
                  Nenhum aluno vinculado a turmas ainda.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                  <div className="h-[200px] rounded-[2rem] border border-slate-100 bg-white p-4">
                    {(() => { const _t = schoolTypeData.reduce((s, x) => s + x.value, 0); return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={schoolTypeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                          {schoolTypeData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid rgba(226,232,240,1)", boxShadow: "0 20px 50px rgba(15,23,42,0.10)" }} formatter={_fmtPct(_t)} />
                      </PieChart>
                    </ResponsiveContainer>
                    ); })()}
                  </div>
                  <div className="space-y-2">
                    {schoolTypeData.map((d) => {
                      const total = schoolTypeData.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                      return (
                        <div key={d.name} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-800">{d.value}</span>
                            <span className="text-xs font-bold text-slate-400">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-3">
              <CardTitle className="text-xl font-black text-primary">Alunos por projeto</CardTitle>
              <p className="text-slate-500 font-medium mt-1">
                Contagem única de alunos vinculados às turmas de cada projeto.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-3">
              {projects.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <p className="text-sm font-bold text-slate-500">Crie um projeto para ver as contagens.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {perProjectCounts.map((row) => (
                    <div
                      key={row.project.id}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-[2rem] border p-4",
                        row.isActive ? "border-primary/25 bg-primary/5" : "border-slate-100 bg-white",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{row.project.name}</p>
                          {row.isActive && (
                            <Badge className="rounded-full bg-secondary/15 text-primary border border-secondary/25 font-black">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-500">
                          Turmas: {row.classesCount}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-black text-primary">{row.studentsCount}</div>
                        <p className="text-[11px] font-bold text-slate-500">aluno(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-3">
              <CardTitle className="text-xl font-black text-primary">Todos os alunos do sistema</CardTitle>
              <p className="text-slate-500 font-medium mt-1">
                Esta lista é global (independente de projeto).
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-3 space-y-4">
              <div className="flex items-center gap-4 bg-slate-50/60 p-4 rounded-[2rem] border border-slate-100">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-white"
                    value={studentsSearch}
                    onChange={(e) => setStudentsSearch(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={refresh}
                  className="h-12 rounded-2xl font-black border-slate-200 bg-white hover:bg-slate-50"
                >
                  Atualizar
                </Button>
              </div>

              <div className="rounded-[2rem] border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest px-6">
                        Aluno
                      </TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                        Matrícula
                      </TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-slate-400 font-bold">
                          Nenhum aluno encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentsFiltered
                        .slice()
                        .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "pt-BR"))
                        .map((s) => (
                          <TableRow key={s.id} className="border-slate-100">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-2xl bg-slate-100 ring-1 ring-slate-200 overflow-hidden flex items-center justify-center text-primary font-black shrink-0">
                                  {s.photo ? (
                                    <img src={s.photo} alt={s.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    (s.fullName || "A").charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-800 truncate">{s.fullName}</p>
                                  <p className="text-xs font-bold text-slate-500 truncate">
                                    {s.cellPhone || s.phone || ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-slate-700">{s.registration}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "rounded-full font-black",
                                  (s.status || "").toLowerCase() === "inativo"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                )}
                              >
                                {s.status || "Ativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6 space-y-8">
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 pb-2">
              <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
                <Code2 className="h-5 w-5" /> API de Estatísticas
              </CardTitle>
              <p className="text-slate-500 font-medium mt-1">
                Endpoint público que retorna total de alunos, bairros, instituição e idades por projeto.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-4 space-y-6">

              {/* Autenticação */}
              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">Autenticação obrigatória</p>
                <p className="text-sm font-bold text-amber-900">
                  Toda requisição precisa do header <code className="bg-amber-100 rounded px-1 py-0.5 font-mono text-xs">x-api-key: &lt;sua-chave&gt;</code>.
                  Gere e gerencie suas chaves em{" "}
                  <a href="/api-keys" className="underline font-black">Sistema → Chaves de API</a>.
                </p>
                <div className="rounded-[1.25rem] bg-amber-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Exemplo cURL</p>
                  <code className="text-xs font-mono text-amber-900 break-all whitespace-pre-wrap">{`curl -H "x-api-key: SUA_CHAVE" \\
  https://ixgujnhdjrgoakqzdkgx.supabase.co/functions/v1/public-stats-api`}</code>
                </div>
              </div>

              {/* Filtro de projeto */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar por projeto (opcional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setApiFilterProject("")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-black border transition-colors",
                      apiFilterProject === ""
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    Todos
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setApiFilterProject(p.id)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-black border transition-colors",
                        apiFilterProject === p.id
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL gerada */}
              {(() => {
                const base = "https://ixgujnhdjrgoakqzdkgx.supabase.co/functions/v1/public-stats-api";
                const url = apiFilterProject ? `${base}?projetos=${apiFilterProject}` : base;
                const copy = () => {
                  navigator.clipboard.writeText(url).then(() => {
                    setApiCopied(true);
                    setTimeout(() => setApiCopied(false), 2000);
                  });
                };
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">URL gerada</p>
                    <div className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <code className="flex-1 text-xs font-mono text-primary break-all">{url}</code>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={copy}
                          title="Copiar URL"
                          className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          {apiCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {apiCopied ? "Copiado!" : "Copiar"}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Testar no navegador"
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Testar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Documentação do retorno */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Formato da resposta (JSON)</p>
                <pre className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-xs font-mono text-slate-600 overflow-x-auto leading-relaxed">{`{
  "ok": true,
  "gerado_em": "2025-01-01T00:00:00.000Z",
  "filtro_projetos": "todos" | ["id1", "id2"],
  "total_alunos_em_turmas": 30,
  "por_projeto": [{ "name": "EcoBúzios", "value": 11 }, ...],
  "bairros":     [{ "name": "Centro",    "value": 8  }, ...],
  "instituicao": [{ "name": "Pública",   "value": 20 }, ...],
  "idades":      [{ "name": "14-17",     "value": 15 }, ...],
  "frequencia": {
    "ano": 2026,
    "mensal": [
      {
        "mes": "2026-03",
        "total_registros": 400,
        "total_presencas": 340,
        "total_faltas": 45,
        "total_atrasos": 10,
        "total_justificadas": 5,
        "percentual_presenca": 85.0
      },
      ...
    ],
    "anual": {
      "total_registros": 1200,
      "total_presencas": 1020,
      "total_faltas": 130,
      "total_atrasos": 30,
      "total_justificadas": 20,
      "percentual_presenca": 85.0
    }
  }
}`}</pre>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}