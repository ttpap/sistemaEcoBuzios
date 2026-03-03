"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isCoordinatorLoggedIn } from "@/utils/coordinator-auth";
import { ensureCoordinatorAuthForModeB } from "@/utils/mode-b-staff";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    // Necessário para RLS em leitura/escrita de turmas/alunos/chamadas.
    void ensureCoordinatorAuthForModeB();
  }, []);

  if (!isCoordinatorLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}