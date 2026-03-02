import { createClient } from "@supabase/supabase-js";

// Prefer deploy-time env vars, but fall back to the default Supabase project so
// production deploys (e.g. Vercel) don't break if vars weren't configured.
const fallbackUrl = "https://ixgujnhdjrgoakqzdkgx.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Z3VqbmhkanJnb2FrcXpka2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjAxMDUsImV4cCI6MjA4ODAzNjEwNX0.rVAo8NjqH9NF-2l_pu4DzPY-wxnXOLJh92dvXb9oBNI";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseUsingFallbackConfig =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export function requireSupabase() {
  return supabase;
}