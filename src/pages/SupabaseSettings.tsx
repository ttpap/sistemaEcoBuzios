"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw } from "lucide-react";
import { supabase, supabaseConfigured, supabaseUrl as currentUrl } from "@/integrations/supabase/client";

export default function SupabaseSettings() {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<
    | { ok: true; projectCount: number }
    | { ok: false; error: string }
    | null
  >(null);

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);

    if (!supabaseConfigured) {
      setTestResult({
        ok: false,
        error: "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no deploy.",
      });
      setTesting(false);
      return;
    }

    try {
      const { count, error } = await supabase.from("projects").select("id", { count: "exact", head: true });
      if (error) throw error;
      setTestResult({ ok: true, projectCount: count ?? 0 });
    } catch (e: any) {
      setTestResult({ ok: false, error: String(e?.message || "Erro ao consultar o banco") });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Supabase</h1>
          <p className="text-slate-500 font-medium">
            Diagnóstico da configuração do Supabase no deploy. Nesta etapa, não é permitido trocar o
            projeto por runtime/localStorage.
          </p>
        </div>
      </div>

      <Card className="mt-6 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 bg-white">
          <CardTitle className="text-lg font-black text-slate-800">Configuração atual</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                "border-none font-black " +
                (supabaseConfigured ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")
              }
            >
              {supabaseConfigured ? "CONFIGURADO (ENV)" : "NÃO CONFIGURADO"}
            </Badge>
            <span className="text-sm font-bold text-slate-600 break-all">
              {currentUrl || "(VITE_SUPABASE_URL não definida)"}
            </span>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5 text-xs font-bold text-slate-600">
            Defina as variáveis no deploy:
            <div className="mt-2 space-y-1 break-all">
              <div>
                <span className="font-black">VITE_SUPABASE_URL</span> (Project URL)
              </div>
              <div>
                <span className="font-black">VITE_SUPABASE_ANON_KEY</span> (anon public key)
              </div>
            </div>
            <div className="mt-2">
              Origem: <span className="font-black">Supabase → Project Settings → API</span>.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onTest}
              disabled={testing}
              className="h-12 rounded-2xl font-black gap-2"
            >
              <RefreshCw className={"h-4 w-4 " + (testing ? "animate-spin" : "")} /> Testar conexão
            </Button>
          </div>

          {testResult ? (
            <div
              className={
                "rounded-[2rem] border p-5 text-sm font-bold " +
                (testResult.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-red-200 bg-red-50 text-red-950")
              }
            >
              {testResult.ok ? (
                <div>
                  Conectado. Projetos no banco: <span className="font-black">{testResult.projectCount}</span>
                  <div className="mt-1 text-xs font-bold opacity-80">
                    Se aparecer 0, pode ser que você ainda não tenha rodado as migrações no Supabase.
                  </div>
                </div>
              ) : (
                <div className="break-words">{"error" in testResult ? testResult.error : "Erro ao testar conexão."}</div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
