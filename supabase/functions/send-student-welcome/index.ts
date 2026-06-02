import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Worker de envio dos emails de boas-vindas ao aluno.
// Drena a fila public.student_welcome_emails respeitando o teto diário do Resend.
// Chamado pelo pg_cron periodicamente. O que não couber hoje fica 'pending'
// e sai no próximo dia automaticamente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DAILY_CAP = Number(Deno.env.get("WELCOME_DAILY_CAP") ?? "90"); // margem sob 100/dia
const ACCESS_URL = Deno.env.get("STUDENT_LOGIN_URL") ?? "https://ecobuziossistema.com.br/aluno/login";
const FROM_EMAIL = Deno.env.get("WELCOME_FROM_EMAIL") ?? "EcoBúzios <boas-vindas@ecobuziossistema.com.br>";
const DEFAULT_PASSWORD = "EcoBuzios123";

function loginFromRegistration(registration: string) {
  const reg = (registration || "").trim();
  const last = reg.includes("-") ? reg.split("-").pop() || "" : reg;
  return last.trim().padStart(4, "0");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmail(fullName: string, login: string) {
  const nome = escapeHtml((fullName || "").split(" ")[0] || "aluno(a)");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:20px;padding:28px;box-shadow:0 6px 24px rgba(0,0,0,.06)">
      <h1 style="color:#b9824b;font-size:22px;margin:0 0 8px">Bem-vindo(a) ao EcoBúzios, ${nome}! 🎉</h1>
      <p style="font-size:15px;line-height:1.6">Sua matrícula foi confirmada. Você já pode acessar o sistema do aluno para acompanhar tudo.</p>

      <div style="background:#f8f4ee;border:1px solid #ece3d6;border-radius:14px;padding:16px;margin:18px 0">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Seus dados de acesso</p>
        <p style="margin:4px 0;font-size:15px"><strong>Login:</strong> ${escapeHtml(login)}</p>
        <p style="margin:4px 0;font-size:15px"><strong>Senha:</strong> ${DEFAULT_PASSWORD}</p>
        <p style="margin:10px 0 0;font-size:13px;color:#6b7280">Recomendamos trocar a senha no primeiro acesso.</p>
      </div>

      <a href="${ACCESS_URL}" style="display:inline-block;background:#b9824b;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px;font-size:15px">Acessar o sistema</a>
      <p style="font-size:12px;color:#6b7280;margin:8px 0 0">ou copie o link: ${escapeHtml(ACCESS_URL)}</p>

      <h2 style="font-size:16px;color:#1f2937;margin:22px 0 8px">O que você encontra no sistema</h2>
      <ul style="font-size:14px;line-height:1.7;padding-left:18px;margin:0">
        <li><strong>Marcações de aula do dia</strong> — veja sua presença nas aulas.</li>
        <li><strong>Justificativas</strong> — envie a justificativa de uma falta.</li>
        <li><strong>Controle de frequência</strong> — acompanhe sua frequência ao longo do tempo.</li>
      </ul>

      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">Este é um email automático, não é necessário responder.</p>
    </div>
  </div></body></html>`;
  const text = `Bem-vindo(a) ao EcoBúzios, ${fullName}!

Sua matrícula foi confirmada. Acesse o sistema do aluno:
${ACCESS_URL}

Login: ${login}
Senha: ${DEFAULT_PASSWORD} (troque no primeiro acesso)

No sistema você encontra:
- Marcações de aula do dia
- Justificativas de falta
- Controle de frequência

Email automático, não responda.`;
  return { html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Segurança opcional: se CRON_SECRET estiver definido, exige o header.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    // Ainda não configurado: não falha, só informa.
    return json({ skipped: true, reason: "RESEND_API_KEY ausente" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Quanto já foi enviado nas últimas 24h → cota restante hoje.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentLast24h, error: countErr } = await supabase
    .from("student_welcome_emails")
    .select("student_id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since);

  if (countErr) return json({ error: countErr.message }, 500);

  const remaining = DAILY_CAP - (sentLast24h ?? 0);
  if (remaining <= 0) return json({ sent: 0, remaining: 0, note: "teto diário atingido; restante fica para amanhã" });

  const { data: pending, error: pendErr } = await supabase
    .from("student_welcome_emails")
    .select("student_id, attempts, students(full_name, email, registration)")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(remaining);

  if (pendErr) return json({ error: pendErr.message }, 500);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of (pending ?? []) as any[]) {
    const s = row.students;
    const email = (s?.email || "").trim();
    if (!email) {
      await supabase.from("student_welcome_emails")
        .update({ status: "skipped", last_error: "sem email" })
        .eq("student_id", row.student_id);
      skipped++;
      continue;
    }

    const login = loginFromRegistration(s?.registration || "");
    const { html, text } = buildEmail(s?.full_name || "", login);

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: "Bem-vindo(a) ao EcoBúzios — seu acesso ao sistema",
          html,
          text,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        const attempts = (row.attempts ?? 0) + 1;
        await supabase.from("student_welcome_emails")
          .update({ status: attempts >= 5 ? "failed" : "pending", attempts, last_error: errText.slice(0, 500) })
          .eq("student_id", row.student_id);
        failed++;
        continue;
      }

      await supabase.from("student_welcome_emails")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("student_id", row.student_id);
      sent++;
    } catch (e) {
      const attempts = (row.attempts ?? 0) + 1;
      await supabase.from("student_welcome_emails")
        .update({ status: attempts >= 5 ? "failed" : "pending", attempts, last_error: String(e).slice(0, 500) })
        .eq("student_id", row.student_id);
      failed++;
    }
  }

  return json({ sent, failed, skipped, remainingQuotaBefore: remaining });
});
