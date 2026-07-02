import { supabase } from "@/integrations/supabase/client";
import type { EnelRow } from "@/utils/enel-report-pdf";

export async function fetchEnelReportRows(
  projectId: string,
  month: string,
  classId?: string | null,
): Promise<EnelRow[]> {
  const params: any = { p_project_id: projectId, p_month: month };
  if (classId) params.p_class_id = classId;

  const { data, error } = await supabase.rpc("enel_report_rows", params);

  if (error) throw error;

  return (data || []).map((r: any) => ({
    studentId: r.student_id ? String(r.student_id) : undefined,
    fullName: String(r.full_name || ""),
    socialName: r.social_name ? String(r.social_name) : undefined,
    cellPhone: String(r.cell_phone || ""),
    birthDate: r.birth_date ? String(r.birth_date) : "",
    age: Number(r.age || 0),
    cpf: String(r.cpf || ""),
    enelClientNumber: String(r.enel_client_number || ""),
    className: String(r.class_name || ""),
  }));
}

/**
 * Filtro por MÚLTIPLAS turmas. A RPC só aceita uma turma por vez, então
 * buscamos cada turma selecionada e deduplicamos por aluno (student_id).
 * Sem turmas selecionadas = todas (uma chamada só).
 *
 * Não dá para buscar "todas" e filtrar por nome no cliente: a RPC devolve
 * 1 linha por aluno com apenas UMA turma (a alfabeticamente 1ª), então alunos
 * de uma turma selecionada, mas cuja linha aponta outra turma, sumiriam.
 */
export async function fetchEnelReportRowsMulti(
  projectId: string,
  month: string,
  classIds: string[],
): Promise<EnelRow[]> {
  if (!classIds.length) return fetchEnelReportRows(projectId, month, null);

  const perClass = await Promise.all(
    classIds.map((id) => fetchEnelReportRows(projectId, month, id)),
  );

  const seen = new Set<string>();
  const merged: EnelRow[] = [];
  for (const rows of perClass) {
    for (const r of rows) {
      const key = r.studentId || `${r.fullName}|${r.cpf}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  }

  merged.sort((a, b) =>
    (a.socialName || a.fullName).localeCompare(b.socialName || b.fullName, "pt-BR"),
  );
  return merged;
}
