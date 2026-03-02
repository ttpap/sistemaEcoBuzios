"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

// Mantido por compatibilidade com partes antigas.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateSupabase allow={["admin", "teacher"]} redirectTo="/login">
      {children}
    </AuthGateSupabase>
  );
}