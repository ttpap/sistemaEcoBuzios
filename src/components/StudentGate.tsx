"use client";

import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getStudentProjectIds,
  getStudentSessionProjectId,
  getStudentSessionStudentId,
  setStudentSessionProjectId,
} from "@/utils/student-auth";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";

export default function StudentGate({ children }: { children: React.ReactNode }) {
  const studentId = useMemo(() => getStudentSessionStudentId(), []);
  const location = useLocation();

  if (!studentId) return <Navigate to="/aluno/login" replace />;

  const projectIds = getStudentProjectIds(studentId);
  if (!projectIds.length) return <Navigate to="/aluno/login" replace />;

  if (projectIds.length > 1 && !getStudentSessionProjectId()) {
    if (!location.pathname.startsWith("/aluno/selecionar-projeto")) {
      return <Navigate to="/aluno/selecionar-projeto" replace />;
    }
    return <>{children}</>;
  }

  const sessionProjectId = getStudentSessionProjectId();
  const active = getActiveProjectId();

  const preferred = active && projectIds.includes(active) ? active : sessionProjectId;
  const projectId = preferred && projectIds.includes(preferred) ? preferred : projectIds[0];

  setActiveProjectId(projectId);
  if (sessionProjectId !== projectId) setStudentSessionProjectId(projectId);

  return <>{children}</>;
}
