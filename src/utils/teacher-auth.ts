const TEACHER_SESSION_KEY = "ecobuzios_teacher_session"; // stores teacherId

import { findTeacherByLogin, getTeacherProjectId } from "@/utils/teachers";

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
  const teacher = findTeacherByLogin(input.login);
  if (!teacher) return { ok: false, reason: "invalid_credentials" };

  const ok = String(input.password) === String(teacher.authPassword);
  if (!ok) return { ok: false, reason: "invalid_credentials" };

  const projectId = getTeacherProjectId(teacher.id);
  if (!projectId) return { ok: false, reason: "not_assigned" };

  localStorage.setItem(TEACHER_SESSION_KEY, teacher.id);
  return { ok: true, teacherId: teacher.id, projectId };
}

export function logoutTeacher() {
  localStorage.removeItem(TEACHER_SESSION_KEY);
}
