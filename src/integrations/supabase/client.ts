import { createClient } from "@supabase/supabase-js";

// ETAPA 1 (ADR-001): o app deve usar UM Supabase oficial via env.
// Não existe fallback silencioso e não existe configuração runtime.

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(envUrl && envAnonKey);

// Mantemos exports para diagnóstico (ex.: /db-status)
export const supabaseUrl = envUrl || "";
export const supabaseAnonKey = envAnonKey || "";

// Sinaliza ausência de ENV (não existe fallback para outro projeto)
export const supabaseEnvMissing = !supabaseConfigured;

// Evita quebrar o app em runtime quando env não estiver definido.
// Isso NÃO é fallback para outro projeto; é apenas um cliente inválido.
const INVALID_URL = "https://invalid.supabase.invalid";
const INVALID_KEY = "invalid";

export const supabase = createClient(
  supabaseConfigured ? (envUrl as string) : INVALID_URL,
  supabaseConfigured ? (envAnonKey as string) : INVALID_KEY,
);

export function requireSupabase() {
  return supabase;
}