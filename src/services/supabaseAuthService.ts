import { requireSupabase } from "@/integrations/supabase/client";

export const supabaseAuthService = {
  signInWithPassword(input: { email: string; password: string }) {
    return requireSupabase().auth.signInWithPassword(input);
  },

  signOut() {
    return requireSupabase().auth.signOut();
  },
};
