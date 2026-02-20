"use client";

import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getTeacherProjectIds } from "@/utils/teachers";
import {
  getTeacherSessionProjectId,
  getTeacherSessionTeacherId,
  setTeacherSessionProjectId,
} from "@/utils/teacher-auth";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const teacherId = useMemo(() => getTeacherSessionTeacherId(), []);
  const location = useLocation();

  if (!teacherId) return <Navigate to="/login?role=teacher" replace />;

  const projectIds = getTeacherProjectIds(teacherId);
  if (!projectIds.length) return <Navigate to="/login?role=teacher" replace />;

  // If teacher has multiple projects and hasn't explicitly selected one,
  // force them to choose before accessing the area.
  if (projectIds.length > 1 && !getTeacherSessionProjectId()) {
    if (!location.pathname.startsWith("/professor/selecionar-projeto")) {
      return <Navigate to="/professor/selecionar-projeto" replace />;
    }
    return <>{children}</>;
  }

  const sessionProjectId = getTeacherSessionProjectId();
  const active = getActiveProjectId();

  // Keep the active project within the teacher's allowed projects.
  const preferred = active && projectIds.includes(active) ? active : sessionProjectId;
  const projectId = preferred && projectIds.includes(preferred) ? preferred : projectIds[0];

  setActiveProjectId(projectId);
  if (sessionProjectId !== projectId) setTeacherSessionProjectId(projectId);

  return <>{children}</>;
}