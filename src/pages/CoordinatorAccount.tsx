"use client";

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { getCoordinatorSessionCoordinatorId } from "@/utils/coordinator-auth";
import {
  DEFAULT_COORDINATOR_PASSWORD,
  readGlobalCoordinators,
  resetCoordinatorPasswordToDefault,
  updateGlobalCoordinator,
} from "@/utils/coordinators";
import { ArrowLeft, KeyRound, RotateCcw, Save, ShieldCheck } from "lucide-react";

export default function CoordinatorAccount() {
  const navigate = useNavigate();

  const coordinatorId = useMemo(() => getCoordinatorSessionCoordinatorId(), []);
  const coordinator = useMemo(() => {
    if (!coordinatorId) return null;
    return readGlobalCoordinators([]).find((c) => c.id === coordinatorId) || null;
  }, [coordinatorId]);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const onSave = () => {
    if (!coordinatorId) return;
    if (pw1.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      showError("As senhas não conferem.");
      return;
    }

    updateGlobalCoordinator(coordinatorId, { authPassword: pw1 });
    setPw1("");
    setPw2("");
    showSuccess("Senha atualizada.");
  };

  const onReset = () => {
    if (!coordinatorId) return;
    const ok = window.confirm(
      `Resetar sua senha para a senha padrão (${DEFAULT_COORDINATOR_PASSWORD})?`,
    );
    if (!ok) return;

    resetCoordinatorPasswordToDefault(coordinatorId);
    setPw1("");
    setPw2("");
    showSuccess("Senha resetada para o padrão.");
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
            {coordinator ? `Olá, ${coordinator.fullName}.` : "Gerencie sua senha."}
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Nova senha
            </Label>
            <div className="mt-3 grid gap-3">
              <Input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Digite a nova senha"
                className="h-12 rounded-2xl border-slate-100 bg-white"
              />
              <Input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-12 rounded-2xl border-slate-100 bg-white"
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2"
                onClick={onSave}
              >
                <Save className="h-4 w-4" /> Salvar nova senha
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl font-black border-slate-200 bg-white gap-2"
                onClick={onReset}
              >
                <RotateCcw className="h-4 w-4" /> Resetar para padrão
              </Button>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-600">
              Dica: se esquecer a senha, você (ou o administrador) pode resetar para a senha padrão.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
