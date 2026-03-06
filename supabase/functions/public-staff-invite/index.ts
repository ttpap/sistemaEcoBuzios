import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StaffRole = "teacher" | "coordinator";

function base64UrlEncode(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(obj: unknown) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
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

function isRole(v: string): v is StaffRole {
  return v === "teacher" || v === "coordinator";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const inviteSecret = Deno.env.get("STAFF_PUBLIC_INVITE_SECRET");

    if (!supabaseUrl || !serviceKey || !inviteSecret) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    if (profileErr || profile?.role !== "admin") {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const role = String(payload?.role ?? "");

    if (!isRole(role)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresInSeconds = 60 * 60 * 24 * 14; // 14 dias
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const tokenPayload = {
      v: 1,
      role,
      exp,
      iat: Math.floor(Date.now() / 1000),
    };

    const body = base64UrlEncodeJson(tokenPayload);
    const sig = await signHmacSha256(inviteSecret, body);
    const token = `${body}.${sig}`;

    return new Response(
      JSON.stringify({ ok: true, token, expiresAt: new Date(exp * 1000).toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[public-staff-invite] unexpected error", { e });
    return new Response(JSON.stringify({ ok: false, error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
