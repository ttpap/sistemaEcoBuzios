"use client";

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Página mantida por compatibilidade: encaminha para o login único,
    // preservando a query string (ex: ?matricula=&senha= do email de boas-vindas).
    navigate(`/login${location.search}`, { replace: true });
  }, [navigate, location.search]);

  return null;
}
