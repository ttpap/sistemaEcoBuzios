import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Filtro opcional por projetos: ?projetos=id1,id2
    const projetosParam = url.searchParams.get("projetos");
    const projectIds = projetosParam
      ? projetosParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Chama a RPC existente que já agrega todos os dados
    const rpcParams = projectIds ? { p_project_ids: projectIds } : {};
    const { data: charts, error: rpcErr } = await client.rpc("public_dashboard_charts", rpcParams);

    if (rpcErr || !charts) {
      console.error("[public-stats-api] rpc error", rpcErr);
      return new Response(JSON.stringify({ ok: false, error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
