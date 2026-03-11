"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isAdminLoggedIn } from "@/utils/admin-auth";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

  // 1) Admin via Supabase Auth
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-5 shadow-sm">
          <div className="text-sm font-black text-slate-700">Carregando…</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Verificando acesso</div>
        </div>
      </div>
    );
  }

  if (session && profile?.role === "admin") {
    return <>{children}</>;
  }

  // 2) Fallback local (quando ainda não existe admin no Supabase)
  if (isAdminLoggedIn()) {
    return <>{children}</>;
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}