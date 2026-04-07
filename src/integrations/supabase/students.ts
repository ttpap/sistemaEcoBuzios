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
    msgLower.includes("mode_b_list_all_students") ||
    msgLower.includes("mode_b_list_class_students")
  );
}

export async function fetchStudents(): Promise<StudentRegistration[]> {
  if (!supabase) return [];

  const PAGE_SIZE = 1000;
  const all: StudentRegistration[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("registration_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    all.push(...data.map(mapStudentRowToModel));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function fetchStudentsByIds(ids: string[]): Promise<StudentRegistration[]> {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .in("id", ids);
  if (error || !data) return [];
  return data.map(mapStudentRowToModel);
}

export async function fetchStudentsCount(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export type FetchStudentsIssue = "rpc_missing" | "not_allowed" | "unknown";
export type FetchStudentsResult = { students: StudentRegistration[]; issue?: FetchStudentsIssue };

// Lista estudantes do projeto (somente matriculados nas turmas do projeto).
export async function fetchStudentsRemoteWithMeta(projectId: string): Promise<FetchStudentsResult> {
  if (!supabase) return { students: [] };

  const creds = getModeBStaffCreds();

  if (!creds) {
    // Admin / Supabase JWT — filtra via join de matrículas → turmas do projeto
    const { data: enrollRows, error: enrollErr } = await supabase
      .from("class_student_enrollments")
      .select("student_id, classes!inner(project_id)")
      .eq("classes.project_id", projectId)
      .is("removed_at", null);

    if (enrollErr) return { students: [], issue: "unknown" };

    const ids = Array.from(new Set((enrollRows as any[]).map((e) => e.student_id)));
    if (ids.length === 0) return { students: [] }; // Projeto sem matrículas

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .in("id", ids)
      .order("registration_date", { ascending: false });

    if (error) return { students: [], issue: "unknown" };
    return { students: (data || []).map(mapStudentRowToModel) };
  }

  // Modo B — usa RPC SECURITY DEFINER com paginação para buscar TODOS os alunos
  // (mode_b_list_all_students não filtra por projeto, ideal para o dialog de matrícula)
  const PAGE_SIZE = 1000;
  const allStudents: StudentRegistration[] = [];
  let from = 0;

  while (true) {
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc("mode_b_list_all_students", {
        p_login: creds.login,
        p_password: creds.password,
        p_project_id: projectId,
      })
      .range(from, from + PAGE_SIZE - 1);

    if (rpcErr) {
      const msg = String(rpcErr.message || "").toLowerCase();
      if (isRpcMissingErrorMessage(msg)) return { students: [], issue: "rpc_missing" };
      if (msg.includes("not_allowed")) return { students: [], issue: "not_allowed" };
      return { students: [], issue: "unknown" };
    }

    if (!rpcData || rpcData.length === 0) break;
    allStudents.push(...(rpcData as any[]).map(mapStudentRowToModel));
    if (rpcData.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { students: allStudents };
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