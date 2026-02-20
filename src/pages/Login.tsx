"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, User, Shield, GraduationCap } from "lucide-react";
import Logo from "@/components/Logo";
import { loginAdmin, isAdminLoggedIn } from "@/utils/admin-auth";
import { loginTeacher, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { showError, showSuccess } from "@/utils/toast";

function useQueryRole() {
  const location = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const r = (sp.get("role") || "").toLowerCase();
    return r === "teacher" || r === "professor" ? "teacher" : r === "admin" ? "admin" : null;
  }, [location.search]);
}

export default function Login() {
  const navigate = useNavigate();
  const defaultRole = useQueryRole();

  const [role, setRole] = useState<"admin" | "teacher">((defaultRole as any) || "admin");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // If already logged in, route accordingly.
    if (isAdminLoggedIn()) {
      navigate("/projetos", { replace: true });
      return;
    }
    if (isTeacherLoggedIn()) {
      navigate("/professor", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (defaultRole) setRole(defaultRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRole]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === "admin") {
      const ok = loginAdmin({ login: login.trim(), password });
      if (!ok) {
        showError("Login ou senha inválidos.");
        return;
      }
      showSuccess("Bem-vindo(a)! Acesso de administrador liberado.");
      navigate("/projetos", { replace: true });
      return;
    }

    const res = loginTeacher({ login: login.trim(), password });
    if (res.ok === true) {
      showSuccess("Bem-vindo(a)! Acesso do professor liberado.");
      navigate("/professor", { replace: true });
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
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">
            Sistema de Gestão Pedagógica EcoBuzios
          </h1>
          <p className="mt-2 text-slate-500 font-medium">
            Entre como administrador ou professor.
          </p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Acesso</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
              <TabsList className="w-full justify-start gap-2 rounded-[1.5rem] bg-slate-50 p-2 border border-slate-100">
                <TabsTrigger value="admin" className="rounded-2xl font-black">
                  <Shield className="h-4 w-4 mr-2" /> Administrador
                </TabsTrigger>
                <TabsTrigger value="teacher" className="rounded-2xl font-black">
                  <GraduationCap className="h-4 w-4 mr-2" /> Professor
                </TabsTrigger>
              </TabsList>

              <TabsContent value={role} className="mt-5">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Usuário
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder={role === "admin" ? "Pap" : "Ex.: prof.nome.sobrenome.123"}
                        className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Senha
                    </Label>
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

                  {role === "teacher" ? (
                    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                      O acesso do professor só funciona após o administrador alocar você em um projeto.
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                      Dica: após entrar, você escolherá um projeto existente ou criará um novo.
                    </div>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}