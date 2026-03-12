"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { showError, showSuccess } from "@/utils/toast";
import { fetchProjects } from "@/utils/projects";
import {
  addCoordinatorToProject,
  DEFAULT_COORDINATOR_PASSWORD,
  deleteGlobalCoordinator,
  getCoordinatorAssignments,
  migrateScopedCoordinatorsToGlobalIfNeeded,
  readGlobalCoordinators,
  removeCoordinatorFromProject,
  resetCoordinatorPasswordToDefault,
} from "@/utils/coordinators";
import { Copy, Plus, Search, Trash2, UserCog, X, RotateCcw, Users2 } from "lucide-react";
import { fetchCoordinators, deleteCoordinator } from "@/services/coordinatorsService";

import {
  fetchCoordinatorAssignments,
  assignCoordinatorToProjectRemote,
  removeCoordinatorFromProjectRemote,
} from "@/services/coordinatorAssignmentsService";

function maskedPassword(pw?: string) {
  if (!pw) return "";
  return "•".repeat(Math.min(10, Math.max(6, pw.length)));
}

export default function AdminCoordinators() {
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<CoordinatorRegistration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverCoordinator, setDeliverCoordinator] = useState<CoordinatorRegistration | null>(null);

  useEffect(() => {
    const run = async () => {
      migrateScopedCoordinatorsToGlobalIfNeeded();

      const remote = await fetchCoordinators();
      if (remote.length > 0) {
        localStorage.setItem("ecobuzios_coordinators_global", JSON.stringify(remote));
        setCoordinators(remote);
      } else {
        setCoordinators(readGlobalCoordinators([]));
      }

      const remoteAssignments = await fetchCoordinatorAssignments();
      if (remoteAssignments.length > 0) {
        const map: Record<string, string[]> = {};
        for (const a of remoteAssignments) {
          map[a.coordinator_id] = map[a.coordinator_id] || [];
          if (!map[a.coordinator_id].includes(a.project_id)) map[a.coordinator_id].push(a.project_id);
        }
        localStorage.setItem("ecobuzios_coordinator_assignments", JSON.stringify(map));
        setAssignments(map);
      } else {
        setAssignments(getCoordinatorAssignments());
      }

      setProjects(await fetchProjects());
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    const run = async () => {
      const remote = await fetchCoordinators();
      if (remote.length > 0) {
        localStorage.setItem("ecobuzios_coordinators_global", JSON.stringify(remote));
        setCoordinators(remote);
      } else {
        setCoordinators(readGlobalCoordinators([]));
      }

      const remoteAssignments = await fetchCoordinatorAssignments();
      if (remoteAssignments.length > 0) {
        const map: Record<string, string[]> = {};
        for (const a of remoteAssignments) {
          map[a.coordinator_id] = map[a.coordinator_id] || [];
          if (!map[a.coordinator_id].includes(a.project_id)) map[a.coordinator_id].push(a.project_id);
        }
        localStorage.setItem("ecobuzios_coordinator_assignments", JSON.stringify(map));
        setAssignments(map);
      } else {
        setAssignments(getCoordinatorAssignments());
      }

      setProjects(await fetchProjects());
    };

    void run();
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return coordinators;
    return coordinators.filter((c) => {
      return (
        (c.fullName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.authLogin || "").toLowerCase().includes(q) ||
        (c.cpf || "").includes(q) ||
        (c.cnpj || "").includes(q)
      );
    });
  }, [coordinators, searchTerm]);

  const projectNameById = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [projects]);

  const coordinatorProjectNames = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (coordId: string) => {
      const ids = assignments[coordId] || [];
      return ids.map((id) => map.get(id)).filter(Boolean) as string[];
    };
  }, [projects, assignments]);

  const onAssign = (coordinatorId: string, projectId: string) => {
    const run = async () => {
      if (!projectId) return;

      try {
        await assignCoordinatorToProjectRemote(coordinatorId, projectId);
      } catch {
        const res = addCoordinatorToProject(coordinatorId, projectId);
        if (!res.ok) {
          showError("Não foi possível alocar o coordenador.");
          return;
        }
      }

      refresh();

      const coord = readGlobalCoordinators([]).find((c) => c.id === coordinatorId) || null;
      setDeliverCoordinator(coord);
      setDeliverOpen(true);
    };

    void run();
  };

  const onRemoveFromProject = (coordinatorId: string, projectId: string) => {
    const run = async () => {
      const pname = projectNameById(projectId) || "este projeto";
      const ok = window.confirm(`Remover o coordenador de ${pname}?`);
      if (!ok) return;

      try {
        await removeCoordinatorFromProjectRemote(coordinatorId, projectId);
      } catch {
        removeCoordinatorFromProject(coordinatorId, projectId);
      }

      refresh();
      showSuccess("Coordenador removido do projeto.");
    };

    void run();
  };

  const onResetCoordinatorPassword = (coordinatorId: string) => {
    const ok = window.confirm(
      `Resetar a senha do coordenador para a senha padrão (${DEFAULT_COORDINATOR_PASSWORD})?`,
    );
    if (!ok) return;
    resetCoordinatorPasswordToDefault(coordinatorId);
    refresh();
    showSuccess("Senha do coordenador resetada para o padrão.");
  };

  const onDelete = (id: string) => {
    const run = async () => {
      const ok = window.confirm("Tem certeza que deseja excluir este cadastro? Isso remove o acesso do coordenador.");
      if (!ok) return;

      try {
        await deleteCoordinator(id);
      } catch {
        deleteGlobalCoordinator(id);
      }

      refresh();
      showSuccess("Cadastro removido.");
    };

    void run();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  const deliveryProjectName = deliverCoordinator
    ? (coordinatorProjectNames(deliverCoordinator.id)[0] || "—")
    : undefined;

  return (
    <div className="space-y-6">
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Credenciais do coordenador
            </DialogTitle>
            <p className="mt-1 text-white/80 text-sm font-bold">
              Entregue estes dados ao coordenador (aparecem apenas após alocação em um projeto).
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
                  <p className="text-sm font-black text-slate-800 break-all">{deliverCoordinator?.authLogin || ""}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl font-black border-slate-200"
                    onClick={() => copy(deliverCoordinator?.authLogin || "")}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha padrão</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-800">{deliverCoordinator?.authPassword || ""}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl font-black border-slate-200"
                    onClick={() => copy(deliverCoordinator?.authPassword || "")}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">(ocultar)</p>
                <p className="mt-1 text-sm font-black text-slate-800">{maskedPassword(deliverCoordinator?.authPassword)}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl font-black"
              onClick={() => setDeliverOpen(false)}
            >
              <X className="h-4 w-4 mr-2" /> Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-3xl font-black text-primary tracking-tight">Coordenadores</h1>
          <p className="text-slate-500 font-medium">Cadastre e aloque coordenadores aos projetos.</p>
        </div>

        <div className="flex gap-2">
          <Button
            className="rounded-2xl font-black gap-2"
            onClick={() => navigate("/coordenadores/novo")}
          >
            <Plus className="h-4 w-4" /> Novo
          </Button>

          <Button variant="outline" className="rounded-2xl font-black gap-2" onClick={refresh}>
            <RotateCcw className="h-4 w-4" /> Atualizar
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
            <Users2 className="h-5 w-5" /> Lista de coordenadores
          </CardTitle>
          <p className="text-slate-500 font-medium mt-1">
            A alocação ao projeto libera o acesso e permite entregar login/senha.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[520px]">
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-slate-500">Nenhum coordenador encontrado.</div>
              ) : (
                filtered.map((c) => {
                  const assignedProjectIds = assignments[c.id] || [];
                  const assignedNames = coordinatorProjectNames(c.id);

                  return (
                    <div key={c.id} className="p-5 md:p-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <button
                            className="text-left"
                            onClick={() => navigate(`/coordenadores/editar/${c.id}`)}
                            title="Editar cadastro"
                          >
                            <p className="text-sm font-black text-slate-800 truncate hover:underline">
                              {c.fullName}
                            </p>
                          </button>
                          <p className="text-xs font-bold text-slate-500 truncate">{c.email}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                              {c.authLogin}
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
                                      onClick={() => onRemoveFromProject(c.id, pid)}
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
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <Select onValueChange={(v) => onAssign(c.id, v)}>
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
                              setDeliverCoordinator(c);
                              setDeliverOpen(true);
                            }}
                            title={assignedNames.length ? "Ver credenciais" : "Adicione em um projeto para liberar"}
                          >
                            <Copy className="h-4 w-4 mr-2" /> Credenciais
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-2xl font-black border-slate-200 bg-white"
                            onClick={() => onResetCoordinatorPassword(c.id)}
                            title="Resetar senha para o padrão"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" /> Resetar senha
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-2xl font-black border-red-200 bg-white text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha (oculta)</p>
                          <p className="mt-1 text-sm font-black text-slate-700">{maskedPassword(c.authPassword)}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                          <p className="mt-1 text-sm font-black text-slate-700">{c.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}