import { supabase } from "@/integrations/supabase/client";

export type EditalStatus = "inscrito" | "aprovado" | "reprovado";

export interface Edital {
  id: string;
  code?: string | null;
  applicant_name?: string | null;
  title: string;
  situation?: string | null;
  status: EditalStatus;
  created_at: string;
  updated_at: string;
}

export type EditalInput = {
  code?: string | null;
  applicant_name?: string | null;
  title: string;
  situation?: string | null;
  status: EditalStatus;
};

export async function fetchEditais(): Promise<Edital[]> {
  const { data, error } = await (supabase as any)
    .from("editais")
    .select("id, code, applicant_name, title, situation, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || JSON.stringify(error));
  return data ?? [];
}

export async function createEdital(input: EditalInput): Promise<Edital> {
  const { data, error } = await (supabase as any)
    .from("editais")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function updateEdital(id: string, input: Partial<EditalInput>): Promise<Edital> {
  const { data, error } = await (supabase as any)
    .from("editais")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function deleteEdital(id: string): Promise<void> {
  const { error } = await (supabase as any).from("editais").delete().eq("id", id);
  if (error) throw new Error(error.message || JSON.stringify(error));
}
