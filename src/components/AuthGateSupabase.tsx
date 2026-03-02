"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AuthGateSupabase({
  allow,
  redirectTo = "/login",
  children,
}: {
  allow: Array<"admin" | "teacher" | "coordinator" | "student">;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

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

  if (!session) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Autenticado, mas sem profile/role cadastrado
  if (!profile?.role) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}