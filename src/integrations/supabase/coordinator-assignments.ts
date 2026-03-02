import { supabase } from "@/integrations/supabase/client";

export type CoordinatorProjectAssignmentRow = {
  coordinator_id: string;
  project_id: string;
  created_at: string;
};

export async function fetchCoordinatorAssignments(): Promise<CoordinatorProjectAssignmentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("coordinator_project_assignments").select("*");
  if (error || !data) return [];
  return data as CoordinatorProjectAssignmentRow[];
}

export async function assignCoordinatorToProjectRemote(coordinatorId: string, projectId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("coordinator_project_assignments")
    .upsert({ coordinator_id: coordinatorId, project_id: projectId });
  if (error) throw error;
}

export async function removeCoordinatorFromProjectRemote(coordinatorId: string, projectId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("coordinator_project_assignments")
    .delete()
    .eq("coordinator_id", coordinatorId)
    .eq("project_id", projectId);
  if (error) throw error;
}
