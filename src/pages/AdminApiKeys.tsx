"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, KeyRound, Plus, ShieldOff, AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import { showError, showSuccess } from "@/utils/toast";
import { copyToClipboard } from "@/utils/clipboard";
import { supabase } from "@/integrations/supabase/client";

interface ApiKeyRow {
  id: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, description, created_at, expires_at, revoked")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Erro ao carregar as chaves.");
    } else {
      setKeys((data as ApiKeyRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    if (!description.trim()) {
      showError("Informe uma descrição para a chave.");
      return;
    }
    setCreating(true);
    setNewKey(null);
    try {
      const rawKey = generateRawKey();
      const keyHash = await sha256hex(rawKey);

      const { error } = await supabase
        .from("api_keys")
        .insert({ key_hash: keyHash, description: description.trim() });

      if (error) throw error;

      setNewKey(rawKey);
      setDescription("");
      showSuccess("Chave criada! Copie agora — ela não será exibida novamente.");
      await loadKeys();
    } catch (e: any) {
      showError(e?.message || "Erro ao criar a chave.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("id", id);

    if (error) {
      showError("Erro ao revogar a chave.");
    } else {
      showSuccess("Chave revogada.");
      await loadKeys();
    }
    setRevokingId(null);
  };

  const copy = async (text: string) => {
    try {
      await copyToClipboard(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-3xl font-black text-primary tracking-tight">Chaves de API</h1>
          <p className="text-slate-500 font-medium">
            Gerencie as chaves de acesso ao endpoint público de estatísticas.
          </p>
        </div>
        <div className="w-full max-w-[180px]">
          <Logo className="w-full" />
        </div>
      </div>

      {/* Aviso */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-900">Importante</p>
              <p className="text-sm font-medium text-slate-600 mt-1">
                A chave em texto puro é exibida <span className="font-black">apenas uma vez</span> ao ser criada. Guarde-a em um local seguro.
                O sistema armazena apenas o hash SHA-256.
              </p>
              <p className="text-sm font-medium text-slate-600 mt-2">
                Use o header <code className="bg-slate-100 rounded px-1 py-0.5 text-xs font-black">x-api-key: &lt;chave&gt;</code> nas requisições ao endpoint.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criar nova chave */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black text-slate-800">Nova chave</h2>
          </div>

          <div className="flex gap-3">
            <Input
              placeholder="Descrição (ex: Dashboard externo - parceiro X)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="rounded-2xl font-bold h-12"
            />
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="h-12 rounded-2xl font-black px-6 shrink-0"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {creating ? "Gerando..." : "Gerar"}
            </Button>
          </div>

          {newKey && (
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Chave gerada — copie agora!
              </p>
              <p className="text-sm font-black text-emerald-900 break-all font-mono">{newKey}</p>
              <Button
                variant="outline"
                onClick={() => copy(newKey)}
                className="rounded-2xl font-black border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar chave
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de chaves */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-700">Chaves cadastradas</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : keys.length === 0 ? (
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem]">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500 font-bold">Nenhuma chave cadastrada ainda.</p>
            </CardContent>
          </Card>
        ) : (
          keys.map((k) => (
            <Card
              key={k.id}
              className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden"
            >
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 truncate">{k.description}</p>
                    {k.revoked ? (
                      <Badge className="bg-red-100 text-red-800 border-none font-black">Revogada</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-none font-black">Ativa</Badge>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-400">
                    Criada em {new Date(k.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {k.expires_at
                      ? ` · Expira em ${new Date(k.expires_at).toLocaleDateString("pt-BR")}`
                      : " · Sem expiração"}
                  </p>
                  <p className="text-[10px] font-black text-slate-300 font-mono">{k.id}</p>
                </div>

                {!k.revoked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                    className="rounded-2xl font-black border-red-200 text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    {revokingId === k.id ? "Revogando..." : "Revogar"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
