"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProjects, setActiveProjectId } from "@/utils/projects";
import { getTeacherSessionTeacherId, setTeacherSessionProjectId } from "@/utils/teacher-auth";
import { getTeacherProjectIds } from "@/utils/teachers";
import { BadgeCheck, Layers, ArrowRight } from "lucide-react";

export default function TeacherSelectProject() {
  const navigate = useNavigate();

  const teacherId = useMemo(() => getTeacherSessionTeacherId(), []);

  const projects = useMemo(() => {
    if (!teacherId) return [];
    const allowed = new Set(getTeacherProjectIds(teacherId));
    return getProjects().filter((p) => allowed.has(p.id));
  }, [teacherId]);

  const [selected, setSelected] = React.useState<string>(projects[0]?.id || "");

  React.useEffect(() => {
    setSelected((prev) => prev || projects[0]?.id || "");
  }, [projects]);

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
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponíveis</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {projects.map((p) => (
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
                {projects.map((p) => (
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
