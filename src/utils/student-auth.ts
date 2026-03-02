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

function normalizePassword(pw: string) {
  return (pw || "").toLowerCase().replace(/\s+/g, "");
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

export async function loginStudent(input: { registration: string; password: string }): Promise<StudentLoginResult> {
  const registration = (input.registration || "").trim();
  const password = (input.password || "").trim();

  const okPw = normalizePassword(password) === normalizePassword(DEFAULT_STUDENT_PASSWORD);
  if (!okPw) return { ok: false, reason: "invalid_credentials" };

  const raw = registration;
  if (!raw) return { ok: false, reason: "invalid_credentials" };

  // Find student by full registration OR last 4 digits.
  let studentRows: Array<{ id: string; registration: string }> = [];

  if (raw.includes("-")) {
    const { data, error } = await supabase
      .from("students")
      .select("id,registration")
      .eq("registration", raw);
    if (error) return { ok: false, reason: "invalid_credentials" };
    studentRows = (data as any[]) || [];
  } else {
    const last4 = getStudentLoginFromRegistration(raw);
    const { data, error } = await supabase
      .from("students")
      .select("id,registration")
      .like("registration", `%-${last4}`);
    if (error) return { ok: false, reason: "invalid_credentials" };
    studentRows = (data as any[]) || [];
  }

  if (studentRows.length === 0) return { ok: false, reason: "invalid_credentials" };
  if (studentRows.length !== 1) return { ok: false, reason: "ambiguous_login" };

  const studentId = String(studentRows[0].id);

  // Discover projects where this student is currently enrolled.
  const { data: enrollments, error: enrollErr } = await supabase
    .from("class_student_enrollments")
    .select("class_id, removed_at")
    .eq("student_id", studentId)
    .is("removed_at", null);

  if (enrollErr) return { ok: false, reason: "not_assigned" };

  const classIds = Array.from(new Set((enrollments || []).map((e: any) => String(e.class_id)))).filter(Boolean);
  if (!classIds.length) return { ok: false, reason: "not_assigned" };

  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, project_id")
    .in("id", classIds);

  if (clsErr) return { ok: false, reason: "not_assigned" };

  const projectIds = Array.from(new Set((classes || []).map((c: any) => String(c.project_id)))).filter(Boolean);
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