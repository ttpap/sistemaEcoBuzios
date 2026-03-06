import type { TeacherRegistration } from "@/types/teacher";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { mapTeacherModelToRow, mapCoordinatorModelToRow } from "@/integrations/supabase/mappers";

export async function insertTeacherPublic(input: TeacherRegistration, token: string) {
  const row = mapTeacherModelToRow(input);

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-staff-signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ token, row }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível enviar o cadastro.");
}

export async function insertCoordinatorPublic(input: CoordinatorRegistration, token: string) {
  const row = mapCoordinatorModelToRow(input);

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-staff-signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ token, row }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível enviar o cadastro.");
}