"use client";

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { copyToClipboard } from "@/utils/clipboard";
import { CheckCircle2, Copy, Link2, Shield, ArrowLeft, Users } from "lucide-react";
import TeacherForm from "@/components/TeacherForm";
import { DEFAULT_TEACHER_PASSWORD } from "@/utils/teachers";

function getUrl() {
  try {
    return window.location.href;
  } catch {
    return "/inscricao-professor";
  }
}

function getToken() {
  try {
    const token = new URLSearchParams(window.location.search).get("token");
    return token || "";
  } catch {
    return "";
  }
}

export default function PublicTeacherRegistration() {
  const navigate = useNavigate();
  const url = useMemo(() => getUrl(), []);
  const token = useMemo(() => getToken(), []);

  const [done, setDone] = useState<{ login: string; password: string } | null>(null);

  const copy = async (text: string) => {
    try {
      await copyToClipboard(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-full max-w-[220px]">
              <Logo className="w-full" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="rounded-2xl font-black border-slate-200 bg-white"
              onClick={() => navigate("/login/admin")}
              type="button"
            >
              <Shield className="h-4 w-4 mr-2" />
              Sou admin (entrar)
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden lg:col-span-1">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inscrição</p>
                  <h1 className="text-xl font-black text-primary tracking-tight">Cadastro de professor</h1>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm font-medium text-slate-600">
                <p>Preencha seus dados com atenção. Ao finalizar, você receberá seu login e senha.</p>
                <p className="text-xs font-bold text-slate-500">
                  A senha padrão é <span className="font-black">{DEFAULT_TEACHER_PASSWORD}</span>.
                </p>
              </div>

              <div className="mt-6 rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Link para compartilhar</p>
                </div>
                <p className="mt-2 text-sm font-black text-slate-800 break-all">{url}</p>
                <Button className="mt-4 w-full rounded-2xl font-black" onClick={() => copy(url)} type="button">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            {!token ? (
              <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link inválido</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">Solicite um novo link</h2>
                  <p className="mt-2 text-slate-600 font-medium">
                    Este link de inscrição precisa de um token. Peça ao administrador para gerar um novo link.
                  </p>
                </CardContent>
              </Card>
            ) : done ? (
              <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-10 text-center">
                  <div className="mx-auto h-14 w-14 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-slate-900 tracking-tight">Cadastro enviado!</h2>
                  <p className="mt-2 text-slate-600 font-medium">Anote suas credenciais de acesso.</p>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 text-left">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Login</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-800 break-all">{done.login}</p>
                        <Button variant="outline" className="rounded-2xl font-black" onClick={() => copy(done.login)}>
                          <Copy className="h-4 w-4 mr-2" /> Copiar
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 text-left">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-800 break-all">{done.password}</p>
                        <Button variant="outline" className="rounded-2xl font-black" onClick={() => copy(done.password)}>
                          <Copy className="h-4 w-4 mr-2" /> Copiar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      className="rounded-2xl font-black h-12 px-6"
                      onClick={() => {
                        setDone(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      type="button"
                    >
                      Fazer outro cadastro
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-2xl font-black text-slate-600 hover:bg-slate-100"
                      onClick={() => navigate(-1)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <TeacherForm redirectTo={null} onCompleted={setDone} publicToken={token} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}