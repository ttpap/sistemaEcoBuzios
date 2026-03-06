import { supabase } from "@/integrations/supabase/client";

export type StaffInviteRole = "teacher" | "coordinator";

export async function createStaffPublicInvite(role: StaffInviteRole) {
  const { data, error } = await supabase.functions.invoke("public-staff-invite", {
    body: { role },
  });

  if (error) throw error;
  if (!data?.token) throw new Error("Não foi possível gerar o link.");

  return data as { ok: true; token: string; expiresAt: string };
}
