import { Project } from "@/types/project";

const PROJECTS_KEY = "ecobuzios_projects";
const ACTIVE_PROJECT_KEY = "ecobuzios_active_project";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function makeId() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getProjects(): Project[] {
  return safeParse<Project[]>(localStorage.getItem(PROJECTS_KEY), []);
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function createProject(input: { name: string; imageUrl?: string }) {
  const projects = getProjects();
  const next: Project = {
    id: makeId(),
    name: input.name.trim(),
    imageUrl: (input.imageUrl || "").trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const updated = [next, ...projects];
  saveProjects(updated);
  setActiveProjectId(next.id);
  return next;
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(projectId: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
}

export function clearActiveProjectId() {
  localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

export function getActiveProject(): Project | null {
  const id = getActiveProjectId();
  if (!id) return null;
  return getProjects().find((p) => p.id === id) || null;
}

export function getProjectScopedKey(projectId: string, baseKey: string) {
  return `ecobuzios:${projectId}:${baseKey}`;
}

export function getScopedStorageKey(baseKey: "classes" | "teachers" | "attendance") {
  const active = getActiveProjectId();
  if (!active) return null;
  return getProjectScopedKey(active, baseKey);
}

/**
 * Students are global across the system.
 * This migrates legacy student storage into the global key (if needed).
 */
export function migrateLegacyStudentsToGlobalIfNeeded() {
  const globalKey = "ecobuzios_students";
  const existing = localStorage.getItem(globalKey);
  if (existing) return;

  // legacy key is the same; this is mainly future-proof.
  const legacy = localStorage.getItem("ecobuzios_students");
  if (legacy) localStorage.setItem(globalKey, legacy);
}

/**
 * One-time migration for users who already have data in legacy keys.
 * Classes/teachers/attendance become project-scoped.
 */
export function migrateLegacyProjectDataToProjectIfNeeded(projectId: string) {
  const pairs: Array<{ baseKey: "classes" | "teachers" | "attendance"; legacyKey: string }> = [
    { baseKey: "classes", legacyKey: "ecobuzios_classes" },
    { baseKey: "teachers", legacyKey: "ecobuzios_teachers" },
    { baseKey: "attendance", legacyKey: "ecobuzios_attendance" },
  ];

  for (const p of pairs) {
    const scopedKey = getProjectScopedKey(projectId, p.baseKey);
    const scopedExists = localStorage.getItem(scopedKey);
    if (scopedExists) continue;

    const legacy = localStorage.getItem(p.legacyKey);
    if (!legacy) continue;

    localStorage.setItem(scopedKey, legacy);
  }
}