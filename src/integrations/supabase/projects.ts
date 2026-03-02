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

// ------------------------------------------------------------
// Remote helpers used by src/utils/projects.ts
// These are best-effort: they fall back to local storage when Supabase fails.
// ------------------------------------------------------------

export async function fetchProjectsRemote(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertProjectRemote(input: { id?: string; name: string; imageUrl?: string | null }) {
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

  if (error || !data) return null;
  return mapRow(data);
}

export async function deleteProjectRemote(projectId: string) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

// ------------------------------------------------------------
// DB-first helpers used by src/pages/Projects.tsx
// These throw on error (so the UI can show meaningful messages).
// ------------------------------------------------------------

export async function fetchProjectsFromDb(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.image_url || undefined,
    createdAt: p.created_at,
  }));
}

export async function insertProjectToDb(input: { name: string; imageUrl?: string }): Promise<Project> {
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

  return {
    id: data.id,
    name: data.name,
    imageUrl: data.image_url || undefined,
    createdAt: data.created_at,
  };
}

export async function updateProjectInDb(
  projectId: string,
  patch: { name?: string; imageUrl?: string | null },
): Promise<Project> {
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

  return {
    id: data.id,
    name: data.name,
    imageUrl: data.image_url || undefined,
    createdAt: data.created_at,
  };
}
