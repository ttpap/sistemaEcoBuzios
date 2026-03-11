"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTeacherLoggedIn } from "@/utils/teacher-auth";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isTeacherLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}