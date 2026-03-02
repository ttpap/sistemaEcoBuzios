import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const TEACHER_SESSION_KEY = "ecobuzios_teacher_session"; // stores { teacherId, projectId? }

type TeacherSession = {
  teacherId: string;
  projectId?: string;
  projectIds?: string[];
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
  return { teacherId: parsed.teacherId, ...(projectId ? { projectId } : {}), ...(projectIds ? { projectIds } : {}) };
}

export function getTeacherSessionTeacherId(): string | null {
  return getTeacherSession()?.teacherId || null;
}

export function getTeacherSessionProjectId(): string | null {
  return getTeacherSession()?.projectId || null;
}

export function getTeacherSessionProjectIds(): string[] {
  return getTeacherSession()?.projectIds || [];
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
  const next: TeacherSession = { teacherId: cur.teacherId, ...(cur.projectIds ? { projectIds: cur.projectIds } : {}) };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(next));
}

export function isTeacherLoggedIn() {
  return Boolean(getTeacherSessionTeacherId());
}

export async function loginTeacher(input: { login: string; password: string }): Promise<TeacherLoginResult> {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();

  if (!login || !password) return { ok: false, reason: "invalid_credentials" };

  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("auth_login", login)
    .eq("auth_password", password)
    .maybeSingle();

  if (error || !teacher?.id) return { ok: false, reason: "invalid_credentials" };

  const { data: rows } = await supabase
    .from("teacher_project_assignments")
    .select("project_id")
    .eq("teacher_id", teacher.id);

  const projectIds = Array.from(new Set((rows || []).map((r: any) => String(r.project_id)))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: TeacherSession = projectId
    ? { teacherId: teacher.id, projectId, projectIds }
    : { teacherId: teacher.id, projectIds };

  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(session));
  return { ok: true, teacherId: teacher.id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutTeacher() {
  localStorage.removeItem(TEACHER_SESSION_KEY);
}