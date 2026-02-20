"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { CalendarDays, IdCard, Lock } from "lucide-react";
import { DEFAULT_STUDENT_PASSWORD, isStudentLoggedIn, loginStudent } from "@/utils/student-auth";
import { showError, showSuccess } from "@/utils/toast";

export default function StudentLogin() {
  const navigate = useNavigate();

  const [registration, setRegistration] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isStudentLoggedIn()) navigate("/aluno", { replace: true });
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = loginStudent({ registration, password });
    if (res.ok) {
      showSuccess("Bem-vindo(a)! Acesso do aluno liberado.");
      if (res.projectIds.length > 1) {
        navigate("/aluno/selecionar-projeto", { replace: true });
      } else {
        navigate("/aluno", { replace: true });
      }
      return;
    }

    if ("reason" in res && res.reason === "not_assigned") {
      showError("Sua matrícula ainda não está vinculada a nenhuma turma/projeto. Procure um gestor.");
      return;
    }

    showError("Matrícula ou senha inválidos.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">Área do Aluno</h1>
          <p className="mt-2 text-slate-500 font-medium">Entre com sua matrícula e senha.</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Acesso</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Login</Label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    placeholder="Ex.: 0011"
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                    autoComplete="username"
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-500">
                  Use os <span className="font-black">4 últimos dígitos</span> da matrícula. Ex.: 2026-0011 → 0011
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    type="password"
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
                Entrar
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>
                    A senha padrão do aluno é <span className="font-black">{DEFAULT_STUDENT_PASSWORD}</span>.
                  </span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}