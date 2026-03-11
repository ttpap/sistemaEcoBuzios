import { createClient } from "@supabase/supabase-js";

// Cliente "público" (anon) que não reutiliza a sessão do usuário logado.
// Isso evita que o link público falhe quando o navegador já tem sessão (ex.: professor/coordenador).
const fallbackUrl = "https://ixgujnhdjrgoakqzdkgx.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Z3VqbmhkanJnb2FrcXpka2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjAxMDUsImV4cCI6MjA4ODAzNjEwNX0.rVAo8NjqH9NF-2l_pu4DzPY-wxnXOLJh92dvXb9oBNI";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackAnonKey;

export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    storageKey: "ecobuzios_public_anon",
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
