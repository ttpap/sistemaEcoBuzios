"use client";

import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import {
  getCoordinatorSessionProjectId,
  getCoordinatorSessionProjectIds,
  setCoordinatorSessionProjectId,
} from "@/utils/coordinator-auth";

export default function CoordinatorActiveProjectGate({ children }: { children: React.ReactNode }) {
  const activeProjectId = getActiveProjectId();

  const { sessionProjectId, sessionProjectIds } = useMemo(
    () => ({
      sessionProjectId: getCoordinatorSessionProjectId(),
      sessionProjectIds: getCoordinatorSessionProjectIds(),
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
    setCoordinatorSessionProjectId(pid);
    return <>{children}</>;
  }

  if (sessionProjectIds.length > 1) {
    return <Navigate to="/coordenador/selecionar-projeto" replace />;
  }

  return <Navigate to="/login" replace />;
}
