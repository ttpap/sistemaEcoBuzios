"use client";

import React, { useEffect } from "react";
import { getActiveProject } from "@/utils/projects";
import { applyTheme, getProjectTheme, resetThemeToDefault } from "@/utils/theme";

export default function ProjectTheme() {
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      const project = getActiveProject();
      if (!project) {
        resetThemeToDefault();
        return;
      }

      const theme = await getProjectTheme(project);
      if (cancelled) return;
      applyTheme(theme);
    };

    apply();

    const onStorage = () => apply();
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
