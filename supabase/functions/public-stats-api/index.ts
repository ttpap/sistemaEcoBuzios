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

  // --- Validação de API Key ---
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

    // Filtro opcional por projetos: ?projetos=id1,id2
    const projetosParam = url.searchParams.get("projetos");
    const projectIds = projetosParam
      ? projetosParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    // Chama as RPCs em paralelo
    const rpcParams: Record<string, unknown> = projectIds ? { p_project_ids: projectIds } : {};

    let activeProjectIds: string[] | null = projectIds;
    if (!activeProjectIds) {
      const { data: activeProjects } = await client
        .from("projects")
        .select("id")
        .is("finalized_at", null);
      activeProjectIds = (activeProjects ?? []).map((p: { id: string }) => p.id);
    }

    const meetingQuery = client
      .from("meeting_minutes")
      .select("duration_hours")
      .in("project_id", activeProjectIds);

    const currentYear = new Date().getFullYear();
    const monthPrefix = `${currentYear}-`;
    const reportsQuery = client
      .from("monthly_reports")
      .select("month, submitted_at")
      .not("submitted_at", "is", null)
      .like("month", `${monthPrefix}%`)
      .in("project_id", activeProjectIds);

    const [chartsResult, freqResult, meetingResult, reportsResult] = await Promise.all([
      client.rpc("public_dashboard_charts", rpcParams),
      client.rpc("public_attendance_stats", rpcParams),
      meetingQuery,
      reportsQuery,
    ]);

    if (chartsResult.error || !chartsResult.data) {
      console.error("[public-stats-api] rpc error (charts)", chartsResult.error);
      return new Response(JSON.stringify({ ok: false, error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const charts = chartsResult.data;
    const freq = freqResult.data ?? { ano: null, mensal: [], anual: {} };
    const meetings = meetingResult.data ?? [];
    const totalReunioes = meetings.length;
    const totalHorasReunioes = meetings.reduce((sum: number, r: { duration_hours: number }) => sum + Number(r.duration_hours), 0);

    const reports = reportsResult.data ?? [];
    if (reportsResult.error) {
      console.error("[public-stats-api] query error (monthly_reports)", reportsResult.error);
    }
    const totalHorasAula = reports.length;

    if (freqResult.error) {
      console.error("[public-stats-api] rpc error (attendance)", freqResult.error);
    }

    // Busca total global de alunos matriculados em turmas
    const totalAlunos = (charts.projectCounts as { name: string; value: number }[])
      ?.reduce((sum: number, p: { value: number }) => sum + p.value, 0) ?? 0;

    const response = {
      ok: true,
      gerado_em: new Date().toISOString(),
      filtro_projetos: projectIds ?? "todos",
      total_alunos_em_turmas: totalAlunos,
      por_projeto: charts.projectCounts ?? [],
      bairros: charts.neighborhoods ?? [],
      instituicao: charts.schoolTypes ?? [],
      idades: charts.ageRanges ?? [],
      frequencia: freq,
      reunioes: {
        total: totalReunioes,
        total_horas: totalHorasReunioes,
      },
      horas_aula: {
        ano: currentYear,
        total_relatorios_enviados: reports.length,
        total_horas: totalHorasAula,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[public-stats-api] unexpected error", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
