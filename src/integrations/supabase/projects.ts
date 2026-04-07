import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

const SELECT_COLS = "id,name,image_url,created_at,finalized_at";

function mapRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
    finalizedAt: row.finalized_at ?? null,
  };
}

// ------------------------------------------------------------
// Remote helpers used by src/utils/projects.ts
// These are best-effort: they fall back to local storage when Supabase fails.
// ------------------------------------------------------------

export async function fetchProjectsRemote(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(SELECT_COLS)
    .is("finalized_at", null)
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
    .select(SELECT_COLS)
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

export async function fetchProjectsFromDb(options?: { includeFinalized?: boolean }): Promise<Project[]> {
  let q = supabase
    .from("projects")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });

  if (!options?.includeFinalized) {
    q = q.is("finalized_at", null);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data || []).map(mapRow);
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
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return mapRow(data);
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
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function setProjectFinalizedInDb(projectId: string, finalized: boolean): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ finalized_at: finalized ? new Date().toISOString() : null })
    .eq("id", projectId)
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return mapRow(data);
}
