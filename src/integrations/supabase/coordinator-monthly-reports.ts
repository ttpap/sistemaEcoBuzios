import { supabase } from "@/integrations/supabase/client";
import type { CoordinatorMonthlyReport } from "@/types/coordinator-monthly-report";

function mapRow(row: any): CoordinatorMonthlyReport {
  return {
    id: row.id,
    projectId: row.project_id,
    coordinatorId: row.coordinator_id,
    month: row.month,
    strategyHtml: row.strategy_html,
    adaptationHtml: row.adaptation_html,
    observationHtml: row.observation_html,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at ?? undefined,
  };
}

export async function fetchCoordinatorMonthlyReportsRemote(projectId: string) {
  if (!supabase) return [] as CoordinatorMonthlyReport[];
  const { data, error } = await supabase
    .from("coordinator_monthly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertCoordinatorMonthlyReportRemote(report: CoordinatorMonthlyReport) {
  if (!supabase) return;
  const row = {
    id: report.id,
    project_id: report.projectId,
    coordinator_id: report.coordinatorId,
    month: report.month,
    strategy_html: report.strategyHtml,
    adaptation_html: report.adaptationHtml,
    observation_html: report.observationHtml,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
    submitted_at: report.submittedAt ?? null,
  };

  const { error } = await supabase.from("coordinator_monthly_reports").upsert(row);
  if (error) throw error;
}
