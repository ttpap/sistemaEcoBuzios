import type { CoordinatorRegistration } from "@/types/coordinator";
import {
  getProjects,
  getProjectScopedKey,
  migrateLegacyProjectDataToProjectIfNeeded,
} from "@/utils/projects";

const GLOBAL_COORDINATORS_KEY = "ecobuzios_coordinators_global";
const COORDINATOR_ASSIGNMENTS_KEY = "ecobuzios_coordinator_assignments"; // coordinatorId -> projectIds[]

export const DEFAULT_COORDINATOR_PASSWORD = "EcoBuzios123";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function slugifyLoginPart(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

function randomDigits(n: number) {
  return Math.floor(Math.random() * Math.pow(10, n))
    .toString()
    .padStart(n, "0");
}

export function readGlobalCoordinators(fallback: CoordinatorRegistration[] = []) {
  return safeParse<CoordinatorRegistration[]>(localStorage.getItem(GLOBAL_COORDINATORS_KEY), fallback);
}

export function writeGlobalCoordinators(value: CoordinatorRegistration[]) {
  localStorage.setItem(GLOBAL_COORDINATORS_KEY, JSON.stringify(value));
}

export function getCoordinatorAssignments(): Record<string, string[]> {
  const raw = safeParse<Record<string, unknown>>(localStorage.getItem(COORDINATOR_ASSIGNMENTS_KEY), {});

  let changed = false;
  const normalized: Record<string, string[]> = {};

  for (const [coordId, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      normalized[coordId] = v ? [v] : [];
      changed = true;
      continue;
    }

    if (Array.isArray(v)) {
      const ids = v.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
      normalized[coordId] = Array.from(new Set(ids));
      if (ids.length !== v.length) changed = true;
      continue;
    }

    normalized[coordId] = [];
    changed = true;
  }

  if (changed) setCoordinatorAssignments(normalized);
  return normalized;
}

export function setCoordinatorAssignments(map: Record<string, string[]>) {
  localStorage.setItem(COORDINATOR_ASSIGNMENTS_KEY, JSON.stringify(map));
}

export function getCoordinatorProjectIds(coordinatorId: string): string[] {
  return getCoordinatorAssignments()[coordinatorId] || [];
}

export function createCoordinatorCredentials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = slugifyLoginPart(parts[0] || "coord");
  const last = slugifyLoginPart(parts[parts.length - 1] || "");
  const base = [first, last].filter(Boolean).join(".") || "coord";
  return {
    login: `coord.${base}.${randomDigits(3)}`,
    password: DEFAULT_COORDINATOR_PASSWORD,
  };
}

export function createGlobalCoordinator(
  input: Omit<
    CoordinatorRegistration,
    "id" | "registrationDate" | "status" | "authLogin" | "authPassword"
  >,
) {
  const existing = readGlobalCoordinators([]);
  const creds = createCoordinatorCredentials(input.fullName);

  // Ensure unique login
  let login = creds.login;
  const taken = new Set(existing.map((c) => c.authLogin));
  while (taken.has(login)) {
    login = `coord.${slugifyLoginPart(input.fullName).slice(0, 12) || "user"}.${randomDigits(4)}`;
  }

  const coordinator: CoordinatorRegistration = {
    ...input,
    id: crypto.randomUUID(),
    registrationDate: new Date().toISOString(),
    status: "Ativo",
    authLogin: login,
    authPassword: creds.password,
  };

  writeGlobalCoordinators([coordinator, ...existing]);
  return coordinator;
}

export function updateGlobalCoordinator(id: string, patch: Partial<CoordinatorRegistration>) {
  const existing = readGlobalCoordinators([]);
  const idx = existing.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const current = existing[idx];
  const next: CoordinatorRegistration = { ...current, ...patch, id: current.id };

  const updated = existing.slice();
  updated[idx] = next;
  writeGlobalCoordinators(updated);

  return next;
}

export function resetCoordinatorPasswordToDefault(coordinatorId: string) {
  return updateGlobalCoordinator(coordinatorId, { authPassword: DEFAULT_COORDINATOR_PASSWORD });
}

export function deleteGlobalCoordinator(id: string) {
  const existing = readGlobalCoordinators([]);
  writeGlobalCoordinators(existing.filter((c) => c.id !== id));

  const map = getCoordinatorAssignments();
  if (map[id]) {
    delete map[id];
    setCoordinatorAssignments(map);
  }
}

export function findCoordinatorByLogin(login: string) {
  const norm = login.trim().toLowerCase();
  return (
    readGlobalCoordinators([]).find((c) => (c.authLogin || "").toLowerCase() === norm) || null
  );
}

export function addCoordinatorToProject(coordinatorId: string, projectId: string) {
  const coord = readGlobalCoordinators([]).find((c) => c.id === coordinatorId);
  if (!coord) return { ok: false as const, reason: "coordinator_not_found" as const };

  // Guard: só roda migração legacy uma vez (evita contaminar novos projetos com dados antigos)
  const LEGACY_FLAG = "ecobuzios_legacy_data_migrated_v1";
  if (!localStorage.getItem(LEGACY_FLAG)) {
    migrateLegacyProjectDataToProjectIfNeeded(projectId);
    localStorage.setItem(LEGACY_FLAG, "1");
  }

  const map = getCoordinatorAssignments();
  const current = map[coordinatorId] || [];
  const nextIds = Array.from(new Set([...(current || []), projectId]));
  map[coordinatorId] = nextIds;
  setCoordinatorAssignments(map);

  return { ok: true as const, coordinator: coord };
}

export function removeCoordinatorFromProject(coordinatorId: string, projectId: string) {
  const map = getCoordinatorAssignments();
  const current = map[coordinatorId] || [];
  map[coordinatorId] = current.filter((id) => id !== projectId);
  setCoordinatorAssignments(map);

  return { ok: true as const };
}

/**
 * Migration: if there are existing per-project teacher lists, coordinators are separate.
 * This is left as a placeholder for future migrations.
 */
export function migrateScopedCoordinatorsToGlobalIfNeeded() {
  // no-op for now
  // (keeping the pattern consistent with teachers)
  void getProjects();
}
