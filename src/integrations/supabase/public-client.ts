import { createClient } from "@supabase/supabase-js";

// ETAPA 1 (ADR-001): cliente público também deve usar apenas env.

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseConfigured = Boolean(envUrl && envAnonKey);

// Evita quebrar o app em runtime quando env não estiver definido.
// Isso NÃO é fallback para outro projeto; é apenas um cliente inválido.
const INVALID_URL = "https://invalid.supabase.invalid";
const INVALID_KEY = "invalid";

export const publicSupabase = createClient(
  supabaseConfigured ? (envUrl as string) : INVALID_URL,
  supabaseConfigured ? (envAnonKey as string) : INVALID_KEY,
  {
    auth: {
      persistSession: false,
      storageKey: "ecobuzios_public_anon",
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
