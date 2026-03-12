import { supabase } from "@/integrations/supabase/client";

export const enelReportService = {
  async fetchRowsRaw(input: { projectId: string; month: string }): Promise<any[]> {
    const { data, error } = await supabase.rpc("enel_report_rows", {
      p_project_id: input.projectId,
      p_month: input.month,
    });

    if (error) throw error;
    return (data || []) as any[];
  },
};
