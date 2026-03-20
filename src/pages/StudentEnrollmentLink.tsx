"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Link2, User } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { copyToClipboard } from "@/utils/clipboard";

const STUDENT_ENROLLMENT_URL = "https://www.ecobuziossistema.com.br/inscricao";

export default function StudentEnrollmentLink() {
  const copy = async () => {
    try {
      await copyToClipboard(STUDENT_ENROLLMENT_URL);
      showSuccess("Copiado!");
    } catch {
      showError("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inscrição</p>
        <h1 className="text-3xl font-black text-primary tracking-tight">Link de inscrição do aluno</h1>
        <p className="text-slate-500 font-medium">Compartilhe este link com o aluno para ele fazer a inscrição.</p>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 bg-white">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Link
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">URL</p>
                <p className="mt-1 text-sm font-black text-slate-800 break-all">{STUDENT_ENROLLMENT_URL}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="rounded-2xl font-black" type="button" onClick={copy}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                type="button"
                onClick={() => window.open(STUDENT_ENROLLMENT_URL, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
