"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTeacherLoggedIn } from "@/utils/teacher-auth";
import { ensureTeacherAuthForModeB } from "@/utils/mode-b-staff";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    // Necessário para RLS em leitura/escrita de turmas/alunos/chamadas.
    void ensureTeacherAuthForModeB();
  }, []);

  if (!isTeacherLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}