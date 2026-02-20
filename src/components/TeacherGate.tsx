"use client";

import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getTeacherProjectIds } from "@/utils/teachers";
import { getTeacherSessionProjectId, getTeacherSessionTeacherId, setTeacherSessionProjectId } from "@/utils/teacher-auth";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const teacherId = useMemo(() => getTeacherSessionTeacherId(), []);

  if (!teacherId) return <Navigate to="/login?role=teacher" replace />;

  const projectIds = getTeacherProjectIds(teacherId);
  if (!projectIds.length) return <Navigate to="/login?role=teacher" replace />;

  const sessionProjectId = getTeacherSessionProjectId();
  const active = getActiveProjectId();

  // Keep the active project within the teacher's allowed projects.
  const preferred = active && projectIds.includes(active) ? active : sessionProjectId;
  const projectId = preferred && projectIds.includes(preferred) ? preferred : projectIds[0];

  setActiveProjectId(projectId);
  if (sessionProjectId !== projectId) setTeacherSessionProjectId(projectId);

  return <>{children}</>;
}