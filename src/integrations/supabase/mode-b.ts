import { supabase } from "@/integrations/supabase/client";

export type ModeBStudentMonthRow = {
  ymd: string; // YYYY-MM-DD
  class_id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  finalized_at: string | null;
  status: "presente" | "falta" | "atrasado" | "justificada" | null;
  justification_message: string | null;
};

export async function fetchModeBStudentMonthSchedule(input: {
  projectId: string;
  studentId: string;
  month: string; // YYYY-MM
}) {
  const { data, error } = await supabase.rpc("mode_b_student_month_schedule", {
    p_project_id: input.projectId,
    p_student_id: input.studentId,
    p_month: input.month,
  });
  if (error || !data) return [] as ModeBStudentMonthRow[];
  return data as unknown as ModeBStudentMonthRow[];
}

export async function setModeBStudentJustification(input: {
  projectId: string;
  classId: string;
  studentId: string;
  ymd: string; // YYYY-MM-DD
  message: string;
}) {
  const { data, error } = await supabase.rpc("mode_b_set_student_justification", {
    p_project_id: input.projectId,
    p_class_id: input.classId,
    p_student_id: input.studentId,
    p_date: input.ymd,
    p_message: input.message,
  });
  if (error) throw error;
  return data as unknown as string; // uuid
}

export type ModeBClassJustificationRow = {
  id: string;
  student_id: string;
  ymd: string;
  message: string;
  created_at: string;
};

export async function fetchModeBClassMonthJustifications(input: {
  projectId: string;
  classId: string;
  month: string; // YYYY-MM
}) {
  const { data, error } = await supabase.rpc("mode_b_class_month_justifications", {
    p_project_id: input.projectId,
    p_class_id: input.classId,
    p_month: input.month,
  });
  if (error || !data) return [] as ModeBClassJustificationRow[];
  return data as unknown as ModeBClassJustificationRow[];
}
