"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Plus, Search, Trash2, X, RotateCcw, Copy } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { fetchProjects } from "@/utils/projects";
import { copyToClipboard } from "@/utils/clipboard";
import type { Project } from "@/types/project";
import {
  assignPhotographerToProject,
  createPhotographer,
  deletePhotographer,
  fetchPhotographerAssignments,
  fetchPhotographers,
  removePhotographerFromProject,
  updatePhotographer,
  type Photographer,
} from "@/services/photographersService";

function maskedPassword(pw?: string) {
  if (!pw) return "";
  return "•".repeat(Math.min(10, Math.max(6, pw.length)));
}

export default function AdminPhotographers() {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLogin, setNewLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [credOpen, setCredOpen] = useState(false);
  const [credPhoto, setCredPhoto] = useState<Photographer | null>(null);

  const refresh = async () => {
    try {
      const [ph, ass, pj] = await Promise.all([
        fetchPhotographers(),
        fetchPhotographerAssignments(),
        fetchProjects(),
      ]);
      setPhotographers(ph);
      const map: Record<string, string[]> = {};
      for (const a of ass) {
        map[a.photographer_id] = map[a.photographer_id] || [];
        if (!map[a.photographer_id].includes(a.project_id)) map[a.photographer_id].push(a.project_id);
      }
      setAssignments(map);
      setProjects(pj);
    } catch (err: any) {
      showError(err?.message || "Erro ao carregar.");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return photographers;
    return photographers.filter((p) =>
      [(p.full_name || ""), (p.email || ""), (p.auth_login || "")].some((s) => s.toLowerCase().includes(q)),
    );
  }, [photographers, search]);

  const projectNameById = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (id: string) => map.get(id) || id;
  }, [projects]);

  const onCreate = async () => {
    if (!newName.trim() || !newLogin.trim() || !newPassword.trim()) {
      showError("Preencha nome, login e senha.");
      return;
    }
    setCreating(true);
    try {
      const created = await createPhotographer({
        full_name: newName.trim(),
        email: newEmail.trim() || undefined,
        auth_login: newLogin.trim(),
        auth_password: newPassword.trim(),
      });
      showSuccess("Fotógrafo cadastrado.");
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewLogin("");
      setNewPassword("");
      await refresh();
      setCredPhoto(created);
      setCredOpen(true);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("duplicate") || msg.includes("photographers_auth_login_uidx")) {
        showError("Este login já está em uso.");
      } else {
        showError(msg || "Erro ao cadastrar.");
      }
    } finally {
      setCreating(false);
    }
  };

  const onAssign = async (photographerId: string, projectId: string) => {
    if (!projectId) return;
    try {
      await assignPhotographerToProject(photographerId, projectId);
      await refresh();
      const ph = photographers.find((p) => p.id === photographerId) || null;
      setCredPhoto(ph);
      setCredOpen(true);
    } catch (err: any) {
      showError(err?.message || "Erro ao alocar.");
    }
  };

  const onUnassign = async (photographerId: string, projectId: string) => {
    const ok = window.confirm(`Remover do projeto "${projectNameById(projectId)}"?`);
    if (!ok) return;
    try {
      await removePhotographerFromProject(photographerId, projectId);
      await refresh();
      showSuccess("Removido.");
    } catch (err: any) {
      showError(err?.message || "Erro ao remover.");
    }
  };

  const onDelete = async (id: string) => {
    const ok = window.confirm("Excluir este fotógrafo? Todos os links enviados por ele também serão removidos.");
    if (!ok) return;
    try {
      await deletePhotographer(id);
      await refresh();
      showSuccess("Excluído.");
    } catch (err: any) {
      showError(err?.message || "Erro ao excluir.");
    }
  };

  const onResetPassword = async (id: string) => {
    const newPw = window.prompt("Nova senha:");
    if (!newPw || !newPw.trim()) return;
    try {
      await updatePhotographer(id, { auth_password: newPw.trim() });
      await refresh();
      showSuccess("Senha alterada.");
    } catch (err: any) {
      showError(err?.message || "Erro ao alterar senha.");
    }
  };

  const copy = async (text: string) => {
    try {
      await copyToClipboard(text);
      showSuccess("Copiado!");
    } catch {
      showError("Erro ao copiar.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dialog criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-lg">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Camera className="h-5 w-5" /> Novo fotógrafo
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-3">
            <div>
              <Label className="font-black">Nome completo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <Label className="font-black">E-mail (opcional)</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <Label className="font-black">Login</Label>
              <Input value={newLogin} onChange={(e) => setNewLogin(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <Label className="font-black">Senha</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={onCreate} disabled={creating} className="rounded-2xl font-black flex-1">
                {creating ? "Salvando..." : "Cadastrar"}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-2xl font-black">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog credenciais */}
      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-lg">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Camera className="h-5 w-5" /> Credenciais do fotógrafo
            </DialogTitle>
            <p className="mt-1 text-white/80 text-sm font-bold">
              Envie estes dados ao fotógrafo. URL de acesso: <span className="font-black">/fotografo/login</span>
            </p>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-3">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nome</p>
              <p className="mt-1 text-base font-black text-slate-800">{credPhoto?.full_name || "—"}</p>
            </div>
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Login</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800 break-all">{credPhoto?.auth_login}</p>
                <Button variant="outline" className="rounded-2xl font-black" onClick={() => copy(credPhoto?.auth_login || "")}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar
                </Button>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800">{credPhoto?.auth_password}</p>
                <Button variant="outline" className="rounded-2xl font-black" onClick={() => copy(credPhoto?.auth_password || "")}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full rounded-2xl font-black" onClick={() => setCredOpen(false)}>
              <X className="h-4 w-4 mr-2" /> Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-3xl font-black text-primary tracking-tight">Fotógrafos</h1>
          <p className="text-slate-500 font-medium">Cadastre e aloque fotógrafos aos projetos.</p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-2xl font-black gap-2" onClick={() => setCreateOpen(true)}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-3">
          <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
            <Camera className="h-5 w-5" /> Lista de fotógrafos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">Nenhum fotógrafo cadastrado.</div>
            ) : (
              filtered.map((p) => {
                const assigned = assignments[p.id] || [];
                return (
                  <div key={p.id} className="p-5 md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{p.full_name}</p>
                        <p className="text-xs font-bold text-slate-500 truncate">{p.email || "—"}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                            {p.auth_login}
                          </Badge>
                          {assigned.length === 0 ? (
                            <Badge className="rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-black">
                              Sem projeto
                            </Badge>
                          ) : (
                            assigned.map((pid) => (
                              <span
                                key={pid}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-black"
                              >
                                Projeto: {projectNameById(pid)}
                                <button
                                  type="button"
                                  onClick={() => onUnassign(p.id, pid)}
                                  className="ml-1 h-5 w-5 rounded-full bg-white/60 hover:bg-white border border-emerald-200 flex items-center justify-center"
                                  title="Remover"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Select onValueChange={(v) => onAssign(p.id, v)}>
                          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white font-black">
                            <SelectValue placeholder="Adicionar em projeto" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects
                              .filter((pj) => !assigned.includes(pj.id))
                              .map((pj) => (
                                <SelectItem key={pj.id} value={pj.id} className="font-bold">
                                  {pj.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl font-black border-slate-200 bg-white"
                          onClick={() => {
                            setCredPhoto(p);
                            setCredOpen(true);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" /> Credenciais
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl font-black border-slate-200 bg-white"
                          onClick={() => onResetPassword(p.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" /> Nova senha
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl font-black border-red-200 bg-white text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha (oculta)</p>
                        <p className="mt-1 text-sm font-black text-slate-700">{maskedPassword(p.auth_password)}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-black text-slate-700">{p.status}</p>
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
