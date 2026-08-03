import { supabase } from "@/integrations/supabase/client";

export type EditalStatus = "inscrito" | "aprovado" | "reprovado";

export interface Edital {
  id: string;
  title: string;
  agency?: string | null;
  notice_number?: string | null;
  url?: string | null;
  amount?: number | null;
  submission_date?: string | null;
  result_date?: string | null;
  status: EditalStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type EditalInput = {
  title: string;
  agency?: string | null;
  notice_number?: string | null;
  url?: string | null;
  amount?: number | null;
  submission_date?: string | null;
  result_date?: string | null;
  status: EditalStatus;
  notes?: string | null;
};

export async function fetchEditais(): Promise<Edital[]> {
  const { data, error } = await (supabase as any)
    .from("editais")
    .select("*")
    .order("submission_date", { ascending: false, nullsFirst: false })
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
