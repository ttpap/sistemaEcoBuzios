"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCoordinatorSessionCoordinatorId, isCoordinatorLoggedIn } from "@/utils/coordinator-auth";
import { ensureCoordinatorAuthForModeB } from "@/utils/mode-b-staff";
import { supabase } from "@/integrations/supabase/client";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      if (!isCoordinatorLoggedIn()) return;

      await ensureCoordinatorAuthForModeB();

      const coordinatorId = getCoordinatorSessionCoordinatorId();
      if (!coordinatorId) return;

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;

      // Mapeia o usuário auth (modo B) para o coordenador para liberar RLS.
      await supabase
        .from("profiles")
        .update({ role: "coordinator", coordinator_id: coordinatorId })
        .eq("user_id", userId);
    };

    void run();
  }, []);

  if (!isCoordinatorLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}