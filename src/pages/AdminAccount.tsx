"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminAccount() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (pw1.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      showError("As senhas não conferem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      showSuccess("Senha atualizada com sucesso!");
    } catch (e: any) {
      showError(e?.message || "Não foi possível atualizar a senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 bg-primary text-white">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Minha conta
          </CardTitle>
          <p className="mt-1 text-white/85 text-sm font-bold">
            {profile?.full_name ? `Olá, ${profile.full_name}.` : "Administrador"}
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Alterar senha
            </Label>
            <div className="mt-3 grid gap-3">
              <Input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Nova senha (mínimo 6 caracteres)"
                className="h-12 rounded-2xl border-slate-100 bg-white"
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
              <Input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-12 rounded-2xl border-slate-100 bg-white"
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
            </div>

            <div className="mt-4">
              <Button
                type="button"
                className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2"
                onClick={onSave}
                disabled={saving}
              >
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
