"use client";

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { modeBLogin } from "@/utils/mode-b-login";
import { useAuth } from "@/context/AuthContext";
import { supabaseAuthService } from "@/services/supabaseAuthService";

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, session, profile } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdminRedirect, setPendingAdminRedirect] = useState(false);

  useEffect(() => {
    const st = location.state as any;
    if (st?.prefill?.login) setLogin(String(st.prefill.login));
  }, [location.state]);

  useEffect(() => {
    const run = async () => {
      if (!pendingAdminRedirect) return;
      if (loading) return;
      if (!session) return;

      if (profile?.role === "admin") {
        setPendingAdminRedirect(false);
        navigate("/projetos", { replace: true });
        return;
      }

      setPendingAdminRedirect(false);

      // Evita ficar com uma sessão autenticada que não tem permissão admin.
      void supabaseAuthService.signOut();

      if (!profile) {
        showError(
          "Sua conta autenticou no Supabase, mas não foi encontrado um perfil em public.profiles para este usuário. Sem profile, o acesso admin não pode ser validado.",
        );
        navigate("/login/admin", { replace: true });
        return;
      }

      showError("Sua conta autenticou no Supabase, mas não possui perfil de administrador (profiles.role != 'admin').");
      navigate("/login/admin", { replace: true });
    };

    void run();
  }, [loading, navigate, pendingAdminRedirect, profile, session]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const res = await modeBLogin({ login, password });

      if (res.ok) {
        showSuccess("Bem-vindo(a)! ");

        if (res.role === "admin") {
          // Para admin via Supabase, esperamos carregar o profile para checar role=admin.
          if (res.redirectTo !== "/") {
            navigate(res.redirectTo, { replace: true });
            return;
          }

          setPendingAdminRedirect(true);
          return;
        }

        navigate(res.redirectTo, { replace: true });
        return;
      }

      const reason = (res as Extract<typeof res, { ok: false }>).reason;

      if (reason === "network_error") {
        showError("Problema de conexão. Verifique sua internet e tente novamente.");
        return;
      }

      if (reason === "not_assigned") {
        showError("Acesso ainda não liberado (sem vínculo com projeto/turma). Procure um gestor.");
        return;
      }

      if (reason === "ambiguous_login") {
        showError("Use a matrícula completa no formato AAAA-XXXX (ex: 2026-0096).");
        return;
      }

      showError("Login ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">EcoBúzios</h1>
          <p className="mt-2 text-slate-500 font-medium">Entre com seu login e senha.</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Login</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Usuário</Label>
                <Input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Email (admin/prof) ou matrícula (ex: 2026-0096)"
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  type="password"
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || pendingAdminRedirect}
                className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
              >
                {pendingAdminRedirect ? "Entrando..." : "Entrar"}
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                <p>
                  <span className="font-black">Admin:</span> email + senha (Supabase Auth). O painel só libera se o seu
                  <span className="font-black"> profiles.role</span> for <span className="font-black">admin</span>.
                </p>
                <p className="mt-2">
                  <span className="font-black">Professor/Coordenador:</span> login + senha gerados no cadastro.
                </p>
                <p className="mt-2">
                  <span className="font-black">Aluno:</span> matrícula completa (ex: 2026-0096) + senha <span className="font-black">EcoBuzios123</span>.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}