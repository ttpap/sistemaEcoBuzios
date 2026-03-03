import { supabase } from "@/integrations/supabase/client";
import type { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

function getModeBStaffCreds(): { login: string; password: string } | null {
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  return null;
}

type RpcAttendanceRow = {
  id: string;
  class_id: string;
  date: string;
  created_at: string;
  finalized_at: string | null;
  student_ids: string[] | null;
  records: Record<string, AttendanceStatus> | null;
};

export async function fetchAttendanceSessionsRemote(projectId: string, classId?: string) {
  if (!supabase) return [] as AttendanceSession[];

  // 1) Tentativa normal (RLS pode retornar vazio sem erro)
  let q = supabase
    .from("attendance_sessions")
    .select("id,class_id,date,created_at,finalized_at")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  if (classId) q = q.eq("class_id", classId);

  const { data, error } = await q;

  // Se tiver resultado, segue com o caminho normal.
  if (!error && Array.isArray(data) && data.length > 0) {
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

  // 2) Fallback (modo B): quando RLS bloquear, o SELECT pode vir vazio.
  const creds = getModeBStaffCreds();
  if (!creds) return [];

  const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_attendance_sessions", {
    p_login: creds.login,
    p_password: creds.password,
    p_project_id: projectId,
    p_class_id: classId || null,
  });

  if (rpcErr || !rpcData) return [];

  const rows = rpcData as unknown as RpcAttendanceRow[];
  return rows.map((r) => ({
    id: r.id,
    classId: r.class_id,
    date: r.date,
    createdAt: r.created_at,
    finalizedAt: r.finalized_at ?? undefined,
    studentIds: r.student_ids || [],
    records: (r.records || {}) as Record<string, AttendanceStatus>,
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

  if (!upsertError) {
    await supabase.from("attendance_session_students").delete().eq("session_id", session.id);
    if (session.studentIds && session.studentIds.length) {
      const rows = session.studentIds.map((sid) => ({ session_id: session.id, student_id: sid }));
      const { error } = await supabase.from("attendance_session_students").insert(rows);
      if (error) throw error;
    }

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

    return;
  }

  // Fallback (modo B)
  const creds = getModeBStaffCreds();
  if (!creds) throw upsertError;

  const { error: rpcErr } = await supabase.rpc("mode_b_upsert_attendance_session", {
    p_login: creds.login,
    p_password: creds.password,
    p_project_id: projectId,
    p_id: session.id,
    p_class_id: session.classId,
    p_date: session.date,
    p_created_at: session.createdAt,
    p_finalized_at: session.finalizedAt ?? null,
    p_student_ids: (session.studentIds || []) as string[],
    p_records: (session.records || {}) as any,
  });

  if (rpcErr) throw rpcErr;
}

export async function deleteAttendanceSessionRemote(sessionId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("attendance_sessions").delete().eq("id", sessionId);
  if (!error) return;

  const creds = getModeBStaffCreds();
  if (!creds) throw error;

  const { error: rpcErr } = await supabase.rpc("mode_b_delete_attendance_session", {
    p_login: creds.login,
    p_password: creds.password,
    p_session_id: sessionId,
  });

  if (rpcErr) throw rpcErr;
}