"use client";

import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getTeacherProjectId } from "@/utils/teachers";
import { getTeacherSessionTeacherId } from "@/utils/teacher-auth";
import { setActiveProjectId } from "@/utils/projects";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const teacherId = useMemo(() => getTeacherSessionTeacherId(), []);

  if (!teacherId) return <Navigate to="/professor/login" replace />;

  const projectId = getTeacherProjectId(teacherId);
  if (!projectId) return <Navigate to="/professor/login" replace />;

  // Ensure the active project is always the assigned one.
  setActiveProjectId(projectId);

  return <>{children}</>;
}
