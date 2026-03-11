export type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
};

const KEY = "ecobuzios_supabase_runtime_config";

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SupabaseRuntimeConfig>;
    const url = String(parsed.url || "").trim();
    const anonKey = String(parsed.anonKey || "").trim();
    if (!url || !anonKey) return null;
    return { url, anonKey };
  } catch {
    return null;
  }
}

export function setSupabaseRuntimeConfig(cfg: SupabaseRuntimeConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify({ url: cfg.url.trim(), anonKey: cfg.anonKey.trim() }));
}

export function clearSupabaseRuntimeConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
