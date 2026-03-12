import { supabase } from "@/integrations/supabase/client";

export type EnrollmentRow = { class_id: string; student_id: string };

export const enrollmentsService = {
  async listActiveByProject(input: {
    projectId: string;
    modeBCreds?: { login: string; password: string } | null;
  }): Promise<EnrollmentRow[]> {
    // 1) Tentativa normal (quando o RLS permitir)
    const { data, error } = await supabase
      .from("class_student_enrollments")
      .select("class_id,student_id,classes!inner(project_id)")
      .eq("classes.project_id", input.projectId)
      .is("removed_at", null);

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((r) => ({ class_id: r.class_id, student_id: r.student_id }));
    }

    // 2) Fallback (modo B) por RPC
    if (!input.modeBCreds) return [];

    const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_list_project_enrollments", {
      p_login: input.modeBCreds.login,
      p_password: input.modeBCreds.password,
      p_project_id: input.projectId,
    });

    if (rpcErr || !rpcData) return [];
    return rpcData as EnrollmentRow[];
  },
};
