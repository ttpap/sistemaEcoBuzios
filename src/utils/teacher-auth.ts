import { findTeacherByLogin, getTeacherProjectId } from "@/utils/teachers";

const TEACHER_SESSION_KEY = "ecobuzios_teacher_session"; // stores teacherId

export type TeacherLoginResult =
  | { ok: true; teacherId: string; projectId: string }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" };

export function getTeacherSessionTeacherId(): string | null {
  return localStorage.getItem(TEACHER_SESSION_KEY);
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

  const projectId = getTeacherProjectId(teacher.id);
  if (!projectId) return { ok: false, reason: "not_assigned" };

  localStorage.setItem(TEACHER_SESSION_KEY, teacher.id);
  return { ok: true, teacherId: teacher.id, projectId };
}

export function logoutTeacher() {
  localStorage.removeItem(TEACHER_SESSION_KEY);
}