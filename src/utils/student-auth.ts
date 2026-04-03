import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const STUDENT_SESSION_KEY = "ecobuzios_student_session"; // stores { studentId, projectId? }
const STUDENT_PASSWORD_KEY = "ecobuzios_student_password";

export const DEFAULT_STUDENT_PASSWORD = "EcoBuzios123";

export function getStudentSessionPassword(): string | null {
  return sessionStorage.getItem(STUDENT_PASSWORD_KEY) || localStorage.getItem(STUDENT_PASSWORD_KEY);
}

export function setStudentSessionPassword(password: string) {
  sessionStorage.setItem(STUDENT_PASSWORD_KEY, password);
}

export function getStudentLoginFromRegistration(registration: string) {
  const reg = (registration || "").trim();
  const last = reg.includes("-") ? reg.split("-").pop() || "" : reg;
  return last.trim().padStart(4, "0");
}

type StudentSession = {
  studentId: string;
  projectId?: string;
  projectIds?: string[];
  login?: string;
};

export type StudentLoginResult =
  | { ok: true; studentId: string; projectIds: string[]; projectId?: string }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" | "ambiguous_login" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getStudentSession(): StudentSession | null {
  const raw = localStorage.getItem(STUDENT_SESSION_KEY);
  if (!raw) return null;

  const parsed = safeParse<StudentSession | null>(raw, null);
  if (!parsed?.studentId) return null;

  const projectId = (parsed.projectId || "").trim() || undefined;
  const projectIds = Array.isArray(parsed.projectIds) ? parsed.projectIds : undefined;
  const login = (parsed.login || "").trim() || undefined;
  return {
    studentId: parsed.studentId,
    ...(projectId ? { projectId } : {}),
    ...(projectIds ? { projectIds } : {}),
    ...(login ? { login } : {}),
  };
}

export function getStudentSessionStudentId(): string | null {
  return getStudentSession()?.studentId || null;
}

export function getStudentSessionLogin(): string | null {
  return getStudentSession()?.login || null;
}

export function getStudentSessionProjectId(): string | null {
  return getStudentSession()?.projectId || null;
}

export function getStudentSessionProjectIds(): string[] {
  return getStudentSession()?.projectIds || [];
}

export function setStudentSessionProjectId(projectId: string) {
  const cur = getStudentSession();
  if (!cur) return;
  const next: StudentSession = { ...cur, projectId };
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(next));
}

export function clearStudentSessionProjectId() {
  const cur = getStudentSession();
  if (!cur) return;
  const next: StudentSession = {
    studentId: cur.studentId,
    ...(cur.projectIds ? { projectIds: cur.projectIds } : {}),
    ...(cur.login ? { login: cur.login } : {}),
  };
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(next));
}

export function isStudentLoggedIn() {
  return Boolean(getStudentSessionStudentId());
}

type StudentLoginRpcRow = { student_id: string | null; project_ids: string[] | null; reason: string | null };

export async function loginStudent(input: { registration: string; password: string }): Promise<StudentLoginResult> {
  const registration = (input.registration || "").trim();
  const password = (input.password || "").trim();

  const { data, error } = await supabase.rpc("mode_b_login_student", {
    p_registration_or_last4: registration,
    p_password: password,
  });

  if (error || !data || (data as any[]).length === 0) return { ok: false, reason: "invalid_credentials" };

  const row = (data as any[])[0] as StudentLoginRpcRow;

  if (row.reason === "ambiguous_login") return { ok: false, reason: "ambiguous_login" };
  if (row.reason === "invalid_credentials") return { ok: false, reason: "invalid_credentials" };

  const studentId = String(row.student_id || "");
  if (!studentId) return { ok: false, reason: "invalid_credentials" };

  const projectIds = Array.from(new Set((row.project_ids || []).map(String))).filter(Boolean);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: StudentSession = projectId
    ? { studentId, projectId, projectIds, login: registration }
    : { studentId, projectIds, login: registration };

  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  setStudentSessionPassword(password);
  return { ok: true, studentId, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutStudent() {
  localStorage.removeItem(STUDENT_SESSION_KEY);
  sessionStorage.removeItem(STUDENT_PASSWORD_KEY);
}

export async function resetStudentPassword(studentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("mode_b_reset_student_password", {
    p_student_id: studentId,
  });
  if (error) return false;
  return data === true;
}

export async function changeStudentPassword(input: {
  studentId: string;
  oldPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; reason: "wrong_password" | "error" }> {
  const { data, error } = await supabase.rpc("mode_b_change_student_password", {
    p_student_id: input.studentId,
    p_old_password: input.oldPassword,
    p_new_password: input.newPassword,
  });
  if (error) return { ok: false, reason: "error" };
  if (data === true) return { ok: true };
  return { ok: false, reason: "wrong_password" };
}