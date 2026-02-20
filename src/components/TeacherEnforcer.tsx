"use client";

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTeacherSessionTeacherId, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { setActiveProjectId } from "@/utils/projects";
import { getTeacherProjectId } from "@/utils/teachers";

/**
 * When a teacher is logged in, force the active project to the assigned project
 * and keep them out of admin-only pages.
 */
export default function TeacherEnforcer() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTeacherLoggedIn()) return;

    const teacherId = getTeacherSessionTeacherId();
    if (!teacherId) return;

    const projectId = getTeacherProjectId(teacherId);
    if (projectId) {
      // Force active project
      setActiveProjectId(projectId);
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