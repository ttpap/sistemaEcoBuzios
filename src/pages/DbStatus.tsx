import React from "react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, TriangleAlert } from "lucide-react";
import { projectsService } from "@/services/projectsService";
import { supabaseConfigService } from "@/services/supabaseConfigService";

function looksLikeRlsOrPermissionError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("permission denied") ||
    m.includes("row-level security") ||
    m.includes("rls") ||
    m.includes("not allowed")
  );
}

export default function DbStatus() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<
    | { ok: true; projectCount: number }
    | { ok: false; error: string }
    | null
  >(null);

  const run = React.useCallback(async () => {
    setLoading(true);

    if (!supabaseConfigService.supabaseConfigured) {
      setResult({
        ok: false,
        error:
          "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no deploy e recarregue.",
      });
      setLoading(false);
      return;
    }

    try {
      const projectCount = await projectsService.countProjects();
      setResult({ ok: true, projectCount });
    } catch (e: any) {
      const msg = String(e?.message || "Erro ao consultar o banco");

      // Quando RLS está ativo, chamadas sem sessão podem dar "permission denied".
      // Isso não significa que não conectou — significa que a segurança bloqueou.
      if (looksLikeRlsOrPermissionError(msg)) {
        setResult({
          ok: false,
          error:
            "Conectou ao Supabase, mas o acesso foi bloqueado por RLS (segurança). Faça login como admin e tente novamente.",
        });
        return;
      }

      setResult({ ok: false, error: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.75rem] overflow-hidden bg-white">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 text-primary">
                <Database className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Conexão com o banco
                </span>
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
                Status do Supabase
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Esta página faz uma consulta simples em <span className="font-black">projects</span>
                para confirmar que o deploy está falando com o Supabase.
              </p>
              <p className="mt-3 text-xs font-bold text-slate-500 break-all">
                <span className="font-black">URL:</span>{" "}
                {supabaseConfigService.supabaseConfigured
                  ? supabaseConfigService.supabaseUrl
                  : "(VITE_SUPABASE_URL não definida)"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                type="button"
                onClick={run}
                disabled={loading}
                className="rounded-2xl font-black gap-2"
              >
                <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
                Testar agora
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black">
                <Link to="/login">Ir para login</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Configuração
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    "border-none font-black " +
                    (supabaseConfigService.supabaseConfigured
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900")
                  }
                >
                  {supabaseConfigService.supabaseConfigured ? "VARS DO DEPLOY (ENV)" : "NÃO CONFIGURADO"}
                </Badge>
                <span className="text-sm font-bold text-slate-600">
                  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
                </span>
              </div>
              {!supabaseConfigService.supabaseConfigured ? (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Supabase não configurado (env ausente). Defina as variáveis de ambiente do deploy e recarregue. Nesta
                  etapa não existe configuração runtime/localStorage.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Resultado
              </p>
              <div className="mt-3">
                {result ? (
                  result.ok ? (
                    <div className="text-sm font-bold text-emerald-900">
                      Conectado. Projetos no banco: <span className="font-black">{result.projectCount}</span>
                      <div className="mt-1 text-xs font-bold opacity-80">
                        Se aparecer 0, pode ser que você ainda não tenha rodado as migrações no Supabase.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm font-bold text-red-900">
                      <TriangleAlert className="h-4 w-4 mt-0.5" />
                      <div className="break-words">{"error" in result ? result.error : "Erro ao consultar o banco."}</div>
                    </div>
                  )
                ) : (
                  <div className="text-sm font-bold text-slate-500">Aguardando…</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}