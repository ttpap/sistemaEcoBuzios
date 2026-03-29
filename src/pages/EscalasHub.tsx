// src/pages/EscalasHub.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Plus, Eye, Pencil, Trash2,
  ChevronDown, ChevronUp, CalendarDays, BookOpen,
} from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import { fetchClassesRemote } from "@/integrations/supabase/classes";
import {
  fetchSchedulesByProject,
  deleteSchedule,
} from "@/integrations/supabase/oficina-schedules";
import type { SchoolClass } from "@/types/class";
import type { OficinaSchedule } from "@/types/oficina-schedule";
import { showError, showSuccess } from "@/utils/toast";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import ActivityTemplateEditor from "@/components/ActivityTemplateEditor";

function formatWeekPeriod(weekStartDate: string): string {
  const start = new Date(weekStartDate + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}/${start.getFullYear()}`;
}

export default function EscalasHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(
    () => getAreaBaseFromPathname(location.pathname),
    [location.pathname]
  );

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schedules, setSchedules] = useState<OficinaSchedule[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [expandedTurma, setExpandedTurma] = useState<string | null>(null);

  useEffect(() => {
    const projectId = getActiveProjectId();
    if (!projectId) {
      setLoadingClasses(false);
      setLoadingSchedules(false);
      return;
    }
    fetchClassesRemote(projectId)
      .then(setClasses)
      .catch(() => showError("Erro ao carregar turmas."))
      .finally(() => setLoadingClasses(false));

    fetchSchedulesByProject(projectId)
      .then(setSchedules)
      .catch(() => showError("Erro ao carregar escalas."))
      .finally(() => setLoadingSchedules(false));
  }, []);

  async function handleDeleteSchedule(id: string) {
    if (!confirm("Excluir esta escala? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteSchedule(id);
      showSuccess("Escala excluída.");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {
      showError("Erro ao excluir escala.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight">Escalas</h1>
        <p className="text-slate-500 font-medium">
          Gerencie as atividades e cronogramas semanais de oficinas.
        </p>
      </div>

      <Tabs defaultValue="semanas" className="w-full">
        <TabsList className="w-full justify-start gap-2 rounded-[1.5rem] bg-white p-2 border border-slate-100">
          <TabsTrigger value="semanas" className="rounded-xl font-black">
            <CalendarDays className="h-4 w-4 mr-2" /> Semanas
          </TabsTrigger>
          <TabsTrigger value="turmas" className="rounded-xl font-black">
            <BookOpen className="h-4 w-4 mr-2" /> Atividades por Turma
          </TabsTrigger>
        </TabsList>

        {/* ── SEMANAS ─────────────────────────────────────────────────────── */}
        <TabsContent value="semanas" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => navigate(`${base}/escalas/nova`)}
            >
              <Plus className="h-4 w-4" /> Nova Semana
            </Button>
          </div>

          {loadingSchedules ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              Nenhuma escala criada ainda.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Semana</th>
                    <th className="px-4 py-3 text-left font-medium">Período</th>
                    <th className="px-4 py-3 text-left font-medium">Criado por</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {s.weekNumber}ª Semana
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatWeekPeriod(s.weekStartDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {s.createdBy ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              navigate(`${base}/escalas/${s.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              navigate(`${base}/escalas/${s.id}/editar`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteSchedule(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── ATIVIDADES POR TURMA ─────────────────────────────────────────── */}
        <TabsContent value="turmas" className="mt-6">
          {loadingClasses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              Nenhuma turma encontrada neste projeto.
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <button
                    className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                    onClick={() =>
                      setExpandedTurma(expandedTurma === c.id ? null : c.id)
                    }
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-sm text-slate-500">
                        {c.period} · {c.startTime} – {c.endTime}
                      </p>
                    </div>
                    {expandedTurma === c.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                  {expandedTurma === c.id && (
                    <div className="px-6 pb-6 border-t border-slate-100">
                      <ActivityTemplateEditor turmaId={c.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
