"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GraduationCap, Lock, User } from "lucide-react";
import { loginTeacher, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { showError, showSuccess } from "@/utils/toast";

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isTeacherLoggedIn()) navigate("/professor", { replace: true });
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = loginTeacher({ login: login.trim(), password });

    if (res.ok === true) {
      showSuccess("Bem-vindo(a)! Acesso do professor liberado.");
      navigate("/professor", { replace: true });
      return;
    }

    const reason = res.reason;

    if (reason === "not_assigned") {
      showError("Acesso ainda não liberado. Aguarde o administrador alocar você em um projeto.");
      return;
    }

    showError("Login ou senha inválidos.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-[1.75rem] bg-primary/10 border border-primary/15 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-primary">Área do Professor</h1>
          <p className="mt-2 text-slate-500 font-medium">
            Entre para acessar as turmas do seu projeto.
          </p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Login</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Ex.: prof.nome.sobrenome.123"
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                    autoComplete="username"
                  />
                </div>
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

              <Button
                type="submit"
                className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
              >
                Entrar
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                O acesso é liberado após o administrador alocar você em um projeto.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}