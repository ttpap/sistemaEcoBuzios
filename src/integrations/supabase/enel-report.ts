import { supabase } from "@/integrations/supabase/client";
import type { EnelRow } from "@/utils/enel-report-pdf";

export async function fetchEnelReportRows(projectId: string, month: string): Promise<EnelRow[]> {
  const { data, error } = await supabase.rpc("enel_report_rows", {
    p_project_id: projectId,
    p_month: month,
  });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    name: String(r.name || ""),
    cellPhone: String(r.cell_phone || ""),
    birthDate: r.birth_date ? String(r.birth_date) : "",
    age: Number(r.age || 0),
    cpf: String(r.cpf || ""),
    enelClientNumber: String(r.enel_client_number || ""),
  }));
}
