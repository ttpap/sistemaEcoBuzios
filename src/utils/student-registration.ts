import type { StudentRegistration } from "@/types/student";
import { getStudentLoginFromRegistration } from "@/utils/student-auth";

export function allocateNewStudentRegistration(
  existing: StudentRegistration[],
  year = new Date().getFullYear(),
): string {
  const used = new Set<string>();
  for (const s of existing) {
    const suffix = getStudentLoginFromRegistration(String(s.registration || ""));
    if (/^\d{4}$/.test(suffix)) used.add(suffix);
  }

  for (let i = 1; i <= 9999; i++) {
    const suffix = String(i).padStart(4, "0");
    if (!used.has(suffix)) return `${year}-${suffix}`;
  }

  throw new Error("Limite de matrículas atingido (0001-9999). Procure o administrador.");
}

export function normalizeStudentRegistrations(students: StudentRegistration[]) {
  // Ensures every student has a registration in YYYY-XXXX format and that the XXXX suffix is unique across the whole system.
  // This is needed because the student login is based on the last 4 digits.

  let changed = false;
  const used = new Set<string>();

  // Process in chronological order for stability.
  const ordered = [...students].sort((a, b) => {
    const da = new Date(a.registrationDate || 0).getTime();
    const db = new Date(b.registrationDate || 0).getTime();
    return da - db;
  });

  const nextSuffix = () => {
    for (let i = 1; i <= 9999; i++) {
      const s = String(i).padStart(4, "0");
      if (!used.has(s)) return s;
    }
    return null;
  };

  const normalizedById = new Map<string, string>();

  for (const s of ordered) {
    const year = new Date(s.registrationDate || Date.now()).getFullYear();
    const current = String(s.registration || "").trim();

    const suffix = getStudentLoginFromRegistration(current);
    const isFormatOk = /^\d{4}-\d{4}$/.test(current);
    const canKeep = isFormatOk && /^\d{4}$/.test(suffix) && !used.has(suffix);

    if (canKeep) {
      used.add(suffix);
      normalizedById.set(s.id, current);
      continue;
    }

    const fresh = nextSuffix();
    if (!fresh) {
      // If exhausted, keep current as-is; but the login uniqueness cannot be guaranteed.
      normalizedById.set(s.id, current);
      continue;
    }

    used.add(fresh);
    const next = `${year}-${fresh}`;
    normalizedById.set(s.id, next);
    if (next !== current) changed = true;
  }

  const nextStudents = students.map((s) => {
    const reg = normalizedById.get(s.id);
    if (!reg || reg === s.registration) return s;
    return { ...s, registration: reg };
  });

  return { changed, students: nextStudents };
}
