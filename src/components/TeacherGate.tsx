"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  return <AuthGateSupabase allow={["teacher"]}>{children}</AuthGateSupabase>;
}