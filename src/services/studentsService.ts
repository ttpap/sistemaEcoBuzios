export {
  fetchStudents,
  fetchStudentsRemote,
  fetchStudentsRemoteWithMeta,
  deleteStudent,
  type FetchStudentsIssue,
  type FetchStudentsResult,
} from "@/integrations/supabase/students";

import { supabase } from "@/integrations/supabase/client";
import { publicSupabase } from "@/integrations/supabase/public-client";

export const studentsService = {
  async insert(row: any) {
    const { error } = await supabase.from("students").insert(row);
    if (error) throw error;
  },

  async insertAsAnon(row: any) {
    const { error } = await publicSupabase.from("students").insert(row);
    if (error) throw error;
  },

  async updateById(input: { id: string; row: any }) {
    const { error } = await supabase.from("students").update(input.row).eq("id", input.id);
    if (error) throw error;
  },

  async modeBUpsert(input: { login: string; password: string; projectId: string; row: any }) {
    const { error } = await supabase.rpc("mode_b_upsert_student", {
      p_login: input.login,
      p_password: input.password,
      p_project_id: input.projectId,
      p_row: input.row,
    });

    if (error) throw error;
  },
};