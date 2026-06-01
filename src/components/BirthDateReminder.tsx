"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getTeacherSessionTeacherId } from "@/utils/teacher-auth";
import { readGlobalTeachers } from "@/utils/teachers";
import { getCoordinatorSessionCoordinatorId } from "@/utils/coordinator-auth";
import { readGlobalCoordinators } from "@/utils/coordinators";

type Variant = "teacher" | "coordinator" | "admin";

const ROLE_LABEL: Record<Variant, string> = {
  teacher: "professor(a)",
  coordinator: "coordenador(a)",
  admin: "administrador(a)",
};

const ACCOUNT_PATH: Record<Variant, string> = {
  teacher: "/professor/conta",
  coordinator: "/coordenador/conta",
  admin: "/conta",
};

/**
 * Aviso fixo (não dispensável) que aparece para professor, coordenador ou
 * administrador que ainda não preencheu a data de nascimento. Some sozinho
 * assim que a data é salva. Renderiza null quando já está preenchida.
 */
export default function BirthDateReminder({ variant }: { variant: Variant }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const missing = useMemo(() => {
    if (variant === "teacher") {
      const id = getTeacherSessionTeacherId();
      if (!id) return false;
      const t = readGlobalTeachers([]).find((x) => x.id === id);
      if (!t) return false;
      return !t.birthDate;
    }
    if (variant === "coordinator") {
      const id = getCoordinatorSessionCoordinatorId();
      if (!id) return false;
      const c = readGlobalCoordinators([]).find((x) => x.id === id);
      if (!c) return false;
      return !c.birthDate;
    }
    // admin
    if (!profile || profile.role !== "admin") return false;
    return !profile.birth_date;
  }, [variant, profile]);

  if (!missing) return null;

  return (
    <div className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
            <CalendarDays className="h-5 w-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-amber-900">
              Falta a sua data de nascimento
            </p>
            <p className="mt-0.5 text-sm font-bold text-amber-800/90">
              Seu cadastro de {ROLE_LABEL[variant]} ainda não tem a data de nascimento.
              Por favor, preencha para completar seus dados.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 rounded-2xl bg-amber-600 px-5 font-black text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700"
          onClick={() => navigate(ACCOUNT_PATH[variant])}
        >
          Preencher agora
        </Button>
      </div>
    </div>
  );
}
