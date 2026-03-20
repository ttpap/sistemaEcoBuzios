"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { TeacherRegistration } from "@/types/teacher";
import { showError, showSuccess } from "@/utils/toast";
import { copyToClipboard } from "@/utils/clipboard";
import { fetchProjects } from "@/utils/projects";
import {
  addTeacherToProject,
  DEFAULT_TEACHER_PASSWORD,
  deleteGlobalTeacher,
  getTeacherAssignments,
  migrateScopedTeachersToGlobalIfNeeded,
  readGlobalTeachers,
  removeTeacherFromProject,
  resetTeacherPasswordToDefault,
} from "@/utils/teachers";
import { Copy, Plus, Search, Trash2, UserCog, X, RotateCcw, GraduationCap } from "lucide-react";
import { supabaseConfigService } from "@/services/supabaseConfigService";

import { fetchTeachersWithMeta, deleteTeacher } from "@/services/teachersService";

import {
  fetchTeacherAssignmentsWithMeta,
  assignTeacherToProjectRemote,
  removeTeacherFromProjectRemote,
} from "@/services/teacherAssignmentsService";

function maskedPassword(pw?: string) {
  if (!pw) return "";
  return "•".repeat(Math.min(10, Math.max(6, pw.length)));
}

export default function AdminTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [dataWarning, setDataWarning] = useState<string | null>(null);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverTeacher, setDeliverTeacher] = useState<TeacherRegistration | null>(null);

  useEffect(() => {
    const run = async () => {
      migrateScopedTeachersToGlobalIfNeeded();

      const { teachers: remoteTeachers, error: teachersErr } = await fetchTeachersWithMeta();
      if (teachersErr) {
        console.error("[AdminTeachers] fetchTeachers error", teachersErr);
        setDataWarning("Não foi possível carregar professores do Supabase. Mostrando cache local (pode estar desatualizado).");
        setTeachers(readGlobalTeachers([]));
      } else {
        setDataWarning(null);
        localStorage.setItem("ecobuzios_teachers_global", JSON.stringify(remoteTeachers));
        setTeachers(remoteTeachers);
      }

      const { rows: remoteAssignments, error: assignErr } = await fetchTeacherAssignmentsWithMeta();
      if (assignErr) {
        console.error("[AdminTeachers] fetchTeacherAssignments error", assignErr);
        if (!teachersErr) {
          setDataWarning("Não foi possível carregar vínculos (professor ↔ projeto) do Supabase. Mostrando cache local.");
        }
        setAssignments(getTeacherAssignments());
      } else if (remoteAssignments.length > 0) {
        const map: Record<string, string[]> = {};
        for (const a of remoteAssignments) {
          map[a.teacher_id] = map[a.teacher_id] || [];
          if (!map[a.teacher_id].includes(a.project_id)) map[a.teacher_id].push(a.project_id);
        }
        localStorage.setItem("ecobuzios_teacher_assignments", JSON.stringify(map));
        setAssignments(map);
      } else {
        setAssignments(getTeacherAssignments());
      }

      setProjects(await fetchProjects());
    };

    void run();
  }, []);

  const refresh = () => {
    const run = async () => {
      const { teachers: remoteTeachers, error: teachersErr } = await fetchTeachersWithMeta();
      if (teachersErr) {
        console.error("[AdminTeachers] refresh fetchTeachers error", teachersErr);
        showError(teachersErr?.message || "Não foi possível carregar professores do Supabase.");
        setDataWarning("Não foi possível carregar professores do Supabase. Mostrando cache local (pode estar desatualizado).");
        setTeachers(readGlobalTeachers([]));
      } else {
        setDataWarning(null);
        localStorage.setItem("ecobuzios_teachers_global", JSON.stringify(remoteTeachers));
        setTeachers(remoteTeachers);
      }

      const { rows: remoteAssignments, error: assignErr } = await fetchTeacherAssignmentsWithMeta();
      if (assignErr) {
        console.error("[AdminTeachers] refresh fetchTeacherAssignments error", assignErr);
        showError(assignErr?.message || "Não foi possível carregar vínculos do Supabase.");
        setAssignments(getTeacherAssignments());
      } else if (remoteAssignments.length > 0) {
        const map: Record<string, string[]> = {};
        for (const a of remoteAssignments) {
          map[a.teacher_id] = map[a.teacher_id] || [];
          if (!map[a.teacher_id].includes(a.project_id)) map[a.teacher_id].push(a.project_id);
        }
        localStorage.setItem("ecobuzios_teacher_assignments", JSON.stringify(map));
        setAssignments(map);
      } else {
        setAssignments(getTeacherAssignments());
      }

      setProjects(await fetchProjects());
    };

    void run();
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      return (
        (t.fullName || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.authLogin || "").toLowerCase().includes(q) ||
        (t.cpf || "").includes(q) ||
        (t.cnpj || "").includes(q)
      );
    });
  }, [teachers, searchTerm]);

  const projectNameById = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [projects]);

  const teacherProjectNames = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (teacherId: string) => {
      const ids = assignments[teacherId] || [];
      return ids.map((id) => map.get(id)).filter(Boolean) as string[];
    };
  }, [projects, assignments]);

  const onAssign = (teacherId: string, projectId: string) => {
    const run = async () => {
      if (!projectId) return;

      try {
        await assignTeacherToProjectRemote(teacherId, projectId);
      } catch {
        const res = addTeacherToProject(teacherId, projectId);
        if (!res.ok) {
          showError("Não foi possível alocar o professor.");
          return;
        }
      }

      refresh();

      const teacher = readGlobalTeachers([]).find((t) => t.id === teacherId) || null;
      setDeliverTeacher(teacher);
      setDeliverOpen(true);
    };

    void run();
  };

  const onRemoveFromProject = (teacherId: string, projectId: string) => {
    const run = async () => {
      const pname = projectNameById(projectId) || "este projeto";
      const ok = window.confirm(`Remover o professor de ${pname}?`);
      if (!ok) return;

      try {
        await removeTeacherFromProjectRemote(teacherId, projectId);
      } catch {
        removeTeacherFromProject(teacherId, projectId);
      }

      refresh();
      showSuccess("Professor removido do projeto.");
    };

    void run();
  };

  const onResetTeacherPassword = (teacherId: string) => {
    const ok = window.confirm(`Resetar a senha do professor para a senha padrão (${DEFAULT_TEACHER_PASSWORD})?`);
    if (!ok) return;
    resetTeacherPasswordToDefault(teacherId);
    refresh();
    showSuccess("Senha do professor resetada para o padrão.");
  };

  const onDelete = (id: string) => {
    const run = async () => {
      const ok = window.confirm("Tem certeza que deseja excluir este cadastro? Isso remove o acesso do professor.");
      if (!ok) return;

      try {
        await deleteTeacher(id);
      } catch {
        deleteGlobalTeacher(id);
      }

      refresh();
      showSuccess("Cadastro removido.");
    };

    void run();
  };

  const copy = async (text: string) => {
    try {
      await copyToClipboard(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  const deliveryProjectName = deliverTeacher
    ? (teacherProjectNames(deliverTeacher.id)[0] || "—")
    : undefined;

  return (
    <div className="space-y-6">
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Credenciais do professor
            </DialogTitle>
            <p className="mt-1 text-white/80 text-sm font-bold">
              Entregue estes dados ao professor (aparecem apenas após alocação em um projeto).
            </p>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-4">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Projeto</p>
              <p className="mt-1 text-base font-black text-slate-800">{deliveryProjectName || "—"}</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Login</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-800 break-all">{deliverTeacher?.authLogin || ""}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl font-black border-slate-200"
                    onClick={() => copy(deliverTeacher?.authLogin || "")}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha padrão</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-800">{deliverTeacher?.authPassword || ""}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl font-black border-slate-200"
                    onClick={() => copy(deliverTeacher?.authPassword || "")}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
              Link para o professor entrar: <span className="font-black">/professor/login</span>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
                onClick={() => setDeliverOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Professores (Admin)</h1>
          <p className="text-slate-500 font-medium">
            Cadastre professores no sistema e aloque cada um em um projeto.
          </p>

          {supabaseConfigService.supabaseEnvMissing ? (

            <div className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              Supabase não configurado (env ausente). Defina <span className="font-black">VITE_SUPABASE_URL</span> e
              <span className="font-black"> VITE_SUPABASE_ANON_KEY</span> no deploy para este app apontar para o seu
              Supabase oficial.
            </div>
          ) : null}

          {dataWarning ? (
            <div className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              {dataWarning}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl gap-2 h-12 px-5 font-black border-slate-200 bg-white"
            onClick={refresh}
          >
            <RotateCcw className="h-4 w-4" /> Recarregar
          </Button>
          <Button
            className="rounded-2xl gap-2 h-12 px-6 font-black shadow-lg shadow-primary/20"
            onClick={() => navigate("/professores/novo")}
          >
            <Plus className="h-5 w-5" />
            Novo Cadastro
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Buscar por nome, e-mail ou login..."
            className="pl-12 h-12 rounded-xl border-slate-100 bg-slate-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-3">
          <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Lista de professores
          </CardTitle>
          <p className="text-slate-500 font-medium mt-1">
            A alocação ao projeto libera o acesso e permite entregar login/senha.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">Nenhum professor encontrado.</div>
            ) : (
              filtered.map((t) => {
                const assignedProjectIds = assignments[t.id] || [];
                const assignedNames = teacherProjectNames(t.id);

                return (
                  <div key={t.id} className="p-5 md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{t.fullName}</p>
                        <p className="text-xs font-bold text-slate-500 truncate">{t.email}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                            {t.authLogin}
                          </Badge>

                          {assignedProjectIds.length > 0 ? (
                            assignedProjectIds.map((pid) => {
                              const name = projectNameById(pid) || pid;
                              return (
                                <span
                                  key={pid}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-black"
                                >
                                  Projeto: {name}
                                  <button
                                    type="button"
                                    className="ml-1 h-5 w-5 rounded-full bg-white/60 hover:bg-white border border-emerald-200 flex items-center justify-center"
                                    title="Remover do projeto"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveFromProject(t.id, pid);
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <Badge className="rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-black">
                              Sem projeto
                            </Badge>
                          )}
                        </div>

                        {assignedNames.length > 2 ? (
                          <p className="mt-2 text-xs font-bold text-slate-500">
                            +{assignedNames.length - 2} outro(s)
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Select onValueChange={(v) => onAssign(t.id, v)}>
                          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white font-black">
                            <SelectValue placeholder="Adicionar em projeto" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects
                              .filter((p) => !assignedProjectIds.includes(p.id))
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id} className="font-bold">
                                  {p.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-12 rounded-2xl font-black border-slate-200 bg-white",
                            assignedNames.length ? "" : "opacity-60 cursor-not-allowed",
                          )}
                          disabled={!assignedNames.length}
                          onClick={() => {
                            setDeliverTeacher(t);
                            setDeliverOpen(true);
                          }}
                          title={assignedNames.length ? "Ver credenciais" : "Adicione em um projeto para liberar"}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Credenciais
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl font-black border-slate-200 bg-white"
                          onClick={() => onResetTeacherPassword(t.id)}
                          title="Resetar senha para o padrão"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Resetar senha
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl font-black border-red-200 bg-white text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha (oculta)</p>
                        <p className="mt-1 text-sm font-black text-slate-700">{maskedPassword(t.authPassword)}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-black text-slate-700">{t.status}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}