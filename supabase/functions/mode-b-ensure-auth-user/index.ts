import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "teacher" | "coordinator" | "student";

function isKind(v: string): v is Kind {
  return v === "teacher" || v === "coordinator" || v === "student";
}

const DEFAULT_PASSWORD = "EcoBuzios123";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const kind = String(payload?.kind ?? "");
    const login = String(payload?.login ?? "").trim();
    const password = String(payload?.password ?? "").trim();

    if (!isKind(kind) || !login || !password) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Valida credenciais via RPC (evita criar usuários arbitrários)
    if (kind === "teacher" || kind === "coordinator") {
      const { data, error } = await admin.rpc("mode_b_login_staff", {
        p_login: login,
        p_password: password,
      });

      const row = Array.isArray(data) ? data[0] : null;
      const role = String(row?.role || "");

      if (error || !row || (kind === "teacher" && role !== "teacher") || (kind === "coordinator" && role !== "coordinator")) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data, error } = await admin.rpc("mode_b_login_student", {
        p_registration_or_last4: login,
        p_password: DEFAULT_PASSWORD,
      });

      const row = Array.isArray(data) ? data[0] : null;
      const reason = String(row?.reason || "");

      if (error || !row || reason) {
        return new Response(JSON.stringify({ ok: false, error: reason || "invalid_credentials" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) Cria (ou garante) usuário auth determinístico sem mandar email
    const email = `${kind}+${login}@ecobuzios.local`;
    const fullName =
      kind === "teacher" ? `Professor ${login}` : kind === "coordinator" ? `Coordenador ${login}` : `Aluno ${login}`;

    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    const msg = String(createErr?.message || "").toLowerCase();
    const okAlreadyExists = msg.includes("already") || msg.includes("exists") || msg.includes("registered");

    if (createErr && !okAlreadyExists) {
      return new Response(JSON.stringify({ ok: false, error: createErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, email, password: DEFAULT_PASSWORD }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[mode-b-ensure-auth-user] unexpected error", { e });
    return new Response(JSON.stringify({ ok: false, error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
