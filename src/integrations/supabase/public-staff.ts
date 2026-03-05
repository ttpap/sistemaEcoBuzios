import type { TeacherRegistration } from "@/types/teacher";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { publicSupabase } from "@/integrations/supabase/public-client";
import { mapTeacherModelToRow, mapCoordinatorModelToRow } from "@/integrations/supabase/mappers";

export async function insertTeacherPublic(input: TeacherRegistration) {
  const row = mapTeacherModelToRow(input);
  const { error } = await publicSupabase.from("teachers").insert(row);
  if (error) throw error;
}

export async function insertCoordinatorPublic(input: CoordinatorRegistration) {
  const row = mapCoordinatorModelToRow(input);
  const { error } = await publicSupabase.from("coordinators").insert(row);
  if (error) throw error;
}
