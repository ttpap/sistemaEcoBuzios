"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { isAdminLoggedIn } from "@/utils/admin-auth";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  if (!isAdminLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
