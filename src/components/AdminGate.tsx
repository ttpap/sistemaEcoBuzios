"use client";

import React from "react";
import { copyToClipboard } from "@/utils/clipboard";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile, profileError, signOut } = useAuth();
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

  // Se não há sessão, manda direto para login.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    const uid = session.user?.id;
    const email = session.user?.email || null;

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <Card className="w-full max-w-xl border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perfil não encontrado</h1>
            <p className="mt-2 text-slate-600 font-medium">
              Você está autenticado no Supabase, mas não foi possível obter um registro em <span className="font-black">public.profiles</span>
              para este usuário.
            </p>

            {profileError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900">
                Erro ao consultar profile: <span className="font-black">{profileError}</span>
                <div className="mt-2 text-[11px] font-black text-red-800/80">
                  Se o erro mencionar RLS/permissão, confirme se existe a policy <span className="font-black">profiles_select_own</span>.
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-700">
                Nenhum profile encontrado para:
                <div className="mt-2 space-y-1 break-all">
                  <div>
                    <span className="text-slate-500">user_id:</span> <span className="font-black">{uid}</span>
                  </div>
                  {email ? (
                    <div>
                      <span className="text-slate-500">email:</span> <span className="font-black">{email}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

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
              <Button
                className="rounded-2xl font-black"
                onClick={() => {
                  if (uid) void copyToClipboard(uid);
                }}
              >
                Copiar user_id
              </Button>
              <Button className="rounded-2xl font-black" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            </div>

            <div className="mt-6 text-xs font-bold text-slate-500">
              Para liberar admin, é necessário existir um registro em <span className="font-black">public.profiles</span> com
              <span className="font-black"> user_id = auth.users.id</span> e <span className="font-black">role = 'admin'</span>.
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