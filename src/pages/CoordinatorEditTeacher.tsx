"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CalendarDays, Loader2, MessageSquarePlus } from "lucide-react";
import TeacherForm from "@/components/TeacherForm";
import type { TeacherRegistration } from "@/types/teacher";
import { readGlobalTeachers } from "@/utils/teachers";
import { fetchTeacherById } from "@/services/teachersService";
import { supabase } from "@/integrations/supabase/client";

type TeacherJustification = {
  id: string;
  startDate: string;
  endDate: string | null;
  message: string;
  createdAt: string;
};

function formatPeriod(j: TeacherJustification) {
  const start = new Date(j.startDate + "T00:00:00").toLocaleDateString("pt-BR");
  if (!j.endDate || j.endDate === j.startDate) return start;
  const end = new Date(j.endDate + "T00:00:00").toLocaleDateString("pt-BR");
  return `${start} até ${end}`;
}

export default function CoordinatorEditTeacher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<TeacherRegistration | null>(null);
  const [justifications, setJustifications] = useState<TeacherJustification[]>([]);
  const [loadingJust, setLoadingJust] = useState(false);

  const backPath = "/coordenador/professores";

  useEffect(() => {
    const run = async () => {
      if (!id) {
        navigate(backPath);
        return;
      }

      const remote = await fetchTeacherById(id);
      if (remote) {
        setTeacher(remote);
      } else {
        const saved = readGlobalTeachers([]);
        const found = saved.find((t) => t.id === id) || null;
        if (!found) {
          navigate(backPath);
          return;
        }
        setTeacher(found);
      }

      // Busca justificativas do professor
      if (supabase) {
        setLoadingJust(true);
        try {
          const { data } = await supabase
            .from("teacher_justifications")
            .select("*")
            .eq("teacher_id", id)
            .order("start_date", { ascending: false });

          if (data) {
            setJustifications(
              data.map((r: any) => ({
                id: r.id,
                startDate: r.start_date,
                endDate: r.end_date ?? null,
                message: r.message,
                createdAt: r.created_at,
              })),
            );
          }
        } catch {
          // ignore
        } finally {
          setLoadingJust(false);
        }
      }
    };

    void run();
  }, [id, navigate]);

  if (!teacher) {
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
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Ficha do professor</h1>
          <p className="text-slate-500 font-medium">{teacher.fullName}</p>
        </div>
      </div>

      <TeacherForm initialData={teacher} backPath={backPath} />

      {/* Histórico de justificativas do professor */}
      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-3 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <MessageSquarePlus className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-primary">Justificativas de ausência</CardTitle>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Registro histórico de ausências justificadas pelo professor.
              </p>
            </div>
          </div>
          {justifications.length > 0 && (
            <Badge className="rounded-full bg-amber-500 text-white border-none font-black shrink-0">
              {justifications.length}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-2">
          {loadingJust ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : justifications.length === 0 ? (
            <div className="py-10 text-center rounded-[2rem] border border-dashed border-slate-200">
              <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">Nenhuma justificativa registrada.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {justifications.map((j) => (
                  <div
                    key={j.id}
                    className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="rounded-full border-none bg-amber-100 text-amber-800 font-black">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        {formatPeriod(j)}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Registrado em {new Date(j.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{j.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
