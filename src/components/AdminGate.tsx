"use client";

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-5 shadow-sm">
          <div className="text-sm font-black text-slate-700">Carregando…</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Verificando acesso administrativo</div>
        </div>
      </div>
    );
  }

  // Etapa 2 (ADR-001): admin depende APENAS de Supabase Auth + profiles.role='admin'.
  if (!session) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <Card className="w-full max-w-xl border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-3xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-slate-900 tracking-tight">Acesso restrito</h1>
            <p className="mt-2 text-slate-600 font-medium">
              Você precisa estar autenticado no Supabase para acessar a área administrativa.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Button
                className="rounded-2xl font-black"
                onClick={() => navigate("/login", { state: { from: location.pathname } })}
              >
                Ir para login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <Card className="w-full max-w-xl border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perfil não encontrado</h1>
            <p className="mt-2 text-slate-600 font-medium">
              Você está autenticado no Supabase, mas não foi encontrado um registro em <span className="font-black">public.profiles</span>
              para este usuário. Sem perfil, o acesso administrativo não pode ser validado.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                onClick={async () => {
                  await signOut();
                  navigate("/login", { replace: true });
                }}
              >
                Sair
              </Button>
              <Button className="rounded-2xl font-black" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.role !== "admin") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <Card className="w-full max-w-xl border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sem permissão de administrador</h1>
            <p className="mt-2 text-slate-600 font-medium">
              Sua conta autenticou no Supabase, mas o seu perfil não é admin.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              Necessário: <span className="font-black">profiles.role = 'admin'</span>.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button
                className="rounded-2xl font-black"
                onClick={async () => {
                  await signOut();
                  navigate("/login/admin", { replace: true });
                }}
              >
                Voltar para o login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
