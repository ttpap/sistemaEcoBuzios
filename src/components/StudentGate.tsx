"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

export default function StudentGate({ children }: { children: React.ReactNode }) {
  return <AuthGateSupabase allow={["student"]}>{children}</AuthGateSupabase>;
}