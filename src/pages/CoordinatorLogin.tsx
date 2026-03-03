"use client";

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CoordinatorLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    // Página mantida por compatibilidade: encaminha para o login único.
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
