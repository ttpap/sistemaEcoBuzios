import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

function mapRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchModeBStaffProjects(input: { login: string; password: string }) {
  const { data, error } = await supabase.rpc("mode_b_list_projects_staff", {
    p_login: input.login,
    p_password: input.password,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível listar projetos (staff)."
    );
  }

  if (!data) return [] as Project[];
  return (data as any[]).map(mapRow);
}

export async function fetchModeBStudentProjects(input: { registrationOrLast4: string; password: string }) {
  const { data, error } = await supabase.rpc("mode_b_list_projects_student", {
    p_registration_or_last4: input.registrationOrLast4,
    p_password: input.password,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível listar projetos (aluno)."
    );
  }

  if (!data) return [] as Project[];
  return (data as any[]).map(mapRow);
}