import { supabase } from "@/integrations/supabase/client";
import type { StudentRegistration } from "@/types/student";
import { mapStudentRowToModel } from "@/integrations/supabase/mappers";

export async function fetchStudents(): Promise<StudentRegistration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error || !data) return [];
  return data.map(mapStudentRowToModel);
}

export async function deleteStudent(studentId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}
