import { supabase } from "@/integrations/supabase/client";
import { ensureStudentAuthForModeB } from "@/utils/mode-b-student";

export type ModeBStudentMonthRow = {
  ymd: string;
  class_id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  finalized_at: string | null;
  status: string | null;
  justification_message: string | null;
};

export async function fetchModeBStudentMonthSchedule(input: {
  projectId: string;
  studentId: string;
  month: string; // YYYY-MM
}): Promise<ModeBStudentMonthRow[]> {
  await ensureStudentAuthForModeB();

  const { data, error } = await supabase.rpc("mode_b_student_month_schedule", {
    p_project_id: input.projectId,
    p_student_id: input.studentId,
    p_month: input.month,
  });

  if (error || !data) return [];
  return data as ModeBStudentMonthRow[];
}
