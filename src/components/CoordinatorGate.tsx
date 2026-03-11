"use client";

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword, isCoordinatorLoggedIn } from "@/utils/coordinator-auth";
import { ensureCoordinatorAuthForModeB } from "@/utils/mode-b-staff";
import { supabase } from "@/integrations/supabase/client";

export default function CoordinatorGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      if (!isCoordinatorLoggedIn()) return;

      await ensureCoordinatorAuthForModeB();

      const login = getCoordinatorSessionLogin();
      const password = getCoordinatorSessionPassword();
      if (!login || !password) return;

      // Vincula o usuário auth (modo B) ao coordinator_id via RPC segura.
      await supabase.rpc("mode_b_bind_staff_profile", {
        p_login: login,
        p_password: password,
      });
    };

    void run();
  }, []);

  if (!isCoordinatorLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}