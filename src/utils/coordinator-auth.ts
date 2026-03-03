import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const COORDINATOR_SESSION_KEY = "ecobuzios_coordinator_session"; // stores { coordinatorId, projectId? }
const COORDINATOR_PASSWORD_KEY = "ecobuzios_coordinator_password";

type CoordinatorSession = {
  coordinatorId: string;
  projectId?: string;
  projectIds?: string[];
  login?: string;
};

export type CoordinatorLoginResult =
  | { ok: true; coordinatorId: string; projectIds: string[]; projectId?: string }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCoordinatorSession(): CoordinatorSession | null {
  const raw = localStorage.getItem(COORDINATOR_SESSION_KEY);
  if (!raw) return null;

  const parsed = safeParse<CoordinatorSession | null>(raw, null);
  if (!parsed?.coordinatorId) return null;

  const projectId = (parsed.projectId || "").trim() || undefined;
  const projectIds = Array.isArray(parsed.projectIds) ? parsed.projectIds : undefined;
  const login = (parsed.login || "").trim() || undefined;
  return {
    coordinatorId: parsed.coordinatorId,
    ...(projectId ? { projectId } : {}),
    ...(projectIds ? { projectIds } : {}),
    ...(login ? { login } : {}),
  };
}

export function getCoordinatorSessionCoordinatorId(): string | null {
  return getCoordinatorSession()?.coordinatorId || null;
}

export function getCoordinatorSessionLogin(): string | null {
  return getCoordinatorSession()?.login || null;
}

export function getCoordinatorSessionProjectId(): string | null {
  return getCoordinatorSession()?.projectId || null;
}

export function getCoordinatorSessionProjectIds(): string[] {
  return getCoordinatorSession()?.projectIds || [];
}

export function setCoordinatorSessionProjectId(projectId: string) {
  const cur = getCoordinatorSession();
  if (!cur) return;
  const next: CoordinatorSession = { ...cur, projectId };
  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(next));
}

export function clearCoordinatorSessionProjectId() {
  const cur = getCoordinatorSession();
  if (!cur) return;
  const next: CoordinatorSession = {
    coordinatorId: cur.coordinatorId,
    ...(cur.projectIds ? { projectIds: cur.projectIds } : {}),
    ...(cur.login ? { login: cur.login } : {}),
  };
  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(next));
}

export function isCoordinatorLoggedIn() {
  return Boolean(getCoordinatorSessionCoordinatorId());
}

export function getCoordinatorSessionPassword(): string | null {
  return sessionStorage.getItem(COORDINATOR_PASSWORD_KEY);
}

export function setCoordinatorSessionPassword(password: string) {
  sessionStorage.setItem(COORDINATOR_PASSWORD_KEY, password);
}

type StaffLoginRow = { role: string; person_id: string; project_ids: string[] | null };

export async function loginCoordinator(input: { login: string; password: string }): Promise<CoordinatorLoginResult> {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  if (!login || !password) return { ok: false, reason: "invalid_credentials" };

  const { data, error } = await supabase.rpc("mode_b_login_staff", {
    p_login: login,
    p_password: password,
  });

  if (error || !data || (data as any[]).length === 0) return { ok: false, reason: "invalid_credentials" };

  const row = (data as any[])[0] as StaffLoginRow;
  if (row.role !== "coordinator" || !row.person_id) return { ok: false, reason: "invalid_credentials" };

  const projectIds = Array.from(new Set((row.project_ids || []).map(String))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: CoordinatorSession = projectId
    ? { coordinatorId: row.person_id, projectId, projectIds, login }
    : { coordinatorId: row.person_id, projectIds, login };

  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(session));
  return { ok: true, coordinatorId: row.person_id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutCoordinator() {
  localStorage.removeItem(COORDINATOR_SESSION_KEY);
  sessionStorage.removeItem(COORDINATOR_PASSWORD_KEY);
}