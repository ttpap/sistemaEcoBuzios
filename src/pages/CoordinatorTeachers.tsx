"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TeacherRegistration } from "@/types/teacher";
import { showError, showSuccess } from "@/utils/toast";
import { getActiveProject } from "@/utils/projects";
import {
  addTeacherToProject,
  getTeacherAssignments,
  readGlobalTeachers,
  removeTeacherFromProject,
  resetTeacherPasswordToDefault,
  DEFAULT_TEACHER_PASSWORD,
} from "@/utils/teachers";
import { Copy, GraduationCap, Plus, Search, Trash2, UserCog, X, RotateCcw } from "lucide-react";

function maskedPassword(pw?: string) {
  if (!pw) return "";
  return "•".repeat(Math.min(10, Math.max(6, pw.length)));
}

export default function CoordinatorTeachers() {
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), []);
  const projectId = activeProject?.id || null;

  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverTeacher, setDeliverTeacher] = useState<TeacherRegistration | null>(null);

  const [addExistingId, setAddExistingId] = useState<string>("");

  const refresh = () => {
    setTeachers(readGlobalTeachers([]));
    setAssignments(getTeacherAssignments());
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectTeacherIds = useMemo(() => {
    if (!projectId) return new Set<string>();
    const s = new Set<string>();
    for (const [tid, pids] of Object.entries(assignments)) {
      if (pids?.includes(projectId)) s.add(tid);
    }
    return s;
  }, [assignments, projectId]);

  const projectTeachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = teachers.filter((t) => projectTeacherIds.has(t.id));
    if (!q) return list;
    return list.filter((t) => {
      return (
        (t.fullName || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.authLogin || "").toLowerCase().includes(q) ||
        (t.cpf || "").includes(q) ||
        (t.cnpj || "").includes(q)
      );
    });
  }, [teachers, projectTeacherIds, searchTerm]);

  const availableToAdd = useMemo(() => {
    if (!projectId) return [];
    return teachers
      .filter((t) => !projectTeacherIds.has(t.id))
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "pt-BR"));
  }, [teachers, projectTeacherIds, projectId]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  const onAddExisting = (teacherId: string) => {
    if (!projectId) {
      showError("Selecione um projeto.");
      return;
    }
    if (!teacherId) return;

    const res = addTeacherToProject(teacherId, projectId);
    if (!res.ok) {
      showError("Não foi possível adicionar o professor ao projeto.");
      return;
    }

    refresh();
    setAddExistingId("");

    const t = readGlobalTeachers([]).find((x) => x.id === teacherId) || null;
    setDeliverTeacher(t);
    setDeliverOpen(true);
    showSuccess("Professor adicionado ao projeto.");
  };

  const onRemoveFromProject = (teacherId: string) => {
    if (!projectId) return;
    const ok = window.confirm("Remover este professor do projeto? Isso não apaga o cadastro global.");
    if (!ok) return;
    removeTeacherFromProject(teacherId, projectId);
    refresh();
    showSuccess("Professor removido do projeto.");
  };

  const onResetPassword = (teacherId: string) => {
    const ok = window.confirm(
      `Resetar a senha do professor para a senha padrão (${DEFAULT_TEACHER_PASSWORD})?`,
    );
    if (!ok) return;
    resetTeacherPasswordToDefault(teacherId);
    refresh();
    const t = readGlobalTeachers([]).find((x) => x.id === teacherId) || null;
    setDeliverTeacher(t);
    setDeliverOpen(true);
    showSuccess("Senha resetada.");
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

  return (
    <div className="space-y-6">
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-primary">Credenciais do professor</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Usuário</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-800 break-all">{deliverTeacher?.authLogin || ""}</p>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => copy(deliverTeacher?.authLogin || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-800">{deliverTeacher?.authPassword || ""}</p>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => copy(deliverTeacher?.authPassword || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4 text-xs font-bold text-slate-600">
              Link de acesso: <span className="font-black">/login</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Professores</h1>
          <p className="text-slate-500 font-medium">
            Cadastre professores e vincule ao projeto <span className="font-black">{activeProject.name}</span>.
          </p>
        </div>
        <Button
          className="rounded-2xl gap-2 h-12 px-6 font-bold shadow-lg shadow-primary/20"
          onClick={() => navigate("/coordenador/professores/novo")}
        >
          <Plus className="h-5 w-5" />
          Novo professor
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden lg:col-span-2">
          <CardHeader className="p-6 md:p-8 pb-3">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Professores do projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 space-y-4">
            <div className="flex items-center gap-3 bg-slate-50/60 border border-slate-100 rounded-[1.75rem] p-3">
              <Search className="h-5 w-5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, documento ou usuário..."
                className="h-11 rounded-2xl border-slate-100 bg-white"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {projectTeachers.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-black text-slate-700">Nenhum professor vinculado.</p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Cadastre um novo ou adicione um professor existente.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[440px] pr-2">
                <div className="space-y-3">
                  {projectTeachers.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-[2rem] border border-slate-100 bg-white p-5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 truncate">{t.fullName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 font-black">
                            {t.authLogin}
                          </Badge>
                          <Badge className={cn(
                            "rounded-full border-none font-black",
                            t.status === "Ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                          )}>
                            {t.status || "Ativo"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          className="rounded-2xl font-black h-11"
                          onClick={() => {
                            setDeliverTeacher(t);
                            setDeliverOpen(true);
                          }}
                        >
                          Credenciais
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => navigate(`/coordenador/professores/editar/${t.id}`)}
                          title="Editar"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl hover:bg-slate-100"
                          onClick={() => onResetPassword(t.id)}
                          title="Resetar senha"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onRemoveFromProject(t.id)}
                          title="Remover do projeto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-3">
            <CardTitle className="text-lg font-black text-slate-800">Adicionar existente</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 space-y-4">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Professor
              </Label>
              <Select value={addExistingId} onValueChange={setAddExistingId}>
                <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-white font-black">
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      Nenhum disponível
                    </SelectItem>
                  ) : (
                    availableToAdd.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="font-bold">
                        {t.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                className="mt-4 w-full h-11 rounded-2xl font-black"
                onClick={() => onAddExisting(addExistingId)}
                disabled={!addExistingId}
              >
                Adicionar ao projeto
              </Button>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-5 text-xs font-bold text-slate-600">
              Dica: ao adicionar um professor, você pode copiar as credenciais e enviar para ele acessar em <span className="font-black">/login</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
