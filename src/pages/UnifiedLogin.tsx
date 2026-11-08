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
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, session, profile } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdminRedirect, setPendingAdminRedirect] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const st = location.state as any;
    if (st?.prefill?.login) setLogin(String(st.prefill.login));
  }, [location.state]);

  // Prefill por query param (link do email de boas-vindas):
  // /aluno/login?matricula=2026-0096&senha=EcoBuzios123
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get("matricula") || params.get("login");
    const s = params.get("senha") || params.get("password");
    if (m) setLogin(m);
    if (s) setPassword(s);
  }, [location.search]);

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
        // Detalhe técnico: sem linha em public.profiles para este usuário.
        showError("Não encontramos o seu perfil de acesso. Fale com o administrador do sistema.");
        navigate("/login/admin", { replace: true });
        return;
      }

      // Detalhe técnico: profiles.role != 'admin'.
      showError("Esta conta não tem permissão de administrador.");
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
                <Label htmlFor="login-user" className="text-xs font-black uppercase tracking-widest text-slate-600">
                  E-mail ou matrícula
                </Label>
                <Input
                  id="login-user"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="seu@email.com ou 2026-0096"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/60"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <p className="text-xs text-slate-500">Alunos: use a matrícula completa, com o ano e o traço.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-pass" className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="login-pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    type={showPassword ? "text" : "password"}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/60 pr-12"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || pendingAdminRedirect}
                className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
              >
                {submitting || pendingAdminRedirect ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600 space-y-1">
                <p className="font-bold text-slate-700">Esqueceu a senha ou não consegue entrar?</p>
                <p>
                  Fale com a coordenação do seu projeto. Alunos podem usar a senha enviada no e-mail de boas-vindas.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}