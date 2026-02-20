"use client";

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getTeacherSessionProjectId,
  getTeacherSessionTeacherId,
  isTeacherLoggedIn,
  setTeacherSessionProjectId,
} from "@/utils/teacher-auth";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import { getTeacherProjectIds } from "@/utils/teachers";

/**
 * When a teacher is logged in, keep the active project inside the teacher's assigned projects
 * and keep them out of admin-only pages.
 */
export default function TeacherEnforcer() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTeacherLoggedIn()) return;

    const teacherId = getTeacherSessionTeacherId();
    if (!teacherId) return;

    const projectIds = getTeacherProjectIds(teacherId);
    const sessionProjectId = getTeacherSessionProjectId();
    const active = getActiveProjectId();

    const preferred = active && projectIds.includes(active) ? active : sessionProjectId;
    const nextProjectId = preferred && projectIds.includes(preferred) ? preferred : projectIds[0];

    if (nextProjectId) {
      setActiveProjectId(nextProjectId);
      if (sessionProjectId !== nextProjectId) setTeacherSessionProjectId(nextProjectId);
    }

    // Block admin-only pages
    if (
      loc.pathname.startsWith("/projetos") ||
      loc.pathname.startsWith("/admin") ||
      loc.pathname.startsWith("/professores")
    ) {
      navigate("/", { replace: true });
    }
  }, [loc.pathname, navigate]);

  return null;
}