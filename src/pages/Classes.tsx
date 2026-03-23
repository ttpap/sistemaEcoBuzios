"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Clock, Trash2, Edit2, Search, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SchoolClass } from '@/types/class';
import { showError, showSuccess } from '@/utils/toast';
import { writeScoped } from '@/utils/storage';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { getActiveProjectId } from '@/utils/projects';
import { deleteClassRemote, fetchClassesRemoteWithMeta } from '@/services/classesService';

import { getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

const CLASS_COLORS = [
  { bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary text-white", text: "text-primary" },
  { bg: "bg-sky-50", border: "border-sky-200", badge: "bg-sky-600 text-white", text: "text-sky-700" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-600 text-white", text: "text-amber-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-600 text-white", text: "text-emerald-700" },
  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-600 text-white", text: "text-violet-700" },
  { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-600 text-white", text: "text-rose-700" },
  { bg: "bg-teal-50", border: "border-teal-200", badge: "bg-teal-600 text-white", text: "text-teal-700" },
  { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-600 text-white", text: "text-orange-700" },
];

const Classes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const projectId = useMemo(() => getActiveProjectId(), [location.pathname]);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!projectId) return;

      // Não dependemos de Supabase Auth aqui: as telas do Modo B usam RPCs.

      const res = await fetchClassesRemoteWithMeta(projectId);
      if (res.classes.length) {
        writeScoped('classes', res.classes);
        setClasses(res.classes);
        return;
      }

      // Diagnóstico rápido (modo B): se a senha não estiver na sessão do navegador,
      // o fallback por RPC não consegue rodar. Nesse caso, peça para logar novamente.
      if (base === "/professor" && !getTeacherSessionPassword()) {
        showError("Sua sessão do professor expirou. Saia e entre novamente para liberar o acesso às turmas.");
        setClasses([]);
        return;
      }

      if (base === "/coordenador" && !getCoordinatorSessionPassword()) {
        showError("Sua sessão do coordenador expirou. Saia e entre novamente para liberar o acesso às turmas.");
        setClasses([]);
        return;
      }

      if (res.issue === "rpc_missing") {
        showError("O servidor ainda não foi atualizado com as permissões de turmas (RPC). Aplique a migração 0006 no Supabase e tente novamente.");
        setClasses([]);
        return;
      }

      if (res.issue === "not_allowed") {
        showError("Acesso bloqueado: este professor/coordenador não está alocado neste projeto.");
        setClasses([]);
        return;
      }

      if (res.issue === "unknown") {
        showError("Não foi possível carregar as turmas. Verifique permissões/alocação e tente sair e entrar novamente.");
        setClasses([]);
        return;
      }

      // Sem issue e sem turmas: estado normal (projeto sem turmas cadastradas).
      setClasses([]);
      return;
    };

    void run();
  }, [projectId, base]);

  const handleDelete = (id: string) => {
    const run = async () => {
      if (!window.confirm("Tem certeza que deseja excluir esta turma?")) return;

      try {
        await deleteClassRemote(id);
      } catch (e: any) {
        showError(e?.message || "Não foi possível excluir a turma.");
        return;
      }

      const updated = classes.filter(c => c.id !== id);
      writeScoped('classes', updated);
      setClasses(updated);
      showSuccess("Turma removida com sucesso.");
    };

    void run();
  };

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Turmas</h1>
          <p className="text-slate-500 font-medium">Organização das salas e horários escolares.</p>
        </div>
        <Button
          className="rounded-2xl gap-2 h-12 px-6 font-bold shadow-lg shadow-primary/20"
          onClick={() => navigate(`${base}/turmas/nova`)}
        >
          <Plus className="h-5 w-5" />
          Nova Turma
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Buscar turma por nome..."
            className="pl-12 h-12 rounded-xl border-slate-100 bg-slate-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma turma cadastrada.</p>
          </div>
        ) : (
          filtered.map((cls, index) => {
            const color = CLASS_COLORS[index % CLASS_COLORS.length]!;
            return (
            <Card
              key={cls.id}
              className={cn(
                "border shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 cursor-pointer",
                color.border
              )}
              onClick={() => navigate(`${base}/turmas/${cls.id}`)}
            >
              <CardHeader className={cn("border-b border-slate-100 p-6", color.bg)}>
                <div className="flex items-center justify-between">
                  <CardTitle className={cn("text-lg font-black tracking-tight", color.text)}>{cls.name}</CardTitle>
                  <Badge className={cn("rounded-full font-black border-none px-3", color.badge)}>
                    {cls.period}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                    <Clock className={cn("h-4 w-4", color.text)} />
                    <span className="font-bold">{cls.startTime} - {cls.endTime}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                    <Users className={cn("h-4 w-4", color.text)} />
                    <span className="font-bold">
                      {cls.capacity === 0 ? 'Ilimitado' : `${cls.capacity} Vagas`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <AlertCircle className="h-4 w-4 text-secondary" />
                  Limite de {cls.absenceLimit} faltas
                </div>

                <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl gap-2 font-bold border-slate-100 hover:bg-primary hover:text-white transition-all"
                    onClick={() => navigate(`${base}/turmas/editar/${cls.id}`)}
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(cls.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Classes;