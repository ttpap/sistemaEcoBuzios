"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Layers, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveProjectId, saveProjects, setActiveProjectId } from "@/utils/projects";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentSessionLogin,
  getStudentSessionProjectIds,
  getStudentSessionStudentId,
  setStudentSessionProjectId,
} from "@/utils/student-auth";
import { showError } from "@/utils/toast";
import type { Project } from "@/types/project";
import { fetchModeBStudentProjects } from "@/services/modeBProjectsService";

export default function StudentSelectProject() {
  const navigate = useNavigate();
  const studentId = useMemo(() => getStudentSessionStudentId(), []);

  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const run = async () => {
      const login = getStudentSessionLogin();
      if (!login) {
        setProjects([]);
        return;
      }

      try {
        const rows = await fetchModeBStudentProjects({
          registrationOrLast4: login,
          password: DEFAULT_STUDENT_PASSWORD,
        });
        setProjects(rows);
        if (rows.length) saveProjects(rows);
      } catch (e: any) {
        setProjects([]);
        showError(e?.message || "Não foi possível carregar seus projetos.");
      }
    };
    void run();
  }, []);

  const allowedProjects = useMemo(() => {
    const allowed = new Set(getStudentSessionProjectIds());
    return projects.filter((p) => allowed.has(p.id));
  }, [projects]);

  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    const active = getActiveProjectId();
    const next = active && allowedProjects.some((p) => p.id === active) ? active : allowedProjects[0]?.id || "";
    setSelected(next);

    if (allowedProjects.length === 1 && next) {
      setActiveProjectId(next);
      setStudentSessionProjectId(next);
      navigate("/aluno", { replace: true });
    }
  }, [allowedProjects, navigate]);

  const onConfirm = () => {
    if (!selected) {
      showError("Selecione um projeto.");
      return;
    }
    setActiveProjectId(selected);
    setStudentSessionProjectId(selected);
    navigate("/aluno", { replace: true });
  };

  if (!studentId) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden w-full max-w-xl">
        <CardHeader className="p-8 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black text-primary">Selecione o projeto</CardTitle>
              <p className="mt-2 text-slate-600 font-medium">
                Você está vinculado(a) a mais de um projeto. Escolha qual deseja acompanhar agora.
              </p>
            </div>
            <Badge className="rounded-full border-none bg-primary/10 text-primary font-black px-4 py-2">
              <GraduationCap className="h-4 w-4 mr-2" /> Aluno
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-6">
          {allowedProjects.length === 0 ? (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-950">
              Nenhum projeto disponível para este aluno.
              <div className="mt-2 text-xs font-bold text-amber-900/90">
                Verifique se o aluno está matriculado em alguma turma e se a migração
                <span className="font-black"> 0018_mode_b_list_projects</span> foi aplicada no Supabase.
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projeto</p>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-white font-black">
                <Layers className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Selecione" />
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

          <Button className="w-full h-12 rounded-2xl font-black gap-2" onClick={onConfirm} disabled={!selected}>
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-[180px]">
              <Logo className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}