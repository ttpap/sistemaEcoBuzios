"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Link2, User, Users, Users2, KeyRound } from "lucide-react";
import Logo from "@/components/Logo";
import { showError, showSuccess } from "@/utils/toast";
import { createStaffPublicInvite } from "@/services/staffInvitesService";

function makeUrl(path: string) {
  try {
    return `${window.location.origin}${path}`;
  } catch {
    return path;
  }
}

export default function AdminRegistrationLinks() {
  const [staffLinks, setStaffLinks] = useState<{ teacher?: string; coordinator?: string }>({});
  const [loading, setLoading] = useState<{ teacher?: boolean; coordinator?: boolean }>({});

  const links = useMemo(
    () => [
      {
        key: "aluno",
        title: "Inscrição do aluno",
        subtitle: "Link público (sem login)",
        path: "/inscricao",
        icon: User,
      },
      {
        key: "professor",
        title: "Inscrição do professor",
        subtitle: "Link público (com token)",
        path: "/inscricao-professor",
        icon: Users,
      },
      {
        key: "coordenador",
        title: "Inscrição do coordenador",
        subtitle: "Link público (com token)",
        path: "/inscricao-coordenador",
        icon: Users2,
      },
    ],
    [],
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  const generateStaffLink = async (role: "teacher" | "coordinator") => {
    setLoading((s) => ({ ...s, [role]: true }));
    try {
      const invite = await createStaffPublicInvite(role);
      const path = role === "teacher" ? "/inscricao-professor" : "/inscricao-coordenador";
      const url = makeUrl(`${path}?token=${encodeURIComponent(invite.token)}`);
      setStaffLinks((s) => ({ ...s, [role]: url }));
      await copy(url);
    } catch (e: any) {
      showError(e?.message || "Não foi possível gerar o link.");
    } finally {
      setLoading((s) => ({ ...s, [role]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-3xl font-black text-primary tracking-tight">Links de inscrição</h1>
          <p className="text-slate-500 font-medium">
            Compartilhe estes links para preencher o formulário sem precisar estar logado.
          </p>
        </div>
        <div className="w-full max-w-[180px]">
          <Logo className="w-full" />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-900">Importante</p>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Estes links são públicos. Quem tiver o link consegue acessar. Por isso eles aparecem apenas aqui no Admin.
              </p>
              <p className="text-sm font-medium text-slate-600 mt-2">
                Para professor/coordenador, o link é gerado com um <span className="font-black">token</span> e expira.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {links.map((l) => {
          const Icon = l.icon;

          const url =
            l.key === "professor"
              ? staffLinks.teacher || "(gere um link)"
              : l.key === "coordenador"
                ? staffLinks.coordinator || "(gere um link)"
                : makeUrl(l.path);

          const canCopy = url && !url.startsWith("(");

          return (
            <Card
              key={l.key}
              className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden"
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.subtitle}</p>
                    <h2 className="text-lg font-black text-primary tracking-tight truncate">{l.title}</h2>
                  </div>
                </div>

                <div className="mt-6 rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Link</p>
                  <p className="mt-2 text-sm font-black text-slate-800 break-all">{url}</p>

                  {l.key === "professor" ? (
                    <Button
                      className="mt-4 w-full rounded-2xl font-black"
                      type="button"
                      onClick={() => generateStaffLink("teacher")}
                      disabled={!!loading.teacher}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      {loading.teacher ? "Gerando..." : "Gerar e copiar link"}
                    </Button>
                  ) : l.key === "coordenador" ? (
                    <Button
                      className="mt-4 w-full rounded-2xl font-black"
                      type="button"
                      onClick={() => generateStaffLink("coordinator")}
                      disabled={!!loading.coordinator}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      {loading.coordinator ? "Gerando..." : "Gerar e copiar link"}
                    </Button>
                  ) : (
                    <Button
                      className="mt-4 w-full rounded-2xl font-black"
                      type="button"
                      onClick={() => copy(url)}
                      disabled={!canCopy}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar link
                    </Button>
                  )}

                  {(l.key === "professor" || l.key === "coordenador") && canCopy ? (
                    <Button
                      variant="outline"
                      className="mt-3 w-full rounded-2xl font-black"
                      type="button"
                      onClick={() => copy(url)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar novamente
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}