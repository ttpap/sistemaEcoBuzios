import { createClient } from "@supabase/supabase-js";

// Dyad/Supabase integration provides these env vars at build/runtime.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the error explicit so deployment misconfigurations are obvious.
  throw new Error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
