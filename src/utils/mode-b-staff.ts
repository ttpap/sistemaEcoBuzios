import { supabase } from "@/integrations/supabase/client";
import { ensureModeBAuthUser } from "@/integrations/supabase/mode-b-auth";

const DEFAULT_STAFF_PASSWORD = "EcoBuzios123";

type StaffKind = "teacher" | "coordinator";

async function ensureAuthUser(kind: StaffKind, login: string, password: string) {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const email = `${kind}+${login}@ecobuzios.local`;

  // 1) Tenta entrar direto (usuário já existe)
  const signIn1 = await supabase.auth.signInWithPassword({ email, password: DEFAULT_STAFF_PASSWORD });
  if (!signIn1.error) return;

  // 2) Garante/cria o usuário via Edge Function (sem disparar email / sem rate limit)
  await ensureModeBAuthUser({ kind, login, password });

  // 3) Entra novamente
  const signIn2 = await supabase.auth.signInWithPassword({ email, password: DEFAULT_STAFF_PASSWORD });
  if (signIn2.error) throw signIn2.error;
}

export async function ensureTeacherAuthForModeB(input: { login: string; password: string }) {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();
  if (!login || !password) throw new Error("Sessão do professor não encontrada");
  await ensureAuthUser("teacher", login, password);
}

export async function ensureCoordinatorAuthForModeB(input: { login: string; password: string }) {
  const login = (input.login || "").trim();
  const password = (input.password || "").trim();
  if (!login || !password) throw new Error("Sessão do coordenador não encontrada");
  await ensureAuthUser("coordinator", login, password);
}