import type { EnelRow } from "@/utils/enel-report-pdf";
import { fetchEnelReportRows, fetchEnelReportRowsMulti } from "@/integrations/supabase/enel-report";

export const enelReportService = {
  async fetchRows(input: { projectId: string; month: string; classId?: string | null }): Promise<EnelRow[]> {
    return await fetchEnelReportRows(input.projectId, input.month, input.classId);
  },
  async fetchRowsMulti(input: { projectId: string; month: string; classIds: string[] }): Promise<EnelRow[]> {
    return await fetchEnelReportRowsMulti(input.projectId, input.month, input.classIds);
  },
};
