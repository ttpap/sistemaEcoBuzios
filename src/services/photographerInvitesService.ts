import { supabase } from "@/integrations/supabase/client";

export async function createPhotographerInvite(): Promise<{ token: string; expires_at: string }> {
  const { data, error } = await supabase.rpc("create_photographer_invite");
  if (error) throw error;
  const row = (data as any[])?.[0];
  if (!row?.token) throw new Error("Não foi possível gerar o link.");
  return { token: row.token, expires_at: row.expires_at };
}

export async function checkPhotographerInvite(token: string): Promise<{ valid: boolean; reason: string }> {
  const { data, error } = await supabase.rpc("check_photographer_invite", { p_token: token });
  if (error) throw error;
  const row = (data as any[])?.[0];
  return { valid: Boolean(row?.valid), reason: String(row?.reason || "") };
}

export async function consumePhotographerInvite(input: {
  token: string;
  fullName: string;
  email?: string;
  login: string;
  password: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("consume_photographer_invite", {
    p_token: input.token,
    p_full_name: input.fullName,
    p_email: input.email || "",
    p_login: input.login,
    p_password: input.password,
  });
  if (error) throw error;
  const row = (data as any[])?.[0];
  if (!row?.photographer_id) throw new Error("Falha ao concluir cadastro.");
  return row.photographer_id as string;
}
