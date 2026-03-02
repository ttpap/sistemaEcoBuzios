"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isCoordinatorLoggedIn } from "@/utils/coordinator-auth";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isCoordinatorLoggedIn()) {
    return <Navigate to="/coordenador/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}