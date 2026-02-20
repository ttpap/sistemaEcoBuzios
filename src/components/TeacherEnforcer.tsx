"use client";

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isTeacherLoggedIn, getTeacherSession } from "@/utils/teacher-auth";
import { setActiveProjectId } from "@/utils/projects";

/**
 * When a teacher is logged in, force the active project to the assigned project
 * and keep them out of admin-only pages.
 */
export default function TeacherEnforcer() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTeacherLoggedIn()) return;
    const sess = getTeacherSession();
    if (!sess) return;

    // Force active project
    setActiveProjectId(sess.projectId);

    // Block admin-only pages
    if (loc.pathname.startsWith("/projetos") || loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/professores")) {
      navigate("/", { replace: true });
    }
  }, [loc.pathname, navigate]);

  return null;
}
