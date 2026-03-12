import { supabase } from "@/integrations/supabase/client";

export const projectsService = {
  async countProjects(): Promise<number> {
    const { count, error } = await supabase.from("projects").select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },
};
