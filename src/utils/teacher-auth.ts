import { findTeacherByLogin } from "@/utils/teachers";
import { getTeacherProjectIds } from "@/utils/teachers";
import { getActiveProjectId } from "@/utils/projects";

const TEACHER_SESSION_KEY = "ecobuzios_teacher_session"; // stores { teacherId, projectId? }

type TeacherSession = {
  teacherId: string;
  projectId?: string;
};

export type TeacherLoginResult =
  | { ok: true; teacherId: string; projectIds: string[]; projectId?: string }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getTeacherSession(): TeacherSession | null {
  const raw = localStorage.getItem(TEACHER_SESSION_KEY);
  if (!raw) return null;

  // Legacy: it used to store only teacherId
  if (!raw.trim().startsWith("{")) {
    const teacherId = raw;
    const projectIds = getTeacherProjectIds(teacherId);

    // If teacher has multiple projects, force selection on next access.
    const migrated: TeacherSession =
      projectIds.length === 1 ? { teacherId, projectId: projectIds[0] } : { teacherId };

    localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(migrated));
    return migrated;
  }

  const parsed = safeParse<TeacherSession | null>(raw, null);
  if (!parsed?.teacherId) return null;

  // Normalize empty projectId
  const projectId = (parsed.projectId || "").trim() || undefined;
  return { teacherId: parsed.teacherId, ...(projectId ? { projectId } : {}) };
}

export function getTeacherSessionTeacherId(): string | null {
  return getTeacherSession()?.teacherId || null;
}

export function getTeacherSessionProjectId(): string | null {
  return getTeacherSession()?.projectId || null;
}

export function setTeacherSessionProjectId(projectId: string) {
  const cur = getTeacherSession();
  if (!cur) return;
  const next: TeacherSession = { ...cur, projectId };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(next));
}

export function clearTeacherSessionProjectId() {
  const cur = getTeacherSession();
  if (!cur) return;
  const next: TeacherSession = { teacherId: cur.teacherId };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(next));
}

export function isTeacherLoggedIn() {
  return Boolean(getTeacherSessionTeacherId());
}

export function loginTeacher(input: { login: string; password: string }): TeacherLoginResult {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  const teacher = findTeacherByLogin(login);
  if (!teacher) return { ok: false, reason: "invalid_credentials" };

  const ok = password === String(teacher.authPassword || "").trim();
  if (!ok) return { ok: false, reason: "invalid_credentials" };

  const projectIds = getTeacherProjectIds(teacher.id);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  // If only one project, set it immediately. If multiple, require selection.
  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: TeacherSession = projectId ? { teacherId: teacher.id, projectId } : { teacherId: teacher.id };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(session));

  return { ok: true, teacherId: teacher.id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutTeacher() {
  localStorage.removeItem(TEACHER_SESSION_KEY);
}