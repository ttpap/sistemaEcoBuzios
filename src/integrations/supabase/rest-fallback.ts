import { supabaseUrl, supabaseAnonKey } from "@/integrations/supabase/client";

// Fallback de leitura via REST direto (PostgREST), usando a anon key.
// Serve para tabelas com policy de leitura para `anon` (ex.: teachers,
// teacher_project_assignments). Existe porque o cliente supabase-js pode
// falhar/abortar pontualmente por contenção do lock de auth entre abas,
// deixando telas de admin vazias mesmo com os dados intactos no banco.
export async function anonRestSelect<T = any>(pathAndQuery: string): Promise<T[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado.");
  }
  const res = await fetch(`${supabaseUrl}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  const body = await res.json();
  return Array.isArray(body) ? (body as T[]) : [];
}
