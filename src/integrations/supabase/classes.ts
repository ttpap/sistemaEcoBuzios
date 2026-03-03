import { supabase } from "@/integrations/supabase/client";
import type { SchoolClass } from "@/types/class";
import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

function mapRow(row: any): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    period: row.period,
    startTime: row.start_time,
    endTime: row.end_time,
    capacity: row.capacity,
    absenceLimit: row.absence_limit,
    registrationDate: row.registration_date,
    status: row.status,
    complementaryInfo: row.complementary_info ?? undefined,
  };
}

function getModeBStaffCreds(): { login: string; password: string } | null {
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  return null;
}

export async function fetchClassesRemote(projectId: string): Promise<SchoolClass[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("project_id", projectId)
    .order("registration_date", { ascending: false });

  if (!error && data) return data.map(mapRow);

  // Fallback (modo B): usa RPC com login/senha quando RLS bloquear.
  const creds = getModeBStaffCreds();
  if (!creds) return [];

  const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_classes", {
    p_login: creds.login,
    p_password: creds.password,
    p_project_id: projectId,
  });

  if (rpcErr || !rpcData) return [];
  return (rpcData as any[]).map(mapRow);
}

export async function fetchClassByIdRemote(classId: string): Promise<SchoolClass | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!error && data) return mapRow(data);

  // Sem RPC específica por ID por enquanto.
  return null;
}

export async function upsertClassRemote(projectId: string, input: SchoolClass) {
  if (!supabase) return;

  const row = {
    id: input.id,
    project_id: projectId,
    name: input.name,
    period: input.period,
    start_time: input.startTime,
    end_time: input.endTime,
    capacity: input.capacity,
    absence_limit: input.absenceLimit,
    registration_date: input.registrationDate,
    status: input.status,
    complementary_info: input.complementaryInfo ?? null,
  };

  const { error } = await supabase.from("classes").upsert(row);
  if (!error) return;

  // Fallback (modo B)
  const creds = getModeBStaffCreds();
  if (!creds) throw error;

  const { error: rpcErr } = await supabase.rpc("mode_b_upsert_class", {
    p_login: creds.login,
    p_password: creds.password,
    p_project_id: projectId,
    p_id: input.id,
    p_name: input.name,
    p_period: input.period,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_capacity: input.capacity,
    p_absence_limit: input.absenceLimit,
    p_registration_date: input.registrationDate,
    p_status: input.status,
    p_complementary_info: input.complementaryInfo ?? null,
  });

  if (rpcErr) throw rpcErr;
}

export async function deleteClassRemote(classId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (!error) return;

  const creds = getModeBStaffCreds();
  if (!creds) throw error;

  const { error: rpcErr } = await supabase.rpc("mode_b_delete_class", {
    p_login: creds.login,
    p_password: creds.password,
    p_class_id: classId,
  });

  if (rpcErr) throw rpcErr;
}

export type ClassTeacherRow = { class_id: string; teacher_id: string };
export type ClassStudentEnrollmentRow = {
  class_id: string;
  student_id: string;
  enrolled_at: string;
  removed_at: string | null;
};

export async function fetchClassTeacherIdsRemote(classId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", classId);
  if (error || !data) return [];
  return data.map((r: any) => r.teacher_id);
}

export async function setClassTeacherIdsRemote(classId: string, teacherIds: string[]) {
  if (!supabase) return;
  // simple sync: delete then insert
  const { error: delError } = await supabase.from("class_teachers").delete().eq("class_id", classId);
  if (delError) throw delError;

  if (!teacherIds.length) return;
  const rows = teacherIds.map((tid) => ({ class_id: classId, teacher_id: tid }));
  const { error: insError } = await supabase.from("class_teachers").insert(rows);
  if (insError) throw insError;
}

export async function fetchEnrollmentsRemote(classId: string): Promise<ClassStudentEnrollmentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("class_student_enrollments")
    .select("class_id,student_id,enrolled_at,removed_at")
    .eq("class_id", classId);
  if (error || !data) return [];
  return data as ClassStudentEnrollmentRow[];
}

export async function enrollStudentRemote(classId: string, studentId: string) {
  if (!supabase) return;

  // If there's an existing row, we just clear removed_at. Otherwise create.
  const { data } = await supabase
    .from("class_student_enrollments")
    .select("class_id,student_id,enrolled_at,removed_at")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (data) {
    const { error } = await supabase
      .from("class_student_enrollments")
      .update({ removed_at: null })
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("class_student_enrollments")
    .insert({ class_id: classId, student_id: studentId, enrolled_at: new Date().toISOString(), removed_at: null });
  if (error) throw error;
}

export async function removeStudentEnrollmentRemote(classId: string, studentId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("class_student_enrollments")
    .update({ removed_at: new Date().toISOString() })
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) throw error;
}