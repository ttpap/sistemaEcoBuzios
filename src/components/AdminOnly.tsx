"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminLoggedIn } from "@/utils/admin-auth";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();

  if (loading) return null;

  if (session && profile?.role === "admin") return <>{children}</>;
  if (isAdminLoggedIn()) return <>{children}</>;

  return null;
}