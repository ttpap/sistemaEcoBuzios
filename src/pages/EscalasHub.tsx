// src/pages/EscalasHub.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Eye, Trash2, Pencil, Copy, Send, CheckCircle2, CalendarDays, FileEdit } from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import {
  fetchSchedulesByProject,
  deleteSchedule,
  duplicateSchedule,
  sendSchedule,
} from "@/integrations/supabase/oficina-schedules";
import type { OficinaSchedule } from "@/types/oficina-schedule";
import { showError, showSuccess } from "@/utils/toast";
import { getAreaBaseFromPathname } from "@/utils/route-base";

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
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [schedules, setSchedules] = useState<OficinaSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    const projectId = getActiveProjectId();
    if (!projectId) { setLoading(false); return; }
    fetchSchedulesByProject(projectId)
      .then((data) => setSchedules(data))
      .catch(() => showError("Erro ao carregar escalas."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta escala? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteSchedule(id);
      showSuccess("Escala excluída.");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {
      showError("Erro ao excluir escala.");
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    try {
      const newSched = await duplicateSchedule(id);
      if (!newSched) { showError("Erro ao duplicar escala."); return; }
      showSuccess(`Semana ${newSched.weekNumber} criada como rascunho.`);
      setSchedules((prev) => [...prev, newSched]);
    } catch {
      showError("Erro ao duplicar escala.");
    } finally {
      setDuplicating(null);
    }
  }

  async function handleSend(id: string) {
    if (!confirm("Enviar esta escala para todos os educadores e coordenadores?")) return;
    setSending(id);
    try {
      await sendSchedule(id);
      showSuccess("Escala enviada! Os educadores já podem ver na agenda deles.");
      setSchedules((prev) =>
        prev.map((s) => s.id === id ? { ...s, sentAt: new Date().toISOString() } : s)
      );
    } catch {
      showError("Erro ao enviar escala.");
    } finally {
      setSending(null);
    }
  }

  const drafts = schedules.filter((s) => !s.sentAt).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  const sent = schedules.filter((s) => s.sentAt).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Escalas</h1>
          <p className="text-slate-500 font-medium">Cronogramas semanais de oficinas.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate(`${base}/escalas/nova`)}>
          <Plus className="h-4 w-4" /> Nova Escala
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center space-y-3">
          <CalendarDays className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-slate-400 font-medium">Nenhuma escala criada ainda.</p>
          <p className="text-slate-400 text-sm">Crie uma nova escala, preencha e envie para os educadores.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Rascunhos */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                Rascunhos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-800 text-xl leading-tight">
                          {formatWeekPeriod(s.weekStartDate)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.weekNumber}ª Semana
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                        <FileEdit className="h-3 w-3" />
                        Rascunho
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        className="gap-1.5 flex-1 text-xs h-8"
                        disabled={sending === s.id}
                        onClick={() => handleSend(s.id)}
                      >
                        {sending === s.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Send className="h-3 w-3" />
                        }
                        Enviar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 shrink-0"
                        title="Editar"
                        onClick={() => navigate(`${base}/escalas/${s.id}/editar`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                        title="Excluir"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enviadas */}
          {sent.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                Escalas Enviadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sent.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`${base}/escalas/${s.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-800 text-xl leading-tight">
                          {formatWeekPeriod(s.weekStartDate)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.weekNumber}ª Semana
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Enviada
                      </span>
                    </div>

                    {s.sentAt && (
                      <p className="text-xs text-slate-400">
                        Enviada em {new Date(s.sentAt).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 flex-1 text-xs h-8"
                        onClick={() => navigate(`${base}/escalas/${s.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 shrink-0"
                        title="Editar"
                        onClick={() => navigate(`${base}/escalas/${s.id}/editar`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-violet-600 shrink-0"
                        title="Duplicar para próxima semana"
                        disabled={duplicating === s.id}
                        onClick={() => handleDuplicate(s.id)}
                      >
                        {duplicating === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                        title="Excluir"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
