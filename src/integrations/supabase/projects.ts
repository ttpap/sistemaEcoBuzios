import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

function mapRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchProjectsRemote(): Promise<Project[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,image_url,created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertProjectRemote(input: { id?: string; name: string; imageUrl?: string | null }) {
  if (!supabase) return null;
  const row = {
    ...(input.id ? { id: input.id } : null),
    name: input.name,
    image_url: input.imageUrl ?? null,
  };

  const { data, error } = await supabase
    .from("projects")
    .upsert(row)
    .select("id,name,image_url,created_at")
    .single();

  if (error || !data) throw error;
  return mapRow(data);
}

export async function deleteProjectRemote(projectId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}
