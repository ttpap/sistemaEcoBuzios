import { supabase } from "@/integrations/supabase/client";

const PHOTOGRAPHER_SESSION_KEY = "ecobuzios_photographer_session";
const PHOTOGRAPHER_PASSWORD_KEY = "ecobuzios_photographer_password";

type PhotographerSession = {
  photographerId: string;
  fullName?: string;
  login?: string;
  projectIds?: string[];
};

export type PhotographerLoginResult =
  | { ok: true; photographerId: string; fullName: string; projectIds: string[] }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getPhotographerSession(): PhotographerSession | null {
  const raw = localStorage.getItem(PHOTOGRAPHER_SESSION_KEY);
  if (!raw) return null;
  const parsed = safeParse<PhotographerSession | null>(raw, null);
  if (!parsed?.photographerId) return null;
  return parsed;
}

export function getPhotographerSessionId(): string | null {
  return getPhotographerSession()?.photographerId || null;
}

export function getPhotographerSessionLogin(): string | null {
  return getPhotographerSession()?.login || null;
}

export function getPhotographerSessionPassword(): string | null {
  return sessionStorage.getItem(PHOTOGRAPHER_PASSWORD_KEY) || localStorage.getItem(PHOTOGRAPHER_PASSWORD_KEY);
}

export function setPhotographerSessionPassword(password: string) {
  sessionStorage.setItem(PHOTOGRAPHER_PASSWORD_KEY, password);
  localStorage.setItem(PHOTOGRAPHER_PASSWORD_KEY, password);
}

export function isPhotographerLoggedIn(): boolean {
  return Boolean(getPhotographerSessionId());
}

export async function loginPhotographer(input: { login: string; password: string }): Promise<PhotographerLoginResult> {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();
  if (!login || !password) return { ok: false, reason: "invalid_credentials" };

  const { data, error } = await supabase.rpc("mode_b_login_photographer", {
    p_login: login,
    p_password: password,
  });

  if (error || !data || (data as any[]).length === 0) return { ok: false, reason: "invalid_credentials" };

  const row = (data as any[])[0] as { photographer_id: string; full_name: string; project_ids: string[] | null };
  if (!row.photographer_id) return { ok: false, reason: "invalid_credentials" };

  const projectIds = Array.from(new Set((row.project_ids || []).map(String))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  const session: PhotographerSession = {
    photographerId: row.photographer_id,
    fullName: row.full_name,
    login,
    projectIds,
  };
  localStorage.setItem(PHOTOGRAPHER_SESSION_KEY, JSON.stringify(session));
  setPhotographerSessionPassword(password);

  return { ok: true, photographerId: row.photographer_id, fullName: row.full_name, projectIds };
}

export function logoutPhotographer() {
  localStorage.removeItem(PHOTOGRAPHER_SESSION_KEY);
  sessionStorage.removeItem(PHOTOGRAPHER_PASSWORD_KEY);
  localStorage.removeItem(PHOTOGRAPHER_PASSWORD_KEY);
}
