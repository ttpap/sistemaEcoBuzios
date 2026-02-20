import { TeacherRegistration } from "@/types/teacher";
import { getProjects, getProjectScopedKey, migrateLegacyProjectDataToProjectIfNeeded } from "@/utils/projects";

const GLOBAL_TEACHERS_KEY = "ecobuzios_teachers_global";
const TEACHER_ASSIGNMENTS_KEY = "ecobuzios_teacher_assignments"; // teacherId -> projectIds[]

export const DEFAULT_TEACHER_PASSWORD = "EcoBuzios123";

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

export function readGlobalTeachers(fallback: TeacherRegistration[] = []) {
  return safeParse<TeacherRegistration[]>(localStorage.getItem(GLOBAL_TEACHERS_KEY), fallback);
}

export function writeGlobalTeachers(value: TeacherRegistration[]) {
  localStorage.setItem(GLOBAL_TEACHERS_KEY, JSON.stringify(value));
}

export function getTeacherAssignments(): Record<string, string[]> {
  const raw = safeParse<Record<string, unknown>>(localStorage.getItem(TEACHER_ASSIGNMENTS_KEY), {});

  let changed = false;
  const normalized: Record<string, string[]> = {};

  for (const [teacherId, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      normalized[teacherId] = v ? [v] : [];
      changed = true;
      continue;
    }

    if (Array.isArray(v)) {
      const ids = v.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
      normalized[teacherId] = Array.from(new Set(ids));
      if (ids.length !== v.length) changed = true;
      continue;
    }

    normalized[teacherId] = [];
    changed = true;
  }

  if (changed) setTeacherAssignments(normalized);
  return normalized;
}

export function setTeacherAssignments(map: Record<string, string[]>) {
  localStorage.setItem(TEACHER_ASSIGNMENTS_KEY, JSON.stringify(map));
}

/** Returns all project IDs the teacher is assigned to. */
export function getTeacherProjectIds(teacherId: string): string[] {
  return getTeacherAssignments()[teacherId] || [];
}

/** Returns the first assigned project ID (kept for legacy callers). */
export function getTeacherProjectId(teacherId: string): string | null {
  return getTeacherProjectIds(teacherId)[0] || null;
}

export function createTeacherCredentials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = slugifyLoginPart(parts[0] || "prof");
  const last = slugifyLoginPart(parts[parts.length - 1] || "");
  const base = [first, last].filter(Boolean).join(".") || "prof";
  return {
    login: `prof.${base}.${randomDigits(3)}`,
    password: DEFAULT_TEACHER_PASSWORD,
  };
}

export function createGlobalTeacher(input: Omit<TeacherRegistration, "id" | "registrationDate" | "status" | "authLogin" | "authPassword">) {
  const existing = readGlobalTeachers([]);

  const creds = createTeacherCredentials(input.fullName);

  // Ensure unique login
  let login = creds.login;
  const taken = new Set(existing.map((t) => t.authLogin));
  while (taken.has(login)) {
    login = `prof.${slugifyLoginPart(input.fullName).slice(0, 12) || "user"}.${randomDigits(4)}`;
  }

  const teacher: TeacherRegistration = {
    ...input,
    id: crypto.randomUUID(),
    registrationDate: new Date().toISOString(),
    status: "Ativo",
    authLogin: login,
    authPassword: creds.password,
  };

  writeGlobalTeachers([teacher, ...existing]);
  return teacher;
}

export function updateGlobalTeacher(id: string, patch: Partial<TeacherRegistration>) {
  const existing = readGlobalTeachers([]);
  const idx = existing.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const current = existing[idx];
  const next: TeacherRegistration = { ...current, ...patch, id: current.id };

  const updated = existing.slice();
  updated[idx] = next;
  writeGlobalTeachers(updated);

  return next;
}

export function deleteGlobalTeacher(id: string) {
  const existing = readGlobalTeachers([]);
  writeGlobalTeachers(existing.filter((t) => t.id !== id));

  const map = getTeacherAssignments();
  if (map[id]) {
    delete map[id];
    setTeacherAssignments(map);
  }
}

