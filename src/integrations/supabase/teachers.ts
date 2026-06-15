import { supabase } from "@/integrations/supabase/client";
import type { TeacherRegistration } from "@/types/teacher";
import { mapTeacherRowToModel, mapTeacherModelToRow } from "@/integrations/supabase/mappers";
import { anonRestSelect } from "@/integrations/supabase/rest-fallback";

const TEACHERS_REST = "teachers?select=*&order=registration_date.desc";

export async function fetchTeachers(): Promise<TeacherRegistration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("registration_date", { ascending: false });

  if (!error && data && data.length) return data.map(mapTeacherRowToModel);

  // Fallback: tabela é legível por anon; evita lista vazia por glitch do SDK.
  try {
    const rows = await anonRestSelect(TEACHERS_REST);
    if (rows.length) return rows.map(mapTeacherRowToModel);
  } catch {
    /* mantém o resultado do SDK abaixo */
  }

  if (error || !data) return [];
  return data.map(mapTeacherRowToModel);
}

export async function fetchTeachersWithMeta(): Promise<{ teachers: TeacherRegistration[]; error: any | null }> {
  if (!supabase) return { teachers: [], error: new Error("Supabase não está configurado.") };

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("registration_date", { ascending: false });

  if (!error && data && data.length) {
    return { teachers: data.map(mapTeacherRowToModel), error: null };
  }

  // Fallback via REST anon (teachers tem policy de leitura para anon).
  // Cobre o caso em que o SDK aborta/retorna vazio mesmo com dados no banco.
  try {
    const rows = await anonRestSelect(TEACHERS_REST);
    if (rows.length) return { teachers: rows.map(mapTeacherRowToModel), error: null };
  } catch {
    /* cai no tratamento de erro do SDK abaixo */
  }

  if (error || !data) return { teachers: [], error: error || new Error("Sem dados") };
  return { teachers: data.map(mapTeacherRowToModel), error: null };
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