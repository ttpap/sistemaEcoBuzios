"use client";

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Mantém o professor fora de rotas admin.
 * (A seleção de projeto será migrada do localStorage para o banco em seguida.)
 */
export default function TeacherEnforcer() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { loading, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (profile?.role !== "teacher") return;

    // Block admin-only pages
    if (
      loc.pathname.startsWith("/projetos") ||
      loc.pathname.startsWith("/admin") ||
      loc.pathname.startsWith("/professores") ||
      loc.pathname.startsWith("/coordenadores")
    ) {
      navigate("/professor", { replace: true });
    }
  }, [loc.pathname, navigate, loading, profile]);

  return null;
}