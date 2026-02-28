import { supabase } from "@/integrations/supabase/client";
import type { TeacherRegistration } from "@/types/teacher";
import { mapTeacherRowToModel, mapTeacherModelToRow } from "@/integrations/supabase/mappers";

export async function fetchTeachers(): Promise<TeacherRegistration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error || !data) return [];
  return data.map(mapTeacherRowToModel);
}

export async function fetchTeacherById(id: string): Promise<TeacherRegistration | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from("teachers").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapTeacherRowToModel(data);
}

export async function upsertTeacher(input: TeacherRegistration) {
  if (!supabase) return;
  const row = mapTeacherModelToRow(input);
  const { error } = await supabase.from("teachers").upsert(row);
  if (error) throw error;
}

export async function deleteTeacher(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw error;
}