export function findTeacherByLogin(login: string) {
  const norm = login.trim().toLowerCase();
  return readGlobalTeachers([]).find((t) => (t.authLogin || "").toLowerCase() === norm) || null;
}

function ensureTeacherInProjectScopedList(projectId: string, teacher: TeacherRegistration) {
  const key = getProjectScopedKey(projectId, "teachers");
  const list = safeParse<TeacherRegistration[]>(localStorage.getItem(key), []);
  const exists = list.some((t) => t.id === teacher.id);
  if (exists) return;

  const minimal: TeacherRegistration = { ...teacher };
  localStorage.setItem(key, JSON.stringify([minimal, ...list]));
}

function removeTeacherFromProjectScopedList(projectId: string, teacherId: string) {
  const key = getProjectScopedKey(projectId, "teachers");
  const list = safeParse<TeacherRegistration[]>(localStorage.getItem(key), []);
  const next = list.filter((t) => t.id !== teacherId);
  localStorage.setItem(key, JSON.stringify(next));
}

function removeTeacherFromAllClassesInProject(projectId: string, teacherId: string) {
  const key = getProjectScopedKey(projectId, "classes");
  const classes = safeParse<any[]>(localStorage.getItem(key), []);
  const next = classes.map((c) => ({
    ...c,
    teacherIds: Array.isArray(c.teacherIds) ? c.teacherIds.filter((id: string) => id !== teacherId) : c.teacherIds,
  }));
  localStorage.setItem(key, JSON.stringify(next));
}

export function assignTeacherToProject(teacherId: string, projectId: string) {
  // Backwards-compatible: "assign" now means "add to project" (teacher can be in multiple projects).
  return addTeacherToProject(teacherId, projectId);
}

export function addTeacherToProject(teacherId: string, projectId: string) {
  const teacher = readGlobalTeachers([]).find((t) => t.id === teacherId);
  if (!teacher) return { ok: false as const, reason: "teacher_not_found" as const };

  migrateLegacyProjectDataToProjectIfNeeded(projectId);

  const map = getTeacherAssignments();
  const current = map[teacherId] || [];
  const nextIds = Array.from(new Set([...(current || []), projectId]));
  map[teacherId] = nextIds;
  setTeacherAssignments(map);

  ensureTeacherInProjectScopedList(projectId, teacher);

  return { ok: true as const, teacher };
}

export function removeTeacherFromProject(teacherId: string, projectId: string) {
  const map = getTeacherAssignments();
  const current = map[teacherId] || [];
  const nextIds = current.filter((id) => id !== projectId);
  map[teacherId] = nextIds;
  setTeacherAssignments(map);

  removeTeacherFromProjectScopedList(projectId, teacherId);
  removeTeacherFromAllClassesInProject(projectId, teacherId);

  return { ok: true as const };
}

/**
 * Migration: if there are existing per-project teacher lists, bring them into global storage
 * and mark them assigned to that project.
 */
export function migrateScopedTeachersToGlobalIfNeeded() {
  const existingGlobal = readGlobalTeachers([]);
  const byId = new Map(existingGlobal.map((t) => [t.id, t]));
  const assignments = getTeacherAssignments();

  for (const p of getProjects()) {
    const key = getProjectScopedKey(p.id, "teachers");
    const scoped = safeParse<TeacherRegistration[]>(localStorage.getItem(key), []);
    if (scoped.length === 0) continue;

    for (const t of scoped) {
      if (!byId.has(t.id)) {
        // If older teacher doesn't have auth, generate.
        const creds = createTeacherCredentials(t.fullName || "Professor");
        byId.set(t.id, {
          ...t,
          authLogin: (t as any).authLogin || creds.login,
          authPassword: (t as any).authPassword || creds.password,
        });
      }
      const current = assignments[t.id] || [];
      if (!current.includes(p.id)) assignments[t.id] = [...current, p.id];
    }
  }

  writeGlobalTeachers(Array.from(byId.values()));
  setTeacherAssignments(assignments);
}