import { Project } from "@/types/project";

export type ThemeVars = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
};

const DEFAULT_THEME: ThemeVars = {
  background: "40 30% 96%",
  foreground: "187 100% 15%",
  card: "0 0% 100%",
  cardForeground: "187 100% 15%",
  popover: "0 0% 100%",
  popoverForeground: "187 100% 15%",
  primary: "187 100% 31%",
  primaryForeground: "0 0% 100%",
  secondary: "34 100% 60%",
  secondaryForeground: "187 100% 10%",
  muted: "187 20% 90%",
  mutedForeground: "187 20% 40%",
  accent: "34 100% 92%",
  accentForeground: "34 100% 30%",
  border: "187 20% 85%",
  input: "187 20% 85%",
  ring: "187 100% 31%",
};

const THEME_CACHE_PREFIX = "ecobuzios_project_theme:";

type Hsl = { h: number; s: number; l: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslString(hsl: Hsl) {
  return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
}

function isImageUrl(url?: string) {
  if (!url) return false;
  return (
    url.startsWith("data:image/png") ||
    url.startsWith("data:image/jpeg") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

async function averageColorFromImage(url: string): Promise<{ r: number; g: number; b: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      const size = 48;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 32) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      if (count === 0) return resolve(null);
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function themeFromBaseHsl(base: Hsl): ThemeVars {
  // Keep contrast readable and avoid extremes.
  const primary: Hsl = {
    h: base.h,
    s: clamp(Math.max(base.s, 55), 45, 100),
    l: clamp(base.l, 28, 42),
  };

  const secondary: Hsl = {
    h: (primary.h + 38) % 360,
    s: clamp(primary.s + 25, 60, 100),
    l: clamp(primary.l + 20, 52, 70),
  };

  const background: Hsl = {
    h: primary.h,
    s: clamp(Math.round(primary.s * 0.28), 18, 40),
    l: 96,
  };

  const foreground: Hsl = {
    h: primary.h,
    s: clamp(primary.s, 60, 100),
    l: 14,
  };

  const muted: Hsl = { h: primary.h, s: 20, l: 92 };
  const mutedFg: Hsl = { h: primary.h, s: 22, l: 38 };
  const border: Hsl = { h: primary.h, s: 22, l: 86 };
  const accent: Hsl = { h: secondary.h, s: clamp(secondary.s, 70, 100), l: 92 };
  const accentFg: Hsl = { h: secondary.h, s: clamp(secondary.s, 70, 100), l: 30 };

  return {
    background: hslString(background),
    foreground: hslString(foreground),
    card: "0 0% 100%",
    cardForeground: hslString(foreground),
    popover: "0 0% 100%",
    popoverForeground: hslString(foreground),
    primary: hslString(primary),
    primaryForeground: "0 0% 100%",
    secondary: hslString(secondary),
    secondaryForeground: hslString(foreground),
    muted: hslString(muted),
    mutedForeground: hslString(mutedFg),
    accent: hslString(accent),
    accentForeground: hslString(accentFg),
    border: hslString(border),
    input: hslString(border),
    ring: hslString(primary),
  };
}

export function applyTheme(vars: ThemeVars) {
  const root = document.documentElement;

  root.style.setProperty("--background", vars.background);
  root.style.setProperty("--foreground", vars.foreground);
  root.style.setProperty("--card", vars.card);
  root.style.setProperty("--card-foreground", vars.cardForeground);
  root.style.setProperty("--popover", vars.popover);
  root.style.setProperty("--popover-foreground", vars.popoverForeground);
  root.style.setProperty("--primary", vars.primary);
  root.style.setProperty("--primary-foreground", vars.primaryForeground);
  root.style.setProperty("--secondary", vars.secondary);
  root.style.setProperty("--secondary-foreground", vars.secondaryForeground);
  root.style.setProperty("--muted", vars.muted);
  root.style.setProperty("--muted-foreground", vars.mutedForeground);
  root.style.setProperty("--accent", vars.accent);
  root.style.setProperty("--accent-foreground", vars.accentForeground);
  root.style.setProperty("--border", vars.border);
  root.style.setProperty("--input", vars.input);
  root.style.setProperty("--ring", vars.ring);
}

export function resetThemeToDefault() {
  applyTheme(DEFAULT_THEME);
}

export async function getProjectTheme(project: Project | null): Promise<ThemeVars> {
  if (!project || !project.imageUrl || !isImageUrl(project.imageUrl)) return DEFAULT_THEME;

  const cacheKey = `${THEME_CACHE_PREFIX}${project.id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as ThemeVars;
    } catch {
      // ignore
    }
  }

  const avg = await averageColorFromImage(project.imageUrl);
  const vars = avg ? themeFromBaseHsl(rgbToHsl(avg.r, avg.g, avg.b)) : DEFAULT_THEME;

  localStorage.setItem(cacheKey, JSON.stringify(vars));
  return vars;
}

export function invalidateProjectTheme(projectId: string) {
  localStorage.removeItem(`${THEME_CACHE_PREFIX}${projectId}`);
}
