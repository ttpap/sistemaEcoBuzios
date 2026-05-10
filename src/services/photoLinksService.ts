import { supabase } from "@/integrations/supabase/client";

export type PhotoLink = {
  id: string;
  project_id: string;
  project_name: string;
  photographer_id: string;
  photographer_name: string;
  month: number;
  year: number;
  description: string;
  url: string;
  created_at: string;
};

export async function listPhotoLinksForPhotographer(login: string, password: string): Promise<PhotoLink[]> {
  const { data, error } = await supabase.rpc("mode_b_list_photo_links_for_photographer", {
    p_login: login,
    p_password: password,
  });
  if (error) throw error;
  return (data || []) as PhotoLink[];
}

export async function listPhotoLinksForProject(
  login: string,
  password: string,
  projectId: string,
): Promise<PhotoLink[]> {
  const { data, error } = await supabase.rpc("mode_b_list_photo_links_for_project", {
    p_login: login,
    p_password: password,
    p_project_id: projectId,
  });
  if (error) throw error;
  return (data || []) as PhotoLink[];
}

export async function upsertPhotoLinkAsPhotographer(
  login: string,
  password: string,
  input: {
    id?: string | null;
    projectId: string;
    month: number;
    year: number;
    description: string;
    url: string;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc("mode_b_upsert_photo_link", {
    p_login: login,
    p_password: password,
    p_id: input.id || null,
    p_project_id: input.projectId,
    p_month: input.month,
    p_year: input.year,
    p_description: input.description,
    p_url: input.url,
  });
  if (error) throw error;
  return data as string;
}

export async function deletePhotoLinkAsPhotographer(login: string, password: string, id: string): Promise<void> {
  const { error } = await supabase.rpc("mode_b_delete_photo_link", {
    p_login: login,
    p_password: password,
    p_id: id,
  });
  if (error) throw error;
}

// Admin: read all photo_links directly via RLS
export async function listAllPhotoLinksAdmin(): Promise<PhotoLink[]> {
  const { data, error } = await supabase
    .from("photo_links")
    .select(`
      id, project_id, photographer_id, month, year, description, url, created_at,
      project:projects(id, name),
      photographer:photographers(id, full_name)
    `)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    project_name: row.project?.name || "",
    photographer_id: row.photographer_id,
    photographer_name: row.photographer?.full_name || "",
    month: row.month,
    year: row.year,
    description: row.description,
    url: row.url,
    created_at: row.created_at,
  })) as PhotoLink[];
}

export async function deletePhotoLinkAdmin(id: string): Promise<void> {
  const { error } = await supabase.from("photo_links").delete().eq("id", id);
  if (error) throw error;
}
