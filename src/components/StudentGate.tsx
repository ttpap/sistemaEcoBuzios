"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isStudentLoggedIn } from "@/utils/student-auth";

export default function StudentGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isStudentLoggedIn()) {
    return <Navigate to="/aluno/login" replace state={{ from: location.pathname }} />;
  }

  // Definitivo: o Modo B do aluno usa RPCs e sessão local.
  return <>{children}</>;
}
