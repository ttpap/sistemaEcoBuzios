import type { MonthlyReport } from "@/types/monthly-report";
import {
  fetchMonthlyReportsRemote,
  upsertMonthlyReportRemote,
} from "@/integrations/supabase/monthly-reports";

export const monthlyReportsService = {
  fetchReports(projectId: string) {
    return fetchMonthlyReportsRemote(projectId);
  },
  upsertReport(report: MonthlyReport) {
    return upsertMonthlyReportRemote(report);
  },
};
