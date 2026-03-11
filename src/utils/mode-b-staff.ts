import { supabase } from "@/integrations/supabase/client";
import { getTeacherSessionLogin } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin } from "@/utils/coordinator-auth";

const DEFAULT_STAFF_PASSWORD = "EcoBuzios123";

async function ensureAuthUser(email: string, password: string, fullName: string) {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  // 1) Tenta entrar direto (usuário já existe)
  const signIn1 = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn1.error) return;

  // 2) Se falhou, tenta criar (se já existir, ignora erro)
  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  const signUpMsg = String(signUp.error?.message || "").toLowerCase();
  const signUpOk = !signUp.error || signUpMsg.includes("already") || signUpMsg.includes("registered");
  if (!signUpOk) throw signUp.error;

  // 3) Tenta entrar de novo
  const signIn2 = await supabase.auth.signInWithPassword({ email, password });
  if (signIn2.error) throw signIn2.error;
}

export async function ensureTeacherAuthForModeB() {
  const login = getTeacherSessionLogin();
  if (!login) throw new Error("Sessão do professor não encontrada");

  const email = `teacher+${login}@ecobuzios.local`;
  await ensureAuthUser(email, DEFAULT_STAFF_PASSWORD, `Professor ${login}`);
}

export async function ensureCoordinatorAuthForModeB() {
  const login = getCoordinatorSessionLogin();
  if (!login) throw new Error("Sessão do coordenador não encontrada");

  const email = `coordinator+${login}@ecobuzios.local`;
  await ensureAuthUser(email, DEFAULT_STAFF_PASSWORD, `Coordenador ${login}`);
}