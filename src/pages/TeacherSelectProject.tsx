"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, ArrowRight, BadgeCheck } from "lucide-react";
import { getActiveProjectId, saveProjects, setActiveProjectId } from "@/utils/projects";
import type { Project } from "@/types/project";
import {
  getTeacherSessionLogin,
  getTeacherSessionPassword,
  getTeacherSessionProjectIds,
  setTeacherSessionProjectId,
} from "@/utils/teacher-auth";
import { fetchModeBStaffProjects } from "@/services/modeBProjectsService";

export default function TeacherSelectProject() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const run = async () => {
      const login = getTeacherSessionLogin();
      const password = getTeacherSessionPassword();
      if (!login || !password) {
        setProjects([]);
        return;
      }

      const rows = await fetchModeBStaffProjects({ login, password });
      setProjects(rows);
      if (rows.length) saveProjects(rows);
    };

    void run();
  }, []);

  const allowedProjects = useMemo(() => {
    const allowed = new Set(getTeacherSessionProjectIds());
    return projects.filter((p) => allowed.has(p.id));
  }, [projects]);

  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    const active = getActiveProjectId();
    const next = active && allowedProjects.some((p) => p.id === active) ? active : allowedProjects[0]?.id || "";
    setSelected(next);

    // Se só existir 1 projeto, entra direto.
    if (allowedProjects.length === 1 && next) {
      setActiveProjectId(next);
      setTeacherSessionProjectId(next);
      navigate("/professor", { replace: true });
    }
  }, [allowedProjects, navigate]);

  const onContinue = () => {
    if (!selected) return;
    setActiveProjectId(selected);
    setTeacherSessionProjectId(selected);
    navigate("/professor", { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 bg-primary text-white">
          <CardTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5" /> Selecionar projeto
          </CardTitle>
          <p className="text-white/85 text-sm font-bold mt-1">
            Você está alocado em mais de um projeto. Escolha qual deseja acessar agora.
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-5">
          {allowedProjects.length === 0 ? (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-950">
              Nenhum projeto disponível para este professor.
              <div className="mt-2 text-xs font-bold text-amber-900/90">
                Verifique se ele está alocado a pelo menos 1 projeto (Admin → Professores) e se a migração
                <span className="font-black"> 0018_mode_b_list_projects</span> foi aplicada no Supabase.
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponíveis</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allowedProjects.map((p) => (
                <Badge
                  key={p.id}
                  className="rounded-full border border-slate-200 bg-white text-slate-700 font-black"
                >
                  <BadgeCheck className="h-4 w-4 mr-1 text-emerald-600" /> {p.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projeto</p>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-white font-black">
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {allowedProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2"
            onClick={onContinue}
            disabled={!selected}
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}