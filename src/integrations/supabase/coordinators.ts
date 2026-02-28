import { supabase } from "@/integrations/supabase/client";
import type { CoordinatorRegistration } from "@/types/coordinator";
import {
  mapCoordinatorRowToModel,
  mapCoordinatorModelToRow,
} from "@/integrations/supabase/mappers";

export async function fetchCoordinators(): Promise<CoordinatorRegistration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("coordinators")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error || !data) return [];
  return data.map(mapCoordinatorRowToModel);
}

export async function fetchCoordinatorById(id: string): Promise<CoordinatorRegistration | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from("coordinators").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapCoordinatorRowToModel(data);
}

export async function upsertCoordinator(input: CoordinatorRegistration) {
  if (!supabase) return;
  const row = mapCoordinatorModelToRow(input);
  const { error } = await supabase.from("coordinators").upsert(row);
  if (error) throw error;
}

export async function deleteCoordinator(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("coordinators").delete().eq("id", id);
  if (error) throw error;
}
