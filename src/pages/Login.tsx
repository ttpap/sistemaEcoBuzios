"use client";

import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import { supabase, supabaseUsingFallbackConfig } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TriangleAlert } from "lucide-react";

function routeForRole(role: string) {
  if (role === "admin") return "/projetos";
  if (role === "teacher") return "/professor";
  if (role === "coordinator") return "/coordenador";
  if (role === "student") return "/aluno";
  return "/projetos";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, session, profile } = useAuth();

  const roleHint = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const r = (sp.get("role") || "").toLowerCase();
    if (r === "admin") return "admin";
    if (r === "teacher" || r === "professor") return "teacher";
    if (r === "coordinator" || r === "coordenador") return "coordinator";
    if (r === "student" || r === "aluno") return "student";
    return null;
  }, [location.search]);

  useEffect(() => {
    if (loading) return;
    if (!session) return;

    // Se o usuário logou, mas ainda não tem profile/role, não redireciona.
    if (!profile?.role) return;

    navigate(routeForRole(profile.role), { replace: true });
  }, [loading, session, profile, navigate]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">
            EcoBúzios
          </h1>
          <p className="mt-2 text-slate-500 font-medium">
            Acesso seguro via Supabase (email e senha).
          </p>
          {roleHint ? (
            <div className="mt-3">
              <Badge className="rounded-full border-none bg-secondary text-primary font-black px-3">
                Perfil: {roleHint}
              </Badge>
            </div>
          ) : null}
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            {supabaseUsingFallbackConfig ? (
              <div className="mb-4 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3 text-amber-950">
                  <TriangleAlert className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-sm font-black">Usando Supabase padrão</p>
                    <p className="mt-1 text-sm font-bold text-amber-950/90">
                      As variáveis <span className="font-black">VITE_SUPABASE_URL</span> e
                      <span className="font-black"> VITE_SUPABASE_ANON_KEY</span> não foram definidas no
                      deploy, então o app está usando a configuração padrão embutida.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {session && !profile ? (
              <div className="mb-4 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3 text-amber-950">
                  <TriangleAlert className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-sm font-black">Acesso ainda não liberado</p>
                    <p className="mt-1 text-sm font-bold text-amber-950/90">
                      Seu usuário foi autenticado, mas ainda não existe um perfil em
                      <span className="font-black"> profiles</span> com o seu papel (admin/professor/etc.).
                      Peça ao administrador para cadastrar.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                style: {
                  button: { borderRadius: "16px", fontWeight: "800" },
                  input: { borderRadius: "16px" },
                  anchor: { fontWeight: "800" },
                },
                variables: {
                  default: {
                    colors: {
                      brand: "#3b82f6",
                      brandAccent: "#2563eb",
                    },
                  },
                },
              }}
              theme="light"
            />

            <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
              Se você é o administrador, crie seu usuário em Authentication → Users e depois insira
              seu perfil na tabela <span className="font-black">profiles</span> com role <span className="font-black">admin</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}