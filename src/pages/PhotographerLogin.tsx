"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { isPhotographerLoggedIn, loginPhotographer } from "@/utils/photographer-auth";

export default function PhotographerLogin() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPhotographerLoggedIn()) navigate("/fotografo", { replace: true });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await loginPhotographer({ login, password });
      if (res.ok) {
        showSuccess(`Bem-vindo(a), ${res.fullName}!`);
        navigate("/fotografo", { replace: true });
        return;
      }
      if (res.reason === "not_assigned") {
        showError("Você ainda não foi alocado(a) em nenhum projeto. Procure o administrador.");
        return;
      }
      showError("Login ou senha inválidos.");
    } catch (err: any) {
      showError(err?.message || "Erro ao entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f5f0e6]">
      <Card className="w-full max-w-md border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-8 pb-3">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <CardTitle className="mt-4 text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            <Camera className="h-6 w-6" /> Área do fotógrafo
          </CardTitle>
          <p className="text-slate-500 font-medium mt-1">Entre com seu login e senha para enviar links de fotos.</p>
        </CardHeader>
        <CardContent className="p-8 pt-3">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="font-black">Login</Label>
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="seu.login"
                className="h-12 rounded-xl"
                autoComplete="username"
              />
            </div>
            <div>
              <Label className="font-black">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="h-12 rounded-xl"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl font-black">
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
