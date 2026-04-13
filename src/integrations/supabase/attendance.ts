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

  const staffCreds = getModeBStaffCreds();

  // Modo B (professor/coordenador): vai direto pra RPC; o SELECT direto é
  // bloqueado por RLS quando não há sessão Supabase Auth e voltaria vazio.
  if (staffCreds) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_attendance_sessions", {
      p_login: staffCreds.login,
      p_password: staffCreds.password,
      p_project_id: projectId,
      p_class_id: classId || null,
    });

    if (rpcErr) {
      console.error("[fetchAttendanceSessionsRemote] RPC error", rpcErr);
      return [];
    }
    if (!rpcData) return [];

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

  // Admin / sessão Supabase Auth: RPC SECURITY DEFINER que retorna sessões
  // já com student_ids e records embutidos (sem limite de linhas).
  const { data: fullData, error: fullErr } = await supabase.rpc("list_attendance_sessions_full", {
    p_project_id: projectId,
    p_class_id: classId || null,
  });

  if (!fullErr && fullData && Array.isArray(fullData) && fullData.length > 0) {
    return (fullData as any[]).map((r: any) => ({
      id: r.id,
      classId: r.class_id,
      date: r.date,
      createdAt: r.created_at,
      finalizedAt: r.finalized_at ?? undefined,
      studentIds: r.student_ids || [],
      records: (r.records || {}) as Record<string, AttendanceStatus>,
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

  const creds = getModeBStaffCreds();
  if (creds) {
    const { error: rpcErr } = await supabase.rpc("mode_b_delete_attendance_session", {
      p_login: creds.login,
      p_password: creds.password,
      p_session_id: sessionId,
    });
    if (rpcErr) throw rpcErr;
    return;
  }

  const { error } = await supabase.from("attendance_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}