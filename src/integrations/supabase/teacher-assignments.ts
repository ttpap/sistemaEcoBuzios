import { supabase } from "@/integrations/supabase/client";
import { anonRestSelect } from "@/integrations/supabase/rest-fallback";

export type TeacherProjectAssignmentRow = {
  teacher_id: string;
  project_id: string;
  created_at: string;
};

const ASSIGNMENTS_REST = "teacher_project_assignments?select=*";

export async function fetchTeacherAssignments(): Promise<TeacherProjectAssignmentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("teacher_project_assignments").select("*");
  if (!error && data && data.length) return data as TeacherProjectAssignmentRow[];
  try {
    const rows = await anonRestSelect<TeacherProjectAssignmentRow>(ASSIGNMENTS_REST);
    if (rows.length) return rows;
  } catch {
    /* mantém resultado do SDK */
  }
  if (error || !data) return [];
  return data as TeacherProjectAssignmentRow[];
}

export async function fetchTeacherAssignmentsWithMeta(): Promise<{ rows: TeacherProjectAssignmentRow[]; error: any | null }> {
  if (!supabase) return { rows: [], error: new Error("Supabase não está configurado.") };
  const { data, error } = await supabase.from("teacher_project_assignments").select("*");
  if (!error && data && data.length) {
    return { rows: data as TeacherProjectAssignmentRow[], error: null };
  }

  // Fallback via REST anon (tabela tem policy de leitura para anon).
  try {
    const rows = await anonRestSelect<TeacherProjectAssignmentRow>(ASSIGNMENTS_REST);
    if (rows.length) return { rows, error: null };
  } catch {
    /* cai no tratamento de erro do SDK abaixo */
  }

  if (error || !data) return { rows: [], error: error || new Error("Sem dados") };
  return { rows: data as TeacherProjectAssignmentRow[], error: null };
}

export async function assignTeacherToProjectRemote(teacherId: string, projectId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("teacher_project_assignments")
    .upsert({ teacher_id: teacherId, project_id: projectId });
  if (error) throw error;
}

export async function removeTeacherFromProjectRemote(teacherId: string, projectId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("teacher_project_assignments")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("project_id", projectId);
  if (error) throw error;
}