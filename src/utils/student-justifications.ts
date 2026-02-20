import { getProjectScopedKey, requireActiveProjectId } from "@/utils/projects";

export type StudentJustification = {
  id: string;
  projectId: string;
  classId: string;
  studentId: string;
  /** YYYY-MM-DD */
  date: string;
  message: string;
  createdAt: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function key(projectId: string) {
  return getProjectScopedKey(projectId, "student_justifications");
}

export function getAllStudentJustifications(projectId: string): StudentJustification[] {
  return safeParse<StudentJustification[]>(localStorage.getItem(key(projectId)), []);
}

export function saveAllStudentJustifications(projectId: string, list: StudentJustification[]) {
  localStorage.setItem(key(projectId), JSON.stringify(list));
}

export function upsertStudentJustification(projectId: string, j: StudentJustification) {
  const all = getAllStudentJustifications(projectId);
  const idx = all.findIndex((x) => x.id === j.id);
  const next = idx >= 0 ? all.map((x) => (x.id === j.id ? j : x)) : [j, ...all];
  saveAllStudentJustifications(projectId, next);
}

export function getJustificationForStudent(projectId: string, classId: string, date: string, studentId: string) {
  return (
    getAllStudentJustifications(projectId).find(
      (j) => j.classId === classId && j.date === date && j.studentId === studentId,
    ) || null
  );
}

export function getJustificationsForClassDate(projectId: string, classId: string, date: string) {
  return getAllStudentJustifications(projectId).filter((j) => j.classId === classId && j.date === date);
}

export function getJustificationsForStudentInProject(projectId: string, studentId: string) {
  return getAllStudentJustifications(projectId).filter((j) => j.studentId === studentId);
}

export function getJustificationsForClassDateActiveProject(classId: string, date: string) {
  const projectId = requireActiveProjectId();
  return getJustificationsForClassDate(projectId, classId, date);
}
