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

export async function fetchStudentJustificationsForClassMonthRemote(input: {
  projectId: string;
  classId: string;
  month: string; // YYYY-MM
}) {
  if (!supabase) return [] as StudentJustification[];

  // 1) Tentativa normal (RLS pode retornar vazio)
  const start = `${input.month}-01`;
  const end = new Date(`${input.month}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endYmd = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("student_justifications")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("class_id", input.classId)
    .gte("date", start)
    .lt("date", endYmd)
    .order("created_at", { ascending: false });

  if (!error && Array.isArray(data) && data.length > 0) {
    return data.map(mapRow);
  }

  // 2) Fallback (Modo B): RPC SECURITY DEFINER.
  const { data: rpcData, error: rpcErr } = await supabase.rpc("mode_b_class_month_justifications", {
    p_project_id: input.projectId,
    p_class_id: input.classId,
    p_month: input.month,
  });

  if (rpcErr || !rpcData) return [];

  return (rpcData as any[]).map((r) => ({
    id: r.id,
    projectId: input.projectId,
    classId: input.classId,
    studentId: r.student_id,
    date: r.ymd,
    message: r.message,
    createdAt: r.created_at,
  }));
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