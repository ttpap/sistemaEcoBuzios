import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

export async function fetchProjectsFromDb() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const projects: Project[] = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.image_url || undefined,
    createdAt: p.created_at,
  }));

  return projects;
}

export async function insertProjectToDb(input: { name: string; imageUrl?: string }) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name.trim(),
      image_url: (input.imageUrl || "").trim() || null,
      created_at: nowIso,
    })
    .select("id, name, image_url, created_at")
    .single();

  if (error) throw error;

  const project: Project = {
    id: data.id,
    name: data.name,
    imageUrl: data.image_url || undefined,
    createdAt: data.created_at,
  };

  return project;
}

export async function updateProjectInDb(projectId: string, patch: { name?: string; imageUrl?: string | null }) {
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: patch.name !== undefined ? patch.name.trim() : undefined,
      image_url:
        patch.imageUrl === undefined
          ? undefined
          : patch.imageUrl === null
            ? null
            : patch.imageUrl.trim() || null,
    })
    .eq("id", projectId)
    .select("id, name, image_url, created_at")
    .single();

  if (error) throw error;

  const project: Project = {
    id: data.id,
    name: data.name,
    imageUrl: data.image_url || undefined,
    createdAt: data.created_at,
  };

  return project;
}
