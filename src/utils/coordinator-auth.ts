import { findCoordinatorByLogin, getCoordinatorProjectIds } from "@/utils/coordinators";
import { getActiveProjectId } from "@/utils/projects";

const COORDINATOR_SESSION_KEY = "ecobuzios_coordinator_session"; // stores { coordinatorId, projectId? }

type CoordinatorSession = {
  coordinatorId: string;
  projectId?: string;
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
  return { coordinatorId: parsed.coordinatorId, ...(projectId ? { projectId } : {}) };
}

export function getCoordinatorSessionCoordinatorId(): string | null {
  return getCoordinatorSession()?.coordinatorId || null;
}

export function getCoordinatorSessionProjectId(): string | null {
  return getCoordinatorSession()?.projectId || null;
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
  const next: CoordinatorSession = { coordinatorId: cur.coordinatorId };
  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(next));
}

export function isCoordinatorLoggedIn() {
  return Boolean(getCoordinatorSessionCoordinatorId());
}

export function loginCoordinator(input: { login: string; password: string }): CoordinatorLoginResult {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  const coord = findCoordinatorByLogin(login);
  if (!coord) return { ok: false, reason: "invalid_credentials" };

  const ok = password === String(coord.authPassword || "").trim();
  if (!ok) return { ok: false, reason: "invalid_credentials" };

  const projectIds = getCoordinatorProjectIds(coord.id);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: CoordinatorSession = projectId
    ? { coordinatorId: coord.id, projectId }
    : { coordinatorId: coord.id };

  localStorage.setItem(COORDINATOR_SESSION_KEY, JSON.stringify(session));
  return { ok: true, coordinatorId: coord.id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutCoordinator() {
  localStorage.removeItem(COORDINATOR_SESSION_KEY);
}