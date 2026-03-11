import { supabase } from "@/integrations/supabase/client";

export type ModeBAuthKind = "teacher" | "coordinator" | "student";

export async function ensureModeBAuthUser(input: { kind: ModeBAuthKind; login: string; password: string }) {
  const { data, error } = await supabase.functions.invoke("mode-b-ensure-auth-user", {
    body: {
      kind: input.kind,
      login: input.login,
      password: input.password,
    },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Não foi possível preparar o acesso.");

  return data as { ok: true; email: string; password: string };
}
