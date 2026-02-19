import { SchoolClass } from "@/types/class";

export type Enrollment = {
  studentId: string;
  enrolledAt: string; // ISO
  removedAt?: string; // ISO
};

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isoToDateKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dateKey(d);
}

export function ensureStudentEnrollments(cls: SchoolClass): SchoolClass {
  if (cls.studentEnrollments && Array.isArray(cls.studentEnrollments)) return cls;

  const now = new Date().toISOString();
  const enrolledAt = cls.registrationDate || now;
  const enrollments: Enrollment[] = (cls.studentIds || []).map((id) => ({
    studentId: id,
    enrolledAt,
  }));

  return { ...cls, studentEnrollments: enrollments };
}

export function isStudentEnrolledOn(cls: SchoolClass, studentId: string, ymd: string): boolean {
  const clsWith = ensureStudentEnrollments(cls);
  const target = ymdToDate(ymd);
  if (!target) return true;
  const targetKey = dateKey(target);

  const e = (clsWith.studentEnrollments || []).find((x) => x.studentId === studentId);
  if (!e) return (clsWith.studentIds || []).includes(studentId);

  const enrolledKey = isoToDateKey(e.enrolledAt) || "0000-00-00";
  const removedKey = e.removedAt ? isoToDateKey(e.removedAt) : null;

  if (targetKey < enrolledKey) return false;
  if (removedKey && targetKey > removedKey) return false;
  return true;
}

export function studentsEnrolledOn(cls: SchoolClass, studentIds: string[], ymd: string) {
  return studentIds.filter((id) => isStudentEnrolledOn(cls, id, ymd));
}

export function enrollStudent(cls: SchoolClass, studentId: string): SchoolClass {
  const next = ensureStudentEnrollments(cls);
  const now = new Date().toISOString();

  const existing = (next.studentEnrollments || []).find((e) => e.studentId === studentId);
  const enrollments: Enrollment[] = existing
    ? (next.studentEnrollments || []).map((e) =>
        e.studentId === studentId ? { ...e, removedAt: undefined, enrolledAt: e.enrolledAt || now } : e
      )
    : [...(next.studentEnrollments || []), { studentId, enrolledAt: now }];

  const studentIds = Array.from(new Set([...(next.studentIds || []), studentId]));
  return { ...next, studentIds, studentEnrollments: enrollments };
}

export function removeStudentEnrollment(cls: SchoolClass, studentId: string): SchoolClass {
  const next = ensureStudentEnrollments(cls);
  const now = new Date().toISOString();

  const enrollments: Enrollment[] = (next.studentEnrollments || []).map((e) =>
    e.studentId === studentId ? { ...e, removedAt: now } : e
  );

  const studentIds = (next.studentIds || []).filter((id) => id !== studentId);
  return { ...next, studentIds, studentEnrollments: enrollments };
}
