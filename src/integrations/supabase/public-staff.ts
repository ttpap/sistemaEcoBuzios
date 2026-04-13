import type { TeacherRegistration } from "@/types/teacher";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { mapTeacherModelToRow, mapCoordinatorModelToRow } from "@/integrations/supabase/mappers";
import { supabase } from "@/integrations/supabase/client";

export async function insertTeacherPublic(input: TeacherRegistration, token: string) {
  const row = mapTeacherModelToRow(input);

  const { data, error } = await supabase.rpc("public_staff_signup", {
    p_token: token,
    p_row: row,
  });

  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; error?: string } | null;
  if (!result?.ok) throw new Error(result?.error || "Não foi possível enviar o cadastro.");
}

export async function insertCoordinatorPublic(input: CoordinatorRegistration, token: string) {
  const row = mapCoordinatorModelToRow(input);

  const { data, error } = await supabase.rpc("public_staff_signup", {
    p_token: token,
    p_row: row,
  });

  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; error?: string } | null;
  if (!result?.ok) throw new Error(result?.error || "Não foi possível enviar o cadastro.");
}
