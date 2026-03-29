// src/pages/TeacherAgenda.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, LayoutGrid } from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import { fetchSentSchedulesFull } from "@/integrations/supabase/oficina-schedules";
import { getTeacherSessionTeacherId } from "@/utils/teacher-auth";
import { showError } from "@/utils/toast";
import type { OficinaScheduleFull } from "@/types/oficina-schedule";

function formatWeekPeriod(weekStartDate: string): string {
  const start = new Date(weekStartDate + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}/${start.getFullYear()}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCurrentWeek(weekStartDate: string): boolean {
  const today = todayIso();
  const end = new Date(weekStartDate + "T12:00:00");
  end.setDate(end.getDate() + 6);
  return weekStartDate <= today && today <= end.toISOString().slice(0, 10);
}

export default function TeacherAgenda() {
  const navigate = useNavigate();
  const teacherId = getTeacherSessionTeacherId();
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<OficinaScheduleFull[]>([]);

  useEffect(() => {
    async function load() {
      const projectId = getActiveProjectId();
      if (!projectId) { setLoading(false); return; }
      try {
        const fulls = await fetchSentSchedulesFull(projectId);
        // Sort newest first
        const sorted = [...fulls].sort((a, b) =>
          b.schedule.weekStartDate.localeCompare(a.schedule.weekStartDate)
        );
        setWeeks(sorted);
      } catch {
        showError("Erro ao carregar escalas.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight">Escala</h1>
        <p className="text-slate-500 font-medium">Cronogramas semanais de oficinas.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : weeks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-2">
          <CalendarDays className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-slate-400 font-medium">Nenhuma escala disponível ainda.</p>
          <p className="text-slate-400 text-sm">Aguarde o coordenador enviar a escala.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeks.map((w) => {
            const isCurrent = isCurrentWeek(w.schedule.weekStartDate);
            return (
              <div
                key={w.schedule.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow cursor-pointer ${
                  isCurrent ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
                }`}
                onClick={() => navigate(`/professor/escalas/${w.schedule.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-800 text-xl leading-tight">
                      {formatWeekPeriod(w.schedule.weekStartDate)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {w.schedule.weekNumber}ª Semana
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                      Esta semana
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full text-xs h-8"
                  onClick={(e) => { e.stopPropagation(); navigate(`/professor/escalas/${w.schedule.id}`); }}
                >
                  <LayoutGrid className="h-3 w-3" />
                  Ver escala completa
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
