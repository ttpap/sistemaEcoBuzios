import { supabase } from "@/integrations/supabase/client";

export type Photographer = {
  id: string;
  full_name: string;
  email: string | null;
  auth_login: string;
  auth_password: string;
  status: string;
  created_at: string;
};

export type PhotographerAssignment = {
  id: string;
  photographer_id: string;
  project_id: string;
};

export async function fetchPhotographers(): Promise<Photographer[]> {
  const { data, error } = await supabase
    .from("photographers")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data || []) as Photographer[];
}

export async function createPhotographer(input: {
  full_name: string;
  email?: string;
  auth_login: string;
  auth_password: string;
}): Promise<Photographer> {
  const { data, error } = await supabase
    .from("photographers")
    .insert({
      full_name: input.full_name,
      email: input.email || null,
      auth_login: input.auth_login,
      auth_password: input.auth_password,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Photographer;
}

export async function updatePhotographer(id: string, patch: Partial<Photographer>): Promise<void> {
  const { error } = await supabase.from("photographers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePhotographer(id: string): Promise<void> {
  const { error } = await supabase.from("photographers").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPhotographerAssignments(): Promise<PhotographerAssignment[]> {
  const { data, error } = await supabase
    .from("photographer_project_assignments")
    .select("id, photographer_id, project_id");
  if (error) throw error;
  return (data || []) as PhotographerAssignment[];
}

export async function assignPhotographerToProject(photographerId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from("photographer_project_assignments")
    .insert({ photographer_id: photographerId, project_id: projectId });
  if (error && !String(error.message || "").includes("duplicate")) throw error;
}

export async function removePhotographerFromProject(photographerId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from("photographer_project_assignments")
    .delete()
    .eq("photographer_id", photographerId)
    .eq("project_id", projectId);
  if (error) throw error;
}
