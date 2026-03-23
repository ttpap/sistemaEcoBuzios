import { supabase } from "@/integrations/supabase/client";
import type { CoordinatorMonthlyReport } from "@/types/coordinator-monthly-report";
import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

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

function getModeBStaffCreds(): { login: string; password: string } | null {
  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  // professor pode visualizar (lista) relatórios do coordenador no admin/coordenador? mantemos suporte para listagem.
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  return null;
}

function isRpcMissingErrorMessage(msgLower: string) {
  return (
    msgLower.includes("does not exist") ||
    (msgLower.includes("function") && msgLower.includes("mode_b_")) ||
    msgLower.includes("mode_b_list_coordinator_monthly_reports") ||
    msgLower.includes("mode_b_upsert_coordinator_monthly_report")
  );
}

export async function fetchCoordinatorMonthlyReportsRemote(projectId: string) {
  if (!supabase) return [] as CoordinatorMonthlyReport[];

  // Mode B (credential-based login): use the SECURITY DEFINER RPC directly.
  // The direct SELECT against the table fails silently (returns [] instead of an error)
  // when the user has no Supabase Auth session, because RLS policies are TO authenticated
  // and the anon role gets zero rows. The RPC bypasses RLS correctly.
  const creds = getModeBStaffCreds();
  if (creds) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_coordinator_monthly_reports", {
      p_login: creds.login,
      p_password: creds.password,
      p_project_id: projectId,
    });

    if (rpcErr) {
      const msg = String(rpcErr.message || "").toLowerCase();
      if (isRpcMissingErrorMessage(msg)) {
        throw new Error(
          "Servidor não atualizado: RPC mode_b_list_coordinator_monthly_reports ausente. Aplique a migração 0020_mode_b_monthly_reports.sql no Supabase.",
        );
      }
      throw rpcErr;
    }

    return ((rpcData as any[]) || []).map((r) =>
      mapRow({
        ...r,
        project_id: r.project_id,
        coordinator_id: r.coordinator_id,
        strategy_html: r.strategy_html,
        adaptation_html: r.adaptation_html,
        observation_html: r.observation_html,
        created_at: r.created_at,
        updated_at: r.updated_at,
        submitted_at: r.submitted_at,
      }),
    );
  }

  // Supabase Auth users (admin): direct SELECT works because RLS policies match authenticated role.
  const { data, error } = await supabase
    .from("coordinator_monthly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function upsertCoordinatorMonthlyReportRemote(report: CoordinatorMonthlyReport) {
  if (!supabase) return;

  // Mode B: use RPC directly (same rationale as fetchCoordinatorMonthlyReportsRemote).
  const creds = getModeBStaffCreds();
  if (creds) {
    const { error: rpcErr } = await supabase.rpc("mode_b_upsert_coordinator_monthly_report", {
      p_login: creds.login,
      p_password: creds.password,
      p_id: report.id,
      p_project_id: report.projectId,
      p_coordinator_id: report.coordinatorId,
      p_month: report.month,
      p_strategy_html: report.strategyHtml,
      p_adaptation_html: report.adaptationHtml,
      p_observation_html: report.observationHtml,
      p_created_at: report.createdAt,
      p_updated_at: report.updatedAt,
      p_submitted_at: report.submittedAt ?? null,
    });

    if (rpcErr) {
      const msg = String(rpcErr.message || "").toLowerCase();
      if (isRpcMissingErrorMessage(msg)) {
        throw new Error(
          "Servidor não atualizado: RPC mode_b_upsert_coordinator_monthly_report ausente. Aplique a migração 0020_mode_b_monthly_reports.sql no Supabase.",
        );
      }
      throw rpcErr;
    }
    return;
  }

  // Supabase Auth users (admin): direct upsert works via RLS.
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