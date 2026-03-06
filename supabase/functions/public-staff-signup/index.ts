import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StaffRole = "teacher" | "coordinator";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function base64UrlDecodeToString(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signHmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function pick<T extends Record<string, unknown>>(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out as T;
}

const TEACHER_KEYS = [
  "id",
  "full_name",
  "cpf",
  "rg",
  "cnpj",
  "email",
  "cell_phone",
  "gender",
  "photo",
  "cep",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "uf",
  "bank",
  "agency",
  "account",
  "pix_key",
  "auth_login",
  "auth_password",
  "registration_date",
  "status",
];

const COORDINATOR_KEYS = [
  "id",
  "full_name",
  "cpf",
  "rg",
  "cnpj",
  "email",
  "cell_phone",
  "gender",
  "photo",
  "cep",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "uf",
  "bank",
  "agency",
  "account",
  "pix_key",
  "auth_login",
  "auth_password",
  "registration_date",
  "status",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const token = String(payload?.token || "");
    const row = (payload?.row || {}) as Record<string, unknown>;

    const [body, sig] = token.split(".");
    if (!body || !sig) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const inviteSecret = Deno.env.get("STAFF_PUBLIC_INVITE_SECRET");

    if (!supabaseUrl || !serviceKey || !inviteSecret) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSig = await signHmacSha256(inviteSecret, body);
    if (expectedSig !== sig) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenPayload = safeJsonParse<{ v: number; role: StaffRole; exp: number }>(base64UrlDecodeToString(body));
    if (!tokenPayload || tokenPayload.v !== 1 || !tokenPayload.role || !tokenPayload.exp) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Math.floor(Date.now() / 1000) > tokenPayload.exp) {
      return new Response(JSON.stringify({ ok: false, error: "token_expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const id = String(row?.id || "");
    const authLogin = String(row?.auth_login || "");
    const authPassword = String(row?.auth_password || "");

    if (!isUuid(id) || !authLogin.trim() || !authPassword.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (tokenPayload.role === "teacher") {
      const insertRow = pick(row, TEACHER_KEYS);
      const { error } = await supabase.from("teachers").insert(insertRow);
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenPayload.role === "coordinator") {
      const insertRow = pick(row, COORDINATOR_KEYS);
      const { error } = await supabase.from("coordinators").insert(insertRow);
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "invalid_role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[public-staff-signup] unexpected error", { e });
    return new Response(JSON.stringify({ ok: false, error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
