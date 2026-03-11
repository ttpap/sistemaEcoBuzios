import { createClient } from "@supabase/supabase-js";
import { getSupabaseRuntimeConfig } from "@/integrations/supabase/runtime-config";

// Prefer deploy-time env vars. If you need to point to a different Supabase project without redeploy,
// you can set a runtime config in localStorage.
const fallbackUrl = "https://ixgujnhdjrgoakqzdkgx.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Z3VqbmhkanJnb2FrcXpka2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjAxMDUsImV4cCI6MjA4ODAzNjEwNX0.rVAo8NjqH9NF-2l_pu4DzPY-wxnXOLJh92dvXb9oBNI";

const runtime = getSupabaseRuntimeConfig();

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseUrl = runtime?.url ?? envUrl ?? fallbackUrl;
export const supabaseAnonKey = runtime?.anonKey ?? envAnon ?? fallbackAnonKey;

export const supabaseConfigSource: "runtime" | "env" | "fallback" = runtime
  ? "runtime"
  : envUrl && envAnon
    ? "env"
    : "fallback";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseUsingFallbackConfig = supabaseConfigSource === "fallback";

export function requireSupabase() {
  return supabase;
}