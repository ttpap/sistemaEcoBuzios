"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import CoordinatorForm from "@/components/CoordinatorForm";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { readGlobalCoordinators } from "@/utils/coordinators";

export default function EditCoordinator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coordinator, setCoordinator] = useState<CoordinatorRegistration | null>(null);

  useEffect(() => {
    const saved = readGlobalCoordinators([]);
    const found = saved.find((c) => c.id === id) || null;
    if (found) setCoordinator(found);
    else navigate("/coordenadores");
  }, [id, navigate]);

  if (!coordinator) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="text-3xl font-black text-primary tracking-tight">Editar Coordenador</h1>
          <p className="text-slate-500 font-medium">Atualize os dados de {coordinator.fullName}.</p>
        </div>
      </div>

      <CoordinatorForm initialData={coordinator} />
    </div>
  );
}
