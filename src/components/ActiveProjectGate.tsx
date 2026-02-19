"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { getActiveProjectId } from "@/utils/projects";

export default function ActiveProjectGate({ children }: { children: React.ReactNode }) {
  const active = getActiveProjectId();
  if (!active) return <Navigate to="/projetos" replace />;
  return <>{children}</>;
}
