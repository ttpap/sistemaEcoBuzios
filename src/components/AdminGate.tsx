"use client";

import React from "react";
import AuthGateSupabase from "@/components/AuthGateSupabase";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateSupabase allow={["admin"]} redirectTo="/login">
      {children}
    </AuthGateSupabase>
  );
}