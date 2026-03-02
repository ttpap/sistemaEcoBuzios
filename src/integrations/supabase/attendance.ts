import { supabase } from "@/integrations/supabase/client";
import type { AttendanceSession, AttendanceStatus } from "@/types/attendance";

export async function fetchAttendanceSessionsRemote(projectId: string, classId?: string) {
  if (!supabase) return [] as AttendanceSession[];
  let q = supabase
    .from("attendance_sessions")
    .select("id,class_id,date,created_at,finalized_at")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  if (classId) q = q.eq("class_id", classId);

  const { data, error } = await q;
  if (error || !data) return [];

  // We attach records + studentIds in separate queries (fast enough for typical sizes)
  const sessions: AttendanceSession[] = [];
  for (const s of data as any[]) {
    sessions.push({
      id: s.id,
      classId: s.class_id,
      date: s.date,
      createdAt: s.created_at,
      finalizedAt: s.finalized_at ?? undefined,
      records: {},
      studentIds: [],
    });
  }

  // Load students snapshots
  const ids = sessions.map((s) => s.id);
  if (!ids.length) return sessions;

  const { data: ssData } = await supabase
    .from("attendance_session_students")
    .select("session_id,student_id")
    .in("session_id", ids);

  const bySessionStudents = new Map<string, string[]>();
  for (const row of (ssData as any[]) || []) {
    const arr = bySessionStudents.get(row.session_id) || [];
    arr.push(row.student_id);
    bySessionStudents.set(row.session_id, arr);
  }

  // Load records
  const { data: recData } = await supabase
    .from("attendance_records")
    .select("session_id,student_id,status")
    .in("session_id", ids);

  const bySessionRecords = new Map<string, Record<string, AttendanceStatus>>();
  for (const row of (recData as any[]) || []) {
    const map = bySessionRecords.get(row.session_id) || {};
    map[row.student_id] = row.status;
    bySessionRecords.set(row.session_id, map);
  }

  return sessions.map((s) => ({
    ...s,
    studentIds: bySessionStudents.get(s.id) || [],
    records: bySessionRecords.get(s.id) || {},
  }));
}

export async function upsertAttendanceSessionRemote(projectId: string, session: AttendanceSession) {
  if (!supabase) return;

  const { error: upsertError } = await supabase.from("attendance_sessions").upsert({
    id: session.id,
    project_id: projectId,
    class_id: session.classId,
    date: session.date,
    created_at: session.createdAt,
    finalized_at: session.finalizedAt ?? null,
  });
  if (upsertError) throw upsertError;

  // Snapshot students
  await supabase.from("attendance_session_students").delete().eq("session_id", session.id);
  if (session.studentIds && session.studentIds.length) {
    const rows = session.studentIds.map((sid) => ({ session_id: session.id, student_id: sid }));
    const { error } = await supabase.from("attendance_session_students").insert(rows);
    if (error) throw error;
  }

  // Records: simple sync by deleting + inserting only set records
  await supabase.from("attendance_records").delete().eq("session_id", session.id);
  const entries = Object.entries(session.records || {}).filter(([, st]) => Boolean(st));
  if (entries.length) {
    const rows = entries.map(([studentId, status]) => ({
      session_id: session.id,
      student_id: studentId,
      status,
    }));
    const { error } = await supabase.from("attendance_records").insert(rows);
    if (error) throw error;
  }
}

export async function deleteAttendanceSessionRemote(sessionId: string) {
  if (!supabase) return;
  // FK dependencies: delete children first
  await supabase.from("attendance_records").delete().eq("session_id", sessionId);
  await supabase.from("attendance_session_students").delete().eq("session_id", sessionId);
  const { error } = await supabase.from("attendance_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
