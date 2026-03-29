// src/pages/ScheduleList.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Eye, Pencil, Trash2, Send, CheckCircle2, Copy } from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import {
  fetchSchedulesByProject,
  deleteSchedule,
  sendSchedule,
  duplicateSchedule,
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
  const [sending, setSending] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  async function load(autoRedirect = false) {
    const projectId = getActiveProjectId();
    if (!projectId) { setLoading(false); return; }
    try {
      const data = await fetchSchedulesByProject(projectId);
      setSchedules(data);
      if (autoRedirect && data.length > 0) {
        navigate(`${base}/escalas/${data[0].id}/editar`, { replace: true });
      }
    } catch {
      showError("Erro ao carregar escalas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(true); }, []);

  async function handleSend(id: string) {
    if (!confirm("Enviar esta escala para todos os educadores e coordenadores envolvidos?")) return;
    setSending(id);
    try {
      await sendSchedule(id);
      showSuccess("Escala enviada! Os educadores já podem visualizar na agenda deles.");
      void load(false);
    } catch {
      showError("Erro ao enviar escala.");
    } finally {
      setSending(null);
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    try {
      const newSched = await duplicateSchedule(id);
      if (!newSched) { showError("Erro ao duplicar escala."); return; }
      showSuccess(`Semana ${newSched.weekNumber} criada como rascunho.`);
      navigate(`${base}/escalas/${newSched.id}/editar`);
    } catch {
      showError("Erro ao duplicar escala.");
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta escala? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteSchedule(id);
      showSuccess("Escala excluída.");
      void load(false);
    } catch {
      showError("Erro ao excluir escala.");
    }
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
                <th className="px-4 py-3 text-left font-medium">Status</th>
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
                    {s.sentAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Enviada
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`${base}/escalas/${s.id}`)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`${base}/escalas/${s.id}/editar`)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {s.sentAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-violet-600"
                          title="Duplicar para próxima semana"
                          disabled={duplicating === s.id}
                          onClick={() => handleDuplicate(s.id)}
                        >
                          {duplicating === s.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Copy className="h-4 w-4" />
                          }
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${s.sentAt ? "text-emerald-500" : "text-slate-400 hover:text-indigo-600"}`}
                        onClick={() => !s.sentAt && handleSend(s.id)}
                        disabled={!!s.sentAt || sending === s.id}
                        title={s.sentAt ? "Já enviada" : "Enviar para educadores"}
                      >
                        {sending === s.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => handleDelete(s.id)}
                        title="Excluir"
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
