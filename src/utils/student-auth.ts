import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";

const STUDENT_SESSION_KEY = "ecobuzios_student_session"; // stores { studentId, projectId? }

export const DEFAULT_STUDENT_PASSWORD = "EcoBuzios123";

export function getStudentLoginFromRegistration(registration: string) {
  const reg = (registration || "").trim();
  const last = reg.includes("-") ? reg.split("-").pop() || "" : reg;
  return last.trim().padStart(4, "0");
}

type StudentSession = {
  studentId: string;
  projectId?: string;
  projectIds?: string[];
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
  return {
    studentId: parsed.studentId,
    ...(projectId ? { projectId } : {}),
    ...(projectIds ? { projectIds } : {}),
  };
}

export function getStudentSessionStudentId(): string | null {
  return getStudentSession()?.studentId || null;
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
  const next: StudentSession = { studentId: cur.studentId, ...(cur.projectIds ? { projectIds: cur.projectIds } : {}) };
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
    ? { studentId, projectId, projectIds }
    : { studentId, projectIds };

  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  return { ok: true, studentId, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutStudent() {
  localStorage.removeItem(STUDENT_SESSION_KEY);
}