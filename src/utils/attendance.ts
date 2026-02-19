import { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import { readScoped, writeScoped } from "@/utils/storage";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getAllAttendance(): AttendanceSession[] {
  // Project-scoped
  try {
    return readScoped<AttendanceSession[]>("attendance", []);
  } catch {
    // fallback for safety (should be gated by project)
    return safeParse<AttendanceSession[]>(localStorage.getItem("ecobuzios_attendance"), []);
  }
}

export function saveAllAttendance(sessions: AttendanceSession[]) {
  try {
    writeScoped("attendance", sessions);
  } catch {
    localStorage.setItem("ecobuzios_attendance", JSON.stringify(sessions));
  }
}

export function getAttendanceForClass(classId: string): AttendanceSession[] {
  return getAllAttendance()
    .filter((s) => s.classId === classId)
    .sort((a, b) => {
      // Most recent created first
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (diff !== 0) return diff;
      // Fallback by date
      return b.date.localeCompare(a.date);
    });
}

export function upsertAttendanceSession(session: AttendanceSession) {
  const all = getAllAttendance();
  const idx = all.findIndex((s) => s.id === session.id);
  const next = idx >= 0 ? all.map((s) => (s.id === session.id ? session : s)) : [session, ...all];
  saveAllAttendance(next);
}

export function findAttendanceByClassAndDate(classId: string, date: string) {
  return getAllAttendance().find((s) => s.classId === classId && s.date === date);
}

export function ensureStudentRecords(
  session: AttendanceSession,
  currentStudentIds: string[],
  defaultStatus: AttendanceStatus = "presente"
): AttendanceSession {
  // If session has a snapshot, we DO NOT expand it with new students.
  // This preserves the historical truth for reports.
  const targetIds = session.studentIds && session.studentIds.length > 0 ? session.studentIds : currentStudentIds;

  const records = { ...session.records };
  let changed = false;

  for (const id of targetIds) {
    if (!records[id]) {
      records[id] = defaultStatus;
      changed = true;
    }
  }

  return changed ? { ...session, records } : session;
}