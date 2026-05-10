"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isPhotographerLoggedIn } from "@/utils/photographer-auth";

export default function PhotographerGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isPhotographerLoggedIn()) {
    return <Navigate to="/fotografo/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
