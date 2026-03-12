import type { CoordinatorMonthlyReport } from "@/types/coordinator-monthly-report";
import {
  fetchCoordinatorMonthlyReportsRemote,
  upsertCoordinatorMonthlyReportRemote,
} from "@/integrations/supabase/coordinator-monthly-reports";

export const coordinatorMonthlyReportsService = {
  fetchReports(projectId: string) {
    return fetchCoordinatorMonthlyReportsRemote(projectId);
  },
  upsertReport(report: CoordinatorMonthlyReport) {
    return upsertCoordinatorMonthlyReportRemote(report);
  },
};
