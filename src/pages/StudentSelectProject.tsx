"use client";

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, ArrowRight } from "lucide-react";
import { getProjects, setActiveProjectId } from "@/utils/projects";
import {
  getStudentProjectIds,
  getStudentSessionStudentId,
  setStudentSessionProjectId,
} from "@/utils/student-auth";
import { showError } from "@/utils/toast";

export default function StudentSelectProject() {
  const navigate = useNavigate();
  const studentId = useMemo(() => getStudentSessionStudentId(), []);

  const allowedProjects = useMemo(() => {
    if (!studentId) return [];
    const allowed = new Set(getStudentProjectIds(studentId));
    return getProjects().filter((p) => allowed.has(p.id));
  }, [studentId]);

  const [selected, setSelected] = useState<string>(allowedProjects[0]?.id || "");

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
          <CardTitle className="text-xl font-black text-primary">Selecione o projeto</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-6">
          <p className="text-slate-600 font-medium">
            Você está vinculado(a) a mais de um projeto. Escolha qual deseja acompanhar agora.
          </p>

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

          <Button className="w-full h-12 rounded-2xl font-black" onClick={onConfirm}>
            Continuar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
