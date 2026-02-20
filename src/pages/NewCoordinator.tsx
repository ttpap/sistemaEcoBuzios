"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CoordinatorForm from "@/components/CoordinatorForm";

export default function NewCoordinator() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-white shadow-sm border border-slate-100"
          onClick={() => navigate("/coordenadores")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Novo Coordenador</h1>
          <p className="text-slate-500 font-medium">Ficha cadastral do coordenador de projeto.</p>
        </div>
      </div>

      <CoordinatorForm />
    </div>
  );
}
