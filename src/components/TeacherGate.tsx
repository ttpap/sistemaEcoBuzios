"use client";

import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getTeacherSessionLogin, getTeacherSessionPassword, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { ensureTeacherAuthForModeB } from "@/utils/mode-b-staff";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!isTeacherLoggedIn()) return;

      const login = getTeacherSessionLogin();
      const password = getTeacherSessionPassword();
      if (!login || !password) {
        setFailed(true);
        return;
      }

      try {
        await ensureTeacherAuthForModeB({ login, password });

        // Vincula o usuário auth (modo B) ao teacher_id via RPC segura.
        await supabase.rpc("mode_b_bind_staff_profile", {
          p_login: login,
          p_password: password,
        });

        setReady(true);
      } catch (e: any) {
        setFailed(true);
        showError(e?.message || "Não foi possível validar o acesso do professor.");
      }
    };

    void run();
  }, []);

  if (!isTeacherLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (failed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-sm font-black text-slate-800">Sessão do professor precisa ser refeita</div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            Por favor, faça login novamente para liberar o acesso nesta máquina.
          </div>
          <Button asChild className="mt-4 w-full rounded-2xl font-black">
            <a href="/login">Ir para login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-5 shadow-sm">
          <div className="text-sm font-black text-slate-700">Carregando…</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Liberando acesso do professor</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}