"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  return <AuthGateSupabase allow={["admin"]}>{children}</AuthGateSupabase>;
}