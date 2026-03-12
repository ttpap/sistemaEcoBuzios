import type { EnelRow } from "@/utils/enel-report-pdf";
import { fetchEnelReportRows } from "@/integrations/supabase/enel-report";

export const enelReportService = {
  async fetchRows(input: { projectId: string; month: string }): Promise<EnelRow[]> {
    return await fetchEnelReportRows(input.projectId, input.month);
  },
};
