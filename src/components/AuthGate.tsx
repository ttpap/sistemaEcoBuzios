"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminLoggedIn } from "@/utils/admin-auth";
import { isTeacherLoggedIn } from "@/utils/teacher-auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const ok = isAdminLoggedIn() || isTeacherLoggedIn();
  if (!ok) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
