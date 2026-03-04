"use client";

import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import {
  getTeacherSessionProjectId,
  getTeacherSessionProjectIds,
  setTeacherSessionProjectId,
} from "@/utils/teacher-auth";

export default function TeacherActiveProjectGate({ children }: { children: React.ReactNode }) {
  const activeProjectId = getActiveProjectId();

  const { sessionProjectId, sessionProjectIds } = useMemo(
    () => ({
      sessionProjectId: getTeacherSessionProjectId(),
      sessionProjectIds: getTeacherSessionProjectIds(),
    }),
    [],
  );

  // Se já existe active, só deixa passar se ele estiver dentro dos projetos liberados.
  if (activeProjectId) {
    if (sessionProjectIds.length === 0 || sessionProjectIds.includes(activeProjectId)) {
      return <>{children}</>;
    }

    // Active inválido para este professor: força um projeto permitido.
    if (sessionProjectId) {
      setActiveProjectId(sessionProjectId);
      return <>{children}</>;
    }

    if (sessionProjectIds.length === 1) {
      const pid = sessionProjectIds[0];
      setActiveProjectId(pid);
      setTeacherSessionProjectId(pid);
      return <>{children}</>;
    }

    if (sessionProjectIds.length > 1) {
      return <Navigate to="/professor/selecionar-projeto" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  // Tenta usar o projeto da sessão.
  if (sessionProjectId) {
    setActiveProjectId(sessionProjectId);
    return <>{children}</>;
  }

  // Se houver somente 1 projeto alocado, ativa automaticamente.
  if (sessionProjectIds.length === 1) {
    const pid = sessionProjectIds[0];
    setActiveProjectId(pid);
    setTeacherSessionProjectId(pid);
    return <>{children}</>;
  }

  // Se houver mais de um, força seleção.
  if (sessionProjectIds.length > 1) {
    return <Navigate to="/professor/selecionar-projeto" replace />;
  }

  // Sem sessão válida.
  return <Navigate to="/login" replace />;
}