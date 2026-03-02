import { supabase } from "@/integrations/supabase/client";
import type { MonthlyReport } from "@/types/monthly-report";

function mapRow(row: any): MonthlyReport {
  return {
    id: row.id,
    projectId: row.project_id,
    teacherId: row.teacher_id,
    month: row.month,
    strategyHtml: row.strategy_html,
    adaptationHtml: row.adaptation_html,
    observationHtml: row.observation_html,
    reflexiveStudentId: row.reflexive_student_id ?? undefined,
    positiveStudentId: row.positive_student_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at ?? undefined,
  };
}

export async function fetchMonthlyReportsRemote(projectId: string) {
  if (!supabase) return [] as MonthlyReport[];
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertMonthlyReportRemote(report: MonthlyReport) {
  if (!supabase) return;
  const row = {
    id: report.id,
    project_id: report.projectId,
    teacher_id: report.teacherId,
    month: report.month,
    strategy_html: report.strategyHtml,
    adaptation_html: report.adaptationHtml,
    observation_html: report.observationHtml,
    reflexive_student_id: report.reflexiveStudentId ?? null,
    positive_student_id: report.positiveStudentId ?? null,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
    submitted_at: report.submittedAt ?? null,
  };

  const { error } = await supabase.from("monthly_reports").upsert(row);
  if (error) throw error;
}
