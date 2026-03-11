import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STUDENT_PASSWORD, getStudentSessionLogin } from "@/utils/student-auth";

export async function ensureStudentAuthForModeB() {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const login = getStudentSessionLogin();
  if (!login) throw new Error("Sessão do aluno não encontrada");

  // Email determinístico do aluno para Supabase Auth
  const email = `student+${login}@ecobuzios.local`;
  const password = DEFAULT_STUDENT_PASSWORD;

  // Se já existir, o signUp pode retornar "User already registered".
  await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `Aluno ${login}` },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && !String(error.message || "").toLowerCase().includes("already registered")) {
    // Se cair aqui, geralmente é senha errada ou bloqueio.
    throw error;
  }
}