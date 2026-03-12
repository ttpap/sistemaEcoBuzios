"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();

  if (loading) return null;
  if (session && profile?.role === "admin") return <>{children}</>;

  return null;
}
