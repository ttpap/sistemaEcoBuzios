"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { isAdminLoggedIn } from "@/utils/admin-auth";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  if (!isAdminLoggedIn()) return <Navigate to="/" replace />;
  return <>{children}</>;
}
