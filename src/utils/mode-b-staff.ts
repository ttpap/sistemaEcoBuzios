import { supabase } from "@/integrations/supabase/client";
import { getTeacherSessionLogin } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin } from "@/utils/coordinator-auth";

const DEFAULT_STAFF_PASSWORD = "EcoBuzios123";

export async function ensureTeacherAuthForModeB() {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const login = getTeacherSessionLogin();
  if (!login) throw new Error("Sessão do professor não encontrada");

  const email = `teacher+${login}@ecobuzios.local`;
  const password = DEFAULT_STAFF_PASSWORD;

  await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `Professor ${login}` },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && !String(error.message || "").toLowerCase().includes("already registered")) {
    throw error;
  }
}

export async function ensureCoordinatorAuthForModeB() {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const login = getCoordinatorSessionLogin();
  if (!login) throw new Error("Sessão do coordenador não encontrada");

  const email = `coordinator+${login}@ecobuzios.local`;
  const password = DEFAULT_STAFF_PASSWORD;

  await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `Coordenador ${login}` },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && !String(error.message || "").toLowerCase().includes("already registered")) {
    throw error;
  }
}
