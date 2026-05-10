"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import {
  checkPhotographerInvite,
  consumePhotographerInvite,
} from "@/services/photographerInvitesService";

export default function PublicPhotographerRegistration() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setValid(false);
        setReason("not_found");
        setChecking(false);
        return;
      }
      try {
        const r = await checkPhotographerInvite(token);
        setValid(r.valid);
        setReason(r.reason);
      } catch (err: any) {
        setValid(false);
        setReason(err?.message || "error");
      } finally {
        setChecking(false);
      }
    };
    void run();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !login.trim() || !password.trim()) {
      showError("Preencha nome, login e senha.");
      return;
    }
    if (password !== password2) {
      showError("Senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      await consumePhotographerInvite({
        token,
        fullName: fullName.trim(),
        email: email.trim(),
        login: login.trim(),
        password: password.trim(),
      });
      showSuccess("Cadastro concluído! Faça login.");
      navigate("/fotografo/login", { replace: true });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("login_in_use")) showError("Este login já está em uso. Escolha outro.");
      else if (msg.includes("already_used")) showError("Este link já foi usado.");
      else if (msg.includes("expired")) showError("Link expirado. Solicite um novo ao administrador.");
      else if (msg.includes("invalid_token")) showError("Link inválido.");
      else showError(msg || "Erro ao cadastrar.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6]">
        <p className="text-sm font-bold text-slate-600">Validando link...</p>
      </div>
    );
  }

  if (!valid) {
    const message =
      reason === "already_used"
        ? "Este link já foi usado."
        : reason === "expired"
        ? "Link expirado. Peça um novo ao administrador."
        : "Link inválido ou não encontrado.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6] px-6">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-black text-primary">Link inválido</h1>
            <p className="mt-2 text-slate-600 font-medium">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-[#f5f0e6]">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-8 pb-3">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <CardTitle className="mt-4 text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            <Camera className="h-6 w-6" /> Inscrição do fotógrafo
          </CardTitle>
          <p className="text-slate-500 font-medium mt-1">
            Crie seu login e senha para enviar links de fotos.
          </p>
        </CardHeader>
        <CardContent className="p-8 pt-3">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="font-black">Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <Label className="font-black">E-mail (opcional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="font-black">Login (escolha um)</Label>
              <Input value={login} onChange={(e) => setLogin(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <Label className="font-black">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="font-black">Confirmar senha</Label>
              <Input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl font-black">
              {submitting ? "Enviando..." : "Concluir cadastro"}
            </Button>
            <p className="text-xs font-bold text-slate-500 text-center">
              Após o cadastro, peça ao administrador para alocar você aos projetos.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
