"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  return <AuthGateSupabase allow={["coordinator"]}>{children}</AuthGateSupabase>;
}