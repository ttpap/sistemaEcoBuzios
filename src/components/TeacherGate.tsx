"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getTeacherSessionTeacherId, isTeacherLoggedIn } from "@/utils/teacher-auth";
import { ensureTeacherAuthForModeB } from "@/utils/mode-b-staff";
import { supabase } from "@/integrations/supabase/client";

export default function TeacherGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      if (!isTeacherLoggedIn()) return;

      await ensureTeacherAuthForModeB();

      const teacherId = getTeacherSessionTeacherId();
      if (!teacherId) return;

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;

      // Mapeia o usuário auth (modo B) para o professor para liberar RLS.
      await supabase.from("profiles").update({ role: "teacher", teacher_id: teacherId }).eq("user_id", userId);
    };

    void run();
  }, []);

  if (!isTeacherLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}