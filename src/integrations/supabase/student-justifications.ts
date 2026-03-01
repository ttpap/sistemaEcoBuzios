import { supabase } from "@/integrations/supabase/client";

export type StudentJustification = {
  id: string;
  projectId: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  message: string;
  createdAt: string;
};

function mapRow(row: any): StudentJustification {
  return {
    id: row.id,
    projectId: row.project_id,
    classId: row.class_id,
    studentId: row.student_id,
    date: row.date,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function fetchStudentJustificationsRemote(projectId: string) {
  if (!supabase) return [] as StudentJustification[];
  const { data, error } = await supabase
    .from("student_justifications")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertStudentJustificationRemote(j: StudentJustification) {
  if (!supabase) return;
  const row = {
    id: j.id,
    project_id: j.projectId,
    class_id: j.classId,
    student_id: j.studentId,
    date: j.date,
    message: j.message,
    created_at: j.createdAt,
  };
  const { error } = await supabase.from("student_justifications").upsert(row);
  if (error) throw error;
}
