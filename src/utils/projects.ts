import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";

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

// Synchronous getter used across the app (local cache).
export function getProjects(): Project[] {
  return safeParse<Project[]>(localStorage.getItem(PROJECTS_KEY), []);
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function fetchProjects(): Promise<Project[]> {
  if (!supabase) return getProjects();

  const { data, error } = await supabase
    .from("projects")
    .select("id,name,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return getProjects();

  const projects = data.map((p: any) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.image_url ?? undefined,
    createdAt: p.created_at,
  })) as Project[];

  saveProjects(projects);
  return projects;
}

export async function createProject(input: { name: string; imageUrl?: string }) {
  const next: Project = {
    id: makeId(),
    name: input.name.trim(),
    imageUrl: (input.imageUrl || "").trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        id: next.id,
        name: next.name,
        image_url: next.imageUrl ?? null,
      })
      .select("id,name,image_url,created_at")
      .single();

    if (!error && data) {
      const p: Project = {
        id: data.id,
        name: data.name,
        imageUrl: data.image_url ?? undefined,
        createdAt: data.created_at,
      };

      const current = getProjects();
      saveProjects([p, ...current.filter((x) => x.id !== p.id)]);
      setActiveProjectId(p.id);
      return p;
    }
  }

  const projects = getProjects();
  const updated = [next, ...projects];
  saveProjects(updated);
  setActiveProjectId(next.id);
  return next;
}

export async function updateProject(projectId: string, patch: { name?: string; imageUrl?: string | null }) {
  const name = patch.name !== undefined ? patch.name.trim() : undefined;
  const imageUrl =
    patch.imageUrl === undefined ? undefined : patch.imageUrl === null ? null : patch.imageUrl.trim() || null;

  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .update({
        ...(name !== undefined ? { name } : null),
        ...(patch.imageUrl !== undefined ? { image_url: imageUrl } : null),
      })
      .eq("id", projectId)
      .select("id,name,image_url,created_at")
      .single();

    if (!error && data) {
      const updated: Project = {
        id: data.id,
        name: data.name,
        imageUrl: data.image_url ?? undefined,
        createdAt: data.created_at,
      };

      const current = getProjects();
      saveProjects(current.map((p) => (p.id === projectId ? updated : p)));
      return updated;
    }
  }

  const projects = getProjects();
  const current = projects.find((p) => p.id === projectId);
  if (!current) return null;

  const next: Project = {
    ...current,
    name: name !== undefined ? name : current.name,
    imageUrl:
      patch.imageUrl === undefined
        ? current.imageUrl
        : patch.imageUrl === null
          ? undefined
          : patch.imageUrl.trim() || undefined,
  };

  saveProjects(projects.map((p) => (p.id === projectId ? next : p)));
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