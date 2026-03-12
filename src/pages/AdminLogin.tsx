"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { Shield, Lock, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { supabaseAuthService } from "@/services/supabaseAuthService";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { session, profile, loading, signOut } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handledRoleCheckRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      handledRoleCheckRef.current = false;
      return;
    }

    // Aguarda o profile do contexto para validar role.
    if (!profile) {
      if (handledRoleCheckRef.current) return;
      handledRoleCheckRef.current = true;
      showError(
        "Você autenticou no Supabase, mas não foi encontrado um perfil em public.profiles para este usuário. Sem profile, o acesso admin não pode ser validado.",
      );
      void signOut();
      return;
    }

    if (profile.role !== "admin") {
      if (handledRoleCheckRef.current) return;
      handledRoleCheckRef.current = true;
      showError("Sua conta autenticou no Supabase, mas não possui perfil de administrador (profiles.role != 'admin').");
      void signOut();
      return;
    }

    navigate("/projetos", { replace: true });
  }, [loading, session, profile, navigate, signOut]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailTrim = email.trim();

    setSubmitting(true);
    try {
      const { error } = await supabaseAuthService.signInWithPassword({
        email: emailTrim,
        password,
      });

      if (error) throw error;
      // Redirect acontece via useEffect quando profile carregar.
    } catch (e: any) {
      showError(e?.message || "Não foi possível entrar.");
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
          <div className="mt-4 flex items-center justify-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <h1 className="text-2xl font-black tracking-tight">Admin</h1>
          </div>
          <p className="mt-2 text-slate-500 font-medium">Entre com o email e senha do seu usuário no Supabase.</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Login</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
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
                disabled={submitting}
                className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
              >
                Entrar
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                Depois de autenticar, o acesso admin só é liberado quando existe um profile em
                <span className="font-black"> public.profiles</span> com <span className="font-black">role=admin</span>.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}