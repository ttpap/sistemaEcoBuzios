// src/pages/ScheduleList.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import {
  fetchSchedulesByProject,
  deleteSchedule,
} from "@/integrations/supabase/oficina-schedules";
import type { OficinaSchedule } from "@/types/oficina-schedule";
import { showError, showSuccess } from "@/utils/toast";
import { useMemo } from "react";
import { getAreaBaseFromPathname } from "@/utils/route-base";

function formatWeekPeriod(weekStartDate: string): string {
  const start = new Date(weekStartDate + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 4); // Friday
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}/${start.getFullYear()}`;
}

export default function ScheduleList() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [schedules, setSchedules] = useState<OficinaSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const projectId = getActiveProjectId();
    if (!projectId) { setLoading(false); return; }
    const data = await fetchSchedulesByProject(projectId);
    setSchedules(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta escala? Esta ação não pode ser desfeita.")) return;
    await deleteSchedule(id);
    showSuccess("Escala excluída.");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Escalas</h1>
          <p className="text-slate-500 font-medium">Cronogramas semanais de oficinas do projeto.</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate(`${base}/escalas/nova`)}
        >
          <Plus className="h-4 w-4" />
          Nova Semana
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
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
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {s.weekNumber}ª Semana
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatWeekPeriod(s.weekStartDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.createdBy ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`${base}/escalas/${s.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`${base}/escalas/${s.id}/editar`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => handleDelete(s.id)}
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
    </div>
  );
}
