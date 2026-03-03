import { supabase } from "@/integrations/supabase/client";
import type { StudentRegistration } from "@/types/student";
import { mapStudentRowToModel } from "@/integrations/supabase/mappers";
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

function isRpcMissingErrorMessage(msgLower: string) {
  return (
    msgLower.includes("does not exist") ||
    (msgLower.includes("function") && msgLower.includes("mode_b_")) ||
    msgLower.includes("mode_b_list_students") ||
    msgLower.includes("mode_b_list_class_students")
  );
}

export async function fetchStudents(): Promise<StudentRegistration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error || !data) return [];
  return data.map(mapStudentRowToModel);
}

export type FetchStudentsIssue = "rpc_missing" | "not_allowed" | "unknown";
export type FetchStudentsResult = { students: StudentRegistration[]; issue?: FetchStudentsIssue };

// Lista estudantes disponíveis para um projeto no modo B.
// Observação: a tabela students é global, mas usamos o project_id apenas para autorização do staff.
export async function fetchStudentsRemoteWithMeta(projectId: string): Promise<FetchStudentsResult> {
  if (!supabase) return { students: [] };

  // 1) Tentativa normal
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("registration_date", { ascending: false });

  if (!error && data && data.length > 0) {
    return { students: data.map(mapStudentRowToModel) };
  }

  // 2) Fallback (modo B)
  const creds = getModeBStaffCreds();
  if (!creds) {
    return { students: (data || []).map(mapStudentRowToModel) };
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_students", {
    p_login: creds.login,
    p_password: creds.password,
    p_project_id: projectId,
  });

  if (rpcErr) {
    const msg = String(rpcErr.message || "").toLowerCase();
    if (isRpcMissingErrorMessage(msg)) return { students: [], issue: "rpc_missing" };
    if (msg.includes("not_allowed")) return { students: [], issue: "not_allowed" };
    return { students: [], issue: "unknown" };
  }

  return { students: (rpcData || []).map(mapStudentRowToModel) };
}

export async function fetchStudentsRemote(projectId: string): Promise<StudentRegistration[]> {
  const res = await fetchStudentsRemoteWithMeta(projectId);
  return res.students;
}

export async function deleteStudent(studentId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}