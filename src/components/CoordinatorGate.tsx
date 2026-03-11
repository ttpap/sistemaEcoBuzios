"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isCoordinatorLoggedIn } from "@/utils/coordinator-auth";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isCoordinatorLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Definitivo: o Modo B não depende de Supabase Auth nem de "bind" de profile.
  // As telas carregam dados via RPC usando as credenciais salvas na sessão local.
  return <>{children}</>;
}
