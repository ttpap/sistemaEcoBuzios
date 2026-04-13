import { supabase } from "@/integrations/supabase/client";

export type StaffInviteRole = "teacher" | "coordinator";

export async function createStaffPublicInvite(role: StaffInviteRole) {
  const { data, error } = await supabase.rpc("create_staff_public_invite", {
    p_role: role,
  });

  if (error) throw error;
  const result = data as { ok: boolean; token: string; expiresAt: string } | null;
  if (!result?.token) throw new Error("Não foi possível gerar o link.");

  return result;
}
