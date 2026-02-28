import { supabase } from "@/integrations/supabase/client";

export type TeacherProjectAssignmentRow = {
  teacher_id: string;
  project_id: string;
  created_at: string;
};

export async function fetchTeacherAssignments(): Promise<TeacherProjectAssignmentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("teacher_project_assignments").select("*");
  if (error || !data) return [];
  return data as TeacherProjectAssignmentRow[];
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
