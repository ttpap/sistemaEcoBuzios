"use client";

import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCoordinatorProjectIds } from "@/utils/coordinators";
import {
  getCoordinatorSessionCoordinatorId,
  getCoordinatorSessionProjectId,
  setCoordinatorSessionProjectId,
} from "@/utils/coordinator-auth";
import { getActiveProjectId, setActiveProjectId } from "@/utils/projects";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const coordinatorId = useMemo(() => getCoordinatorSessionCoordinatorId(), []);
  const location = useLocation();

  if (!coordinatorId) return <Navigate to="/login?role=coordinator" replace />;

  const projectIds = getCoordinatorProjectIds(coordinatorId);
  if (!projectIds.length) return <Navigate to="/login?role=coordinator" replace />;

  if (projectIds.length > 1 && !getCoordinatorSessionProjectId()) {
    if (!location.pathname.startsWith("/coordenador/selecionar-projeto")) {
      return <Navigate to="/coordenador/selecionar-projeto" replace />;
    }
    return <>{children}</>;
  }

  const sessionProjectId = getCoordinatorSessionProjectId();
  const active = getActiveProjectId();

  const preferred = active && projectIds.includes(active) ? active : sessionProjectId;
  const projectId = preferred && projectIds.includes(preferred) ? preferred : projectIds[0];

  setActiveProjectId(projectId);
  if (sessionProjectId !== projectId) setCoordinatorSessionProjectId(projectId);

  return <>{children}</>;
}
