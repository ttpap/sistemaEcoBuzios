"use client";

import React from "react";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-3xl bg-red-50 text-red-700 flex items-center justify-center border border-red-200">
          <ShieldX className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900 tracking-tight">403 — Não autorizado</h1>
        <p className="mt-2 text-slate-600 font-medium">
          Você não tem permissão para acessar esta página.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button variant="outline" className="rounded-2xl font-black" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button className="rounded-2xl font-black" onClick={() => navigate("/login")}>Ir para login</Button>
        </div>
      </div>
    </div>
  );
}
