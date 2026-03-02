import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const COORDINATOR_SESSION_KEY = "ecobuzios_coordinator_session"; // stores { coordinatorId, projectId? }

type CoordinatorSession = {
  coordinatorId: string;
  projectId?: string;
  projectIds?: string[];
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
  return {
    coordinatorId: parsed.coordinatorId,
    ...(projectId ? { projectId } : {}),
    ...(projectIds ? { projectIds } : {}),
  };
}

export function getCoordinatorSessionCoordinatorId(): string | null {
  return getCoordinatorSession()?.coordinatorId || null;
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
  };
  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(next));
}

export function isCoordinatorLoggedIn() {
  return Boolean(getCoordinatorSessionCoordinatorId());
}

export async function loginCoordinator(input: { login: string; password: string }): Promise<CoordinatorLoginResult> {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  if (!login || !password) return { ok: false, reason: "invalid_credentials" };

  const { data: coord, error } = await supabase
    .from("coordinators")
    .select("id")
    .eq("auth_login", login)
    .eq("auth_password", password)
    .maybeSingle();

  if (error || !coord?.id) return { ok: false, reason: "invalid_credentials" };

  const { data: rows } = await supabase
    .from("coordinator_project_assignments")
    .select("project_id")
    .eq("coordinator_id", coord.id);

  const projectIds = Array.from(new Set((rows || []).map((r: any) => String(r.project_id)))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: CoordinatorSession = projectId
    ? { coordinatorId: coord.id, projectId, projectIds }
    : { coordinatorId: coord.id, projectIds };

  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(session));
  return { ok: true, coordinatorId: coord.id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutCoordinator() {
  localStorage.removeItem(COORDINATOR_SESSION_KEY);
}