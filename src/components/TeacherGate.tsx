"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getTeacherSessionLogin, getTeacherSessionPassword, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { ensureTeacherAuthForModeB } from "@/utils/mode-b-staff";
import { supabase } from "@/integrations/supabase/client";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      if (!isTeacherLoggedIn()) return;

      await ensureTeacherAuthForModeB();

      const login = getTeacherSessionLogin();
      const password = getTeacherSessionPassword();
      if (!login || !password) return;

      // Vincula o usuário auth (modo B) ao teacher_id via RPC segura.
      await supabase.rpc("mode_b_bind_staff_profile", {
        p_login: login,
        p_password: password,
      });
    };

    void run();
  }, []);

  if (!isTeacherLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}