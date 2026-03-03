import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const TEACHER_SESSION_KEY = "ecobuzios_teacher_session"; // stores { teacherId, projectId? }
const TEACHER_PASSWORD_KEY = "ecobuzios_teacher_password";

type TeacherSession = {
  teacherId: string;
  projectId?: string;
  projectIds?: string[];
  login?: string;
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

  const parsed = safeParse<TeacherSession | null>(raw, null);
  if (!parsed?.teacherId) return null;

  const projectId = (parsed.projectId || "").trim() || undefined;
  const projectIds = Array.isArray(parsed.projectIds) ? parsed.projectIds : undefined;
  const login = (parsed.login || "").trim() || undefined;
  return {
    teacherId: parsed.teacherId,
    ...(projectId ? { projectId } : {}),
    ...(projectIds ? { projectIds } : {}),
    ...(login ? { login } : {}),
  };
}

export function getTeacherSessionTeacherId(): string | null {
  return getTeacherSession()?.teacherId || null;
}

export function getTeacherSessionLogin(): string | null {
  return getTeacherSession()?.login || null;
}

export function getTeacherSessionProjectId(): string | null {
  return getTeacherSession()?.projectId || null;
}

export function getTeacherSessionProjectIds(): string[] {
  return getTeacherSession()?.projectIds || [];
}

export function getTeacherSessionPassword(): string | null {
  return sessionStorage.getItem(TEACHER_PASSWORD_KEY);
}

export function setTeacherSessionPassword(password: string) {
  sessionStorage.setItem(TEACHER_PASSWORD_KEY, password);
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
  const next: TeacherSession = {
    teacherId: cur.teacherId,
    ...(cur.projectIds ? { projectIds: cur.projectIds } : {}),
    ...(cur.login ? { login: cur.login } : {}),
  };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(next));
}

export function isTeacherLoggedIn() {
  return Boolean(getTeacherSessionTeacherId());
}

type StaffLoginRow = { role: string; person_id: string; project_ids: string[] | null };

export async function loginTeacher(input: { login: string; password: string }): Promise<TeacherLoginResult> {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  if (!login || !password) return { ok: false, reason: "invalid_credentials" };

  const { data, error } = await supabase.rpc("mode_b_login_staff", {
    p_login: login,
    p_password: password,
  });

  if (error || !data || (data as any[]).length === 0) return { ok: false, reason: "invalid_credentials" };

  const row = (data as any[])[0] as StaffLoginRow;
  if (row.role !== "teacher" || !row.person_id) return { ok: false, reason: "invalid_credentials" };

  const projectIds = Array.from(new Set((row.project_ids || []).map(String))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: TeacherSession = projectId
    ? { teacherId: row.person_id, projectId, projectIds, login }
    : { teacherId: row.person_id, projectIds, login };

  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(session));
  return { ok: true, teacherId: row.person_id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutTeacher() {
  localStorage.removeItem(TEACHER_SESSION_KEY);
  sessionStorage.removeItem(TEACHER_PASSWORD_KEY);
}