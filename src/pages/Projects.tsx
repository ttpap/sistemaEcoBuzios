"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "recharts";
import { showError, showSuccess } from "@/utils/toast";
import {
  createProject,
  getActiveProjectId,
  getProjectScopedKey,
  getProjects,
  migrateLegacyProjectDataToProjectIfNeeded,
  migrateLegacyStudentsToGlobalIfNeeded,
  setActiveProjectId,
  updateProject,
} from "@/utils/projects";
import { readGlobalStudents } from "@/utils/storage";
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

  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [studentsSearch, setStudentsSearch] = useState("");

  const activeId = useMemo(() => getActiveProjectId(), [projects]);

  useEffect(() => {
    setProjects(getProjects());
    setStudents(readGlobalStudents<StudentRegistration[]>([]));
  }, []);

  const refresh = () => {
    setProjects(getProjects());
    setStudents(readGlobalStudents<StudentRegistration[]>([]));
  };

  const onCreate = () => {
    const n = name.trim();
    if (!n) {
      showError("Informe o nome do projeto.");
      return;
    }

    migrateLegacyStudentsToGlobalIfNeeded();
    const p = createProject({ name: n, imageUrl });
    migrateLegacyProjectDataToProjectIfNeeded(p.id);

    setName("");
    setImageUrl("");
    setImageFileName("");
    refresh();

    showSuccess("Projeto criado e selecionado.");
    navigate("/");
  };

  const onSelect = (p: Project) => {
    migrateLegacyStudentsToGlobalIfNeeded();
    setActiveProjectId(p.id);
    migrateLegacyProjectDataToProjectIfNeeded(p.id);

    refresh();
    showSuccess("Projeto selecionado.");
    navigate("/");
  };

  const onPickFile = (file: File | null) => {
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

  const onPickEditFile = (file: File | null) => {
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

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      setEditImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onSaveEdit = () => {
    const n = editName.trim();
    if (!n) {
      showError("Informe o nome do projeto.");
      return;
    }

    const updated = updateProject(editProjectId, {
      name: n,
      imageUrl: editImageUrl.trim() ? editImageUrl : null,
    });

    if (!updated) {
      showError("Projeto não encontrado.");
      return;
    }

    setEditOpen(false);
    refresh();
    showSuccess("Projeto atualizado.");
  };

  const allEnrolledStudentIds = useMemo(() => {
    const ids = new Set<string>();

    for (const p of projects) {
      const classesKey = getProjectScopedKey(p.id, "classes");
      const classes = safeParse<SchoolClass[]>(localStorage.getItem(classesKey), []);
      for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);
    }

    return ids;
  }, [projects]);

  const studentsInAnyProject = useMemo(() => {
    if (allEnrolledStudentIds.size === 0) return [];
    return students.filter((s) => allEnrolledStudentIds.has(s.id));
  }, [students, allEnrolledStudentIds]);

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

  const perProjectCounts = useMemo(() => {
    return projects
      .map((p) => {
        const classesKey = getProjectScopedKey(p.id, "classes");
        const classes = safeParse<SchoolClass[]>(localStorage.getItem(classesKey), []);

        const ids = new Set<string>();
        for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);

        return {
          project: p,
          studentsCount: ids.size,
          classesCount: classes.length,
          isActive: p.id === activeId,
        };
      })
      .sort((a, b) => a.project.name.localeCompare(b.project.name, "pt-BR"));
  }, [projects, activeId]);

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
            Admin (Pap)
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
                <ScrollArea className="max-h-[360px] pr-3">
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
                                      <img
                                        src={p.imageUrl}
                                        alt={p.name}
                                        className="h-full w-full object-cover"
                                      />
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

                            <div className="p-4 pr-4 flex items-center">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-11 rounded-2xl p-0 border-slate-200 bg-white hover:bg-slate-50"
                                onClick={() => openEdit(p)}
                                title="Editar projeto"
                              >
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="mt-6 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.25rem] overflow-hidden">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-sm font-black text-slate-500 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Alunos (global)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-4xl font-black text-primary tracking-tight">{students.length}</div>
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
                    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Em turmas (projetos)
                      </p>
                      <p className="mt-2 text-4xl font-black text-primary tracking-tight">
                        {studentsInAnyProject.length}
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sem turma</p>
                      <p className="mt-2 text-2xl font-black text-slate-800">
                        {Math.max(0, students.length - studentsInAnyProject.length)}
                      </p>
                    </div>
                  </div>

                  <div className="h-[240px] rounded-[2rem] border border-slate-100 bg-white p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={enrollmentPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {enrollmentPieData.map((_, idx) => (
                            <Cell key={idx} fill={idx === 0 ? "#008ca0" : "#cbd5e1"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(226,232,240,1)",
                            boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
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
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={neighborhoodsData} margin={{ left: 20, right: 12, top: 10, bottom: 0 }}>
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
                        />
                        <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#ffa534" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

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
                              <div className="min-w-0">
                                <p className="font-black text-slate-800 truncate">{s.fullName}</p>
                                <p className="text-xs font-bold text-slate-500 truncate">
                                  {s.cellPhone || s.phone || ""}
                                </p>
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
      </Tabs>
    </div>
  );
}