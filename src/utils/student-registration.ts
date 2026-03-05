import type { StudentRegistration } from "@/types/student";
import { getStudentLoginFromRegistration } from "@/utils/student-auth";

function stableArray(arr: unknown) {
  if (!Array.isArray(arr)) return [] as string[];
  return arr.map(String).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function exactSignature(s: StudentRegistration) {
  // Exclui campos que mudam/identificam: id, registration, registrationDate.
  // A ideia aqui é detectar apenas inscrições realmente duplicadas (mesmos dados preenchidos).
  const payload = {
    fullName: s.fullName || "",
    socialName: s.socialName || "",
    preferredName: s.preferredName || "",
    email: s.email || "",
    cpf: s.cpf || "",
    birthDate: s.birthDate || "",
    age: Number.isFinite(Number(s.age)) ? Number(s.age) : 0,
    cellPhone: s.cellPhone || "",
    gender: s.gender || "",
    genderOther: (s as any).genderOther || "",
    race: s.race || "",
    photo: s.photo || "",

    guardianName: s.guardianName || "",
    guardianKinship: s.guardianKinship || "",
    guardianPhone: s.guardianPhone || "",
    guardianDeclarationConfirmed: Boolean(s.guardianDeclarationConfirmed),

    schoolType: s.schoolType || "",
    schoolName: s.schoolName || "",
    schoolOther: s.schoolOther || "",

    cep: s.cep || "",
    street: s.street || "",
    number: s.number || "",
    complement: s.complement || "",
    neighborhood: s.neighborhood || "",
    city: s.city || "",
    uf: s.uf || "",

    enelClientNumber: s.enelClientNumber || "",

    bloodType: s.bloodType || "",
    hasAllergy: Boolean(s.hasAllergy),
    allergyDetail: s.allergyDetail || "",
    hasSpecialNeeds: Boolean(s.hasSpecialNeeds),
    specialNeedsDetail: s.specialNeedsDetail || "",
    usesMedication: Boolean(s.usesMedication),
    medicationDetail: s.medicationDetail || "",
    hasPhysicalRestriction: Boolean(s.hasPhysicalRestriction),
    physicalRestrictionDetail: s.physicalRestrictionDetail || "",
    practicedActivity: Boolean(s.practicedActivity),
    practicedActivityDetail: s.practicedActivityDetail || "",
    familyHeartHistory: Boolean(s.familyHeartHistory),
    healthProblems: stableArray(s.healthProblems),
    healthProblemsOther: s.healthProblemsOther || "",
    observations: s.observations || "",

    imageAuthorization: s.imageAuthorization || "",
    docsDelivered: stableArray(s.docsDelivered),

    status: s.status || "",
    class: s.class || "",
  };

  return JSON.stringify(payload);
}

export function dedupeExactStudentRegistrations(students: StudentRegistration[]) {
  let changed = false;

  // Mantém sempre a mais nova (registrationDate maior). Se empatar, mantém a de id maior.
  const bestBySig = new Map<string, StudentRegistration>();

  for (const s of students) {
    const sig = exactSignature(s);
    const cur = bestBySig.get(sig);
    if (!cur) {
      bestBySig.set(sig, s);
      continue;
    }

    const tCur = new Date(cur.registrationDate || 0).getTime();
    const tNext = new Date(s.registrationDate || 0).getTime();

    const shouldReplace = tNext > tCur || (tNext === tCur && String(s.id).localeCompare(String(cur.id)) > 0);
    if (shouldReplace) {
      bestBySig.set(sig, s);
      changed = true;
    } else {
      changed = true;
    }
  }

  const nextStudents = Array.from(bestBySig.values());
  return { changed, students: nextStudents };
}

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

  const deduped = dedupeExactStudentRegistrations(students);
  const baseStudents = deduped.students;

  let changed = Boolean(deduped.changed);
  const used = new Set<string>();

  // Process in chronological order for stability.
  const ordered = [...baseStudents].sort((a, b) => {
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

  const nextStudents = baseStudents.map((s) => {
    const reg = normalizedById.get(s.id);
    if (!reg || reg === s.registration) return s;
    return { ...s, registration: reg };
  });

  return { changed, students: nextStudents };
}