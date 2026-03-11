"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  supabase,
  supabaseConfigSource,
  supabaseUrl as currentUrl,
} from "@/integrations/supabase/client";
import {
  clearSupabaseRuntimeConfig,
  getSupabaseRuntimeConfig,
  setSupabaseRuntimeConfig,
} from "@/integrations/supabase/runtime-config";
import { showError, showSuccess } from "@/utils/toast";

export default function SupabaseSettings() {
  const runtime = getSupabaseRuntimeConfig();

  const [url, setUrl] = React.useState(runtime?.url || "");
  const [anonKey, setAnonKey] = React.useState(runtime?.anonKey || "");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<
    | { ok: true; projectCount: number }
    | { ok: false; error: string }
    | null
  >(null);

  const onSave = () => {
    const u = url.trim();
    const k = anonKey.trim();
    if (!u || !k) {
      showError("Informe a URL e a anon key.");
      return;
    }

    setSupabaseRuntimeConfig({ url: u, anonKey: k });
    showSuccess("Configuração salva. Recarregando…");
    window.location.reload();
  };

  const onClear = () => {
    clearSupabaseRuntimeConfig();
    showSuccess("Configuração removida. Recarregando…");
    window.location.reload();
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
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
            Configure a URL e a anon key do Supabase que este navegador deve usar.
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
                (supabaseConfigSource === "runtime"
                  ? "bg-sky-100 text-sky-900"
                  : supabaseConfigSource === "env"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-amber-100 text-amber-900")
              }
            >
              {supabaseConfigSource === "runtime"
                ? "RUNTIME (neste navegador)"
                : supabaseConfigSource === "env"
                  ? "VARS DO DEPLOY"
                  : "FALLBACK"}
            </Badge>
            <span className="text-sm font-bold text-slate-600 break-all">{currentUrl}</span>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Project URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">anon public key</Label>
              <Input
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="h-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onSave} className="h-12 rounded-2xl font-black gap-2">
              <Save className="h-4 w-4" /> Salvar e recarregar
            </Button>
            <Button
              variant="outline"
              onClick={onTest}
              disabled={testing}
              className="h-12 rounded-2xl font-black gap-2"
            >
              <RefreshCw className={"h-4 w-4 " + (testing ? "animate-spin" : "")} /> Testar conexão
            </Button>
            <Button
              variant="ghost"
              onClick={onClear}
              className="h-12 rounded-2xl font-black gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Limpar
            </Button>
          </div>

          {testResult ? (
            <div
              className={
                "rounded-[2rem] border p-5 text-sm font-bold " +
                (testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-red-200 bg-red-50 text-red-950")
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

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5 text-xs font-bold text-slate-600">
            Dica: pegue estes valores em <span className="font-black">Supabase → Project Settings → API</span>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
