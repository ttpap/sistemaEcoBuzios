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

    // Data de corte opcional: ?data_corte=AAAA-MM-DD (alias: ?ate=). Todos os
    // recortes (total, gênero, idade, bairros, instituição, escolaridade,
    // por_projeto e frequência) passam a refletir a posição naquele dia.
    const corteParam = url.searchParams.get("data_corte") ?? url.searchParams.get("ate");
    const corteValida = (v: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    };
    if (corteParam && !corteValida(corteParam)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_data_corte", detail: "use ?data_corte=AAAA-MM-DD" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chama as RPCs em paralelo
    const rpcParams: Record<string, unknown> = projectIds ? { p_project_ids: projectIds } : {};
    const rpcParamsCorte: Record<string, unknown> = { ...rpcParams, ...(corteParam ? { p_ate: corteParam } : {}) };

    // Always fetch all active projects for projetos_lista (filter buttons)
    const { data: allActiveProjects } = await client
      .from("projects")
      .select("id, name")
      .is("finalized_at", null);
    const allActive = allActiveProjects ?? [];
    const allActiveIds = allActive.map((p: { id: string; name: string }) => p.id);

    const activeProjectIds: string[] = projectIds ?? allActiveIds;

    // Pesos fixos de carga horária (1 aula = 2h, demais = 1h flat)
    const HORAS_POR_AULA = 2;
    const HORAS_POR_RELATORIO = 1;
    const HORAS_POR_REUNIAO = 1;
    const HORAS_POR_PRESTACAO = 1;

    const meetingQuery = client
      .from("meeting_minutes")
      .select("id")
      .in("project_id", activeProjectIds);
    const reportsQuery = client
      .from("monthly_reports")
      .select("id")
      .not("submitted_at", "is", null)
      .in("project_id", activeProjectIds);

    const prestacaoQuery = client
      .from("prestacao_contas_reports")
      .select("id")
      .in("project_id", activeProjectIds);

    // Editais não são vinculados a projeto — sempre globais.
    const editaisQuery = client
      .from("editais")
      .select("code, applicant_name, title, situation, status")
      .order("created_at", { ascending: false });

    const [freqResult, meetingResult, reportsResult, prestacaoResult, editaisResult, genderResult, perfilResult] = await Promise.all([
      client.rpc("public_attendance_stats", rpcParamsCorte),
      meetingQuery,
      reportsQuery,
      prestacaoQuery,
      editaisQuery,
      client.rpc("public_gender_stats", rpcParamsCorte),
      client.rpc("public_perfil_stats", rpcParamsCorte),
    ]);

    if (perfilResult.error || !perfilResult.data) {
      console.error("[public-stats-api] rpc error (perfil)", perfilResult.error);
      return new Response(JSON.stringify({ ok: false, error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Perfil na data de corte: geral (alunos únicos) + por_projeto (cada um com os mesmos recortes).
    const { por_projeto: perfilPorProjeto, ...perfil } = perfilResult.data as Record<string, any>;
    const freq = freqResult.data ?? { ano: null, mensal: [], anual: {} };
    const meetings = meetingResult.data ?? [];
    const totalReunioes = meetings.length;
    const totalHorasReunioes = totalReunioes * HORAS_POR_REUNIAO;

    const reports = reportsResult.data ?? [];
    if (reportsResult.error) {
      console.error("[public-stats-api] query error (monthly_reports)", reportsResult.error);
    }
    const totalRelatorios = reports.length;
    const totalHorasRelatorios = totalRelatorios * HORAS_POR_RELATORIO;

    const prestacaoReports = prestacaoResult.data ?? [];
    if (prestacaoResult.error) {
      console.error("[public-stats-api] query error (prestacao_contas_reports)", prestacaoResult.error);
    }
    const totalPrestacaoContas = prestacaoReports.length;
    const totalHorasPrestacoes = totalPrestacaoContas * HORAS_POR_PRESTACAO;

    if (freqResult.error) {
      console.error("[public-stats-api] rpc error (attendance)", freqResult.error);
    }

    if (genderResult.error) {
      console.error("[public-stats-api] rpc error (gender)", genderResult.error);
    }
    const generos = genderResult.data ?? { total: 0, generos: [], por_projeto: [] };

    // --- Editais ---
    type EditalRow = {
      code: string | null;
      applicant_name: string | null;
      title: string;
      situation: string | null;
      status: string;
    };
    const editaisRows = (editaisResult.data ?? []) as EditalRow[];
    if (editaisResult.error) {
      console.error("[public-stats-api] query error (editais)", editaisResult.error);
    }
    const editaisPorStatus = { inscrito: 0, aprovado: 0, reprovado: 0 } as Record<string, number>;
    for (const e of editaisRows) {
      editaisPorStatus[e.status] = (editaisPorStatus[e.status] ?? 0) + 1;
    }
    const editais = {
      total: editaisRows.length,
      por_status: {
        inscrito: editaisPorStatus.inscrito ?? 0,
        aprovado: editaisPorStatus.aprovado ?? 0,
        reprovado: editaisPorStatus.reprovado ?? 0,
      },
      lista: editaisRows.map((e) => ({
        codigo: e.code,
        nome: e.applicant_name,
        titulo: e.title,
        situacao: e.situation,
        status: e.status,
      })),
    };

    const response = {
      ok: true,
      gerado_em: new Date().toISOString(),
      filtro_projetos: projectIds ?? "todos",
      data_corte: perfil.data_corte,
      projetos_lista: allActive.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      // Soma das matrículas por projeto (aluno em 2 projetos conta 2x).
      total_alunos_em_turmas: perfil.total_matriculas_por_projeto ?? 0,
      // Cada aluno uma vez só, mesmo estando em mais de um projeto.
      alunos_unicos: perfil.alunos_unicos ?? 0,
      por_projeto: perfilPorProjeto ?? [],
      bairros: perfil.bairros ?? [],
      instituicao: perfil.instituicao ?? [],
      idades: perfil.idades ?? [],
      escolaridade: perfil.escolaridade ?? [],
      generos,
      perfil,
      frequencia: freq,
      reunioes: {
        total: totalReunioes,
        total_horas: totalHorasReunioes,
      },
      horas_aula: {
        total_relatorios_enviados: totalRelatorios,
        total_prestacao_contas: totalPrestacaoContas,
        total_horas: totalHorasRelatorios + totalHorasPrestacoes,
      },
      editais,
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
