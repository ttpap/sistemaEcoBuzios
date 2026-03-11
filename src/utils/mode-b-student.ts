import { supabase } from "@/integrations/supabase/client";
import { ensureModeBAuthUser } from "@/integrations/supabase/mode-b-auth";
import { DEFAULT_STUDENT_PASSWORD } from "@/utils/student-auth";

const DEFAULT_PASSWORD = "EcoBuzios123";

async function ensureAuthUser(login: string) {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const email = `student+${login}@ecobuzios.local`;

  // 1) Tenta entrar direto (usuário já existe)
  const signIn1 = await supabase.auth.signInWithPassword({ email, password: DEFAULT_STUDENT_PASSWORD });
  if (!signIn1.error) return;

  // 2) Garante/cria o usuário via Edge Function (sem disparar email / sem rate limit)
  await ensureModeBAuthUser({ kind: "student", login, password: DEFAULT_PASSWORD });

  // 3) Entra novamente
  const signIn2 = await supabase.auth.signInWithPassword({ email, password: DEFAULT_STUDENT_PASSWORD });
  if (signIn2.error) throw signIn2.error;
}

export async function ensureStudentAuthForModeB(input: { login: string }) {
  const login = (input.login || "").trim();
  if (!login) throw new Error("Sessão do aluno não encontrada");
  await ensureAuthUser(login);
}