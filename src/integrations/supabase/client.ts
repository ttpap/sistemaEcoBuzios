import { createClient } from "@supabase/supabase-js";

// Prefer deploy-time env vars, but fall back to the default Supabase project so
// production deploys (e.g. Vercel) don't break if vars weren't configured.
const fallbackUrl = "https://xhqeyaferfpltzdluyfm.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocWV5YWZlcmZwbHR6ZGx1eWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTQwNDksImV4cCI6MjA4Nzc5MDA0OX0.Yx2rO_KCfI4sQ_ywy9C5YMdAgjaMsi45a5Nh9IWRbas";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseUsingFallbackConfig =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export function requireSupabase() {
  return supabase;
}