import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Validação de API Key (mesma chave da Dashboard API) ---
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_api_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keyHash = await sha256(apiKey);
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: keyRow, error: keyErr } = await client
    .from("api_keys")
    .select("id, revoked, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !keyRow) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_api_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (keyRow.revoked) {
    return new Response(JSON.stringify({ ok: false, error: "revoked_api_key" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return new Response(JSON.stringify({ ok: false, error: "expired_api_key" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // --- Fim da validação ---

  try {
    const url = new URL(req.url);
    // Filtro opcional por status: ?status=aprovado
    const statusFilter = url.searchParams.get("status");

    let query = client
      .from("editais")
      .select("id, code, applicant_name, title, situation, status, created_at")
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;

    if (error) {
      console.error("[editais-api] query error", error);
      return new Response(JSON.stringify({ ok: false, error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    type Row = {
      id: string;
      code: string | null;
      applicant_name: string | null;
      title: string;
      situation: string | null;
      status: string;
      created_at: string;
    };
    const rows = (data ?? []) as Row[];

    const porStatus = { inscrito: 0, aprovado: 0, reprovado: 0 } as Record<string, number>;
    for (const r of rows) porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;

    const response = {
      ok: true,
      gerado_em: new Date().toISOString(),
      filtro_status: statusFilter ?? "todos",
      total: rows.length,
      por_status: {
        inscrito: porStatus.inscrito ?? 0,
        aprovado: porStatus.aprovado ?? 0,
        reprovado: porStatus.reprovado ?? 0,
      },
      editais: rows.map((r) => ({
        id: r.id,
        codigo: r.code,
        nome: r.applicant_name,
        titulo: r.title,
        situacao: r.situation,
        status: r.status,
        registrado_em: r.created_at,
      })),
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[editais-api] unexpected error", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
