import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";

export default function DbStatus() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<
    | { ok: true; projectCount: number }
    | { ok: false; error: string }
    | null
  >(null);

  const hasConfig = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const run = React.useCallback(async () => {
    if (!supabase) {
      setResult({
        ok: false,
        error:
          "Supabase não configurado no deploy. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel e faça redeploy.",
      });
      return;
    }

    setLoading(true);
    try {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true });

      if (error) throw error;

      setResult({ ok: true, projectCount: count ?? 0 });
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "Erro ao consultar o banco" });
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
                para confirmar que o deploy está lendo o banco.
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
                Variáveis no deploy
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    "border-none font-black " +
                    (hasConfig ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900")
                  }
                >
                  {hasConfig ? "OK" : "FALTANDO"}
                </Badge>
                <span className="text-sm font-bold text-slate-600">
                  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Resultado
              </p>
              <div className="mt-3">
                {result?.ok ? (
                  <div className="space-y-2">
                    <Badge className="bg-emerald-100 text-emerald-900 border-none font-black">
                      CONECTADO
                    </Badge>
                    <p className="text-sm font-bold text-slate-700">
                      Projetos no banco: <span className="font-black">{result.projectCount}</span>
                    </p>
                  </div>
                ) : result && result.ok === false ? (
                  <div className="space-y-2">
                    <Badge className="bg-red-100 text-red-900 border-none font-black">
                      SEM CONEXÃO
                    </Badge>
                    <p className="text-sm font-bold text-slate-700 break-words">
                      {result.error}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-600">Carregando…</p>
                )}
              </div>
            </div>
          </div>

          {!hasConfig ? (
            <div className="mt-6 rounded-[2rem] border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3 text-red-900">
                <TriangleAlert className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-black">Como corrigir na Vercel</p>
                  <ol className="mt-2 list-decimal pl-5 text-sm font-bold text-red-900/90 space-y-1">
                    <li>
                      Vercel → Project → <span className="font-black">Settings</span> →
                      <span className="font-black"> Environment Variables</span>
                    </li>
                    <li>
                      Adicione <span className="font-black">VITE_SUPABASE_URL</span> (Project URL)
                      e <span className="font-black">VITE_SUPABASE_ANON_KEY</span> (anon public key)
                    </li>
                    <li>Faça um redeploy</li>
                  </ol>
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-black underline underline-offset-4"
                    href="https://supabase.com/docs/guides/getting-started/tutorials/with-react"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Documentação Supabase
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}