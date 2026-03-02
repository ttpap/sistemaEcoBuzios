"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users2, Lock, User } from "lucide-react";
import { isCoordinatorLoggedIn, loginCoordinator } from "@/utils/coordinator-auth";
import { showError, showSuccess } from "@/utils/toast";

export default function CoordinatorLogin() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isCoordinatorLoggedIn()) navigate("/coordenador", { replace: true });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await loginCoordinator({ login: login.trim(), password });

    if (res.ok === true) {
      showSuccess("Bem-vindo(a)! Acesso do coordenador liberado.");
      navigate("/coordenador", { replace: true });
      return;
    }

    if (res.reason === "not_assigned") {
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
            <Users2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-primary">Área do Coordenador</h1>
          <p className="mt-2 text-slate-500 font-medium">Entre para acessar os projetos sob sua coordenação.</p>
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
                    placeholder="Ex.: coord.nome.sobrenome.123"
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

              <Button type="submit" className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
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
