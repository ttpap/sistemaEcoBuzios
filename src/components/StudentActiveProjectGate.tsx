"use client";

import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import { getStudentSessionProjectId, getStudentSessionProjectIds, setStudentSessionProjectId } from "@/utils/student-auth";

export default function StudentActiveProjectGate({ children }: { children: React.ReactNode }) {
  const activeProjectId = getActiveProjectId();

  const { sessionProjectId, sessionProjectIds } = useMemo(
    () => ({
      sessionProjectId: getStudentSessionProjectId(),
      sessionProjectIds: getStudentSessionProjectIds(),
    }),
    [],
  );

  if (activeProjectId) return <>{children}</>;

  if (sessionProjectId) {
    setActiveProjectId(sessionProjectId);
    return <>{children}</>;
  }

  if (sessionProjectIds.length === 1) {
    const pid = sessionProjectIds[0];
    setActiveProjectId(pid);
    setStudentSessionProjectId(pid);
    return <>{children}</>;
  }

  if (sessionProjectIds.length > 1) {
    return <Navigate to="/aluno/selecionar-projeto" replace />;
  }

  return <Navigate to="/login" replace />;
}
