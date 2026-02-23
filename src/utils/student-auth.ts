import { readGlobalStudents } from "@/utils/storage";
import { getActiveProjectId, getProjectScopedKey, getProjects } from "@/utils/projects";
import type { StudentRegistration } from "@/types/student";
import type { SchoolClass } from "@/types/class";

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

function getProjectClasses(projectId: string): SchoolClass[] {
  const key = getProjectScopedKey(projectId, "classes");
  return safeParse<SchoolClass[]>(localStorage.getItem(key), []);
}

function studentIsInClass(cls: SchoolClass, studentId: string) {
  if (Array.isArray(cls.studentIds) && cls.studentIds.includes(studentId)) return true;
  if (Array.isArray(cls.studentEnrollments)) {
    const e = cls.studentEnrollments.find((x) => x.studentId === studentId);
    if (!e) return false;
    return !e.removedAt; // currently enrolled
  }
  return false;
}

export function getStudentProjectIds(studentId: string): string[] {
  const ids: string[] = [];
  for (const p of getProjects()) {
    const classes = getProjectClasses(p.id);
    if (classes.some((c) => studentIsInClass(c, studentId))) ids.push(p.id);
  }
  return ids;
}

export function findStudentByRegistration(registration: string): StudentRegistration | null {
  const norm = (registration || "").trim();
  if (!norm) return null;
  const students = readGlobalStudents<StudentRegistration[]>([]);
  return students.find((s) => String(s.registration || "").trim() === norm) || null;
}

export function findStudentByLogin(login: string):
  | { ok: true; student: StudentRegistration }
  | { ok: false; reason: "not_found" | "ambiguous" } {
  const raw = (login || "").trim();
  if (!raw) return { ok: false, reason: "not_found" };

  // If user typed full matricula (AAAA-XXXX), prefer exact match.
  if (raw.includes("-")) {
    const exact = findStudentByRegistration(raw);
    if (!exact) return { ok: false, reason: "not_found" };
    return { ok: true, student: exact };
  }

  // Otherwise accept last 4 digits, but only if it uniquely identifies a student.
  const last4 = getStudentLoginFromRegistration(raw);
  const students = readGlobalStudents<StudentRegistration[]>([]);
  const matches = students.filter((s) => getStudentLoginFromRegistration(String(s.registration || "")) === last4);

  if (matches.length === 0) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };

  return { ok: true, student: matches[0] };
}

export function getStudentSession(): StudentSession | null {
  const raw = localStorage.getItem(STUDENT_SESSION_KEY);
  if (!raw) return null;

  const parsed = safeParse<StudentSession | null>(raw, null);
  if (!parsed?.studentId) return null;

  const projectId = (parsed.projectId || "").trim() || undefined;
  return { studentId: parsed.studentId, ...(projectId ? { projectId } : {}) };
}

export function getStudentSessionStudentId(): string | null {
  return getStudentSession()?.studentId || null;
}

export function getStudentSessionProjectId(): string | null {
  return getStudentSession()?.projectId || null;
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
  const next: StudentSession = { studentId: cur.studentId };
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(next));
}

export function isStudentLoggedIn() {
  return Boolean(getStudentSessionStudentId());
}

export function loginStudent(input: { registration: string; password: string }): StudentLoginResult {
  const registration = (input.registration || "").trim();
  const password = (input.password || "").trim();

  const found = findStudentByLogin(registration);
  if (!found.ok) {
    const reason = "reason" in found ? found.reason : "not_found";
    if (reason === "ambiguous") return { ok: false, reason: "ambiguous_login" };
    return { ok: false, reason: "invalid_credentials" };
  }

  // Default password for all students (simple model for now)
  const ok = normalizePassword(password) === normalizePassword(DEFAULT_STUDENT_PASSWORD);
  if (!ok) return { ok: false, reason: "invalid_credentials" };

  const projectIds = getStudentProjectIds(found.student.id);
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  let projectId: string | undefined;
  if (projectIds.length === 1) {
    projectId = projectIds[0];
  } else {
    const preferred = getActiveProjectId();
    projectId = preferred && projectIds.includes(preferred) ? preferred : undefined;
  }

  const session: StudentSession = projectId
    ? { studentId: found.student.id, projectId }
    : { studentId: found.student.id };
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));

  return { ok: true, studentId: found.student.id, projectIds, ...(projectId ? { projectId } : {}) };
}

export function logoutStudent() {
  localStorage.removeItem(STUDENT_SESSION_KEY);
}