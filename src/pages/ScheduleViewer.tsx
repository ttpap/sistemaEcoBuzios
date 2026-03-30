// src/pages/ScheduleViewer.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Printer, Pencil, Send, CheckCircle2, ChevronDown, ChevronRight, History, Plus, Copy } from "lucide-react";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import { fetchScheduleFull, fetchSentSchedulesFull, sendSchedule, duplicateSchedule } from "@/integrations/supabase/oficina-schedules";
import { fetchClassesRemote } from "@/integrations/supabase/classes";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import type { OficinaScheduleFull } from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { getActiveProjectId } from "@/utils/projects";
import { showError, showSuccess } from "@/utils/toast";

const periodOrder: Record<string, number> = { "Manhã": 0, "Tarde": 1, "Noite": 2 };

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcTimeRange(
  startTime: string,
  activities: { durationMinutes: number | null }[]
): string[] {
  const [h, m] = startTime.split(":").map(Number);
  let total = h * 60 + (m || 0);
  return activities.map((a) => {
    const start = formatTime(total);
    total += a.durationMinutes ?? 0;
    const end = formatTime(total);
    return a.durationMinutes ? `${start}/${end}` : start;
  });
}

/** Simple hash → hsl color for a string */
function strToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 88%)`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dayMonth} ${dayName}`;
}

export default function ScheduleViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [full, setFull] = useState<OficinaScheduleFull | null>(null);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [history, setHistory] = useState<OficinaScheduleFull[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    const projectId = getActiveProjectId();
    const run = async () => {
      try {
        const [scheduleData, classes, teachers] = await Promise.all([
          fetchScheduleFull(id),
          projectId ? fetchClassesRemote(projectId) : Promise.resolve([]),
          fetchTeachers(),
        ]);
        setFull(scheduleData);
        setAllClasses(classes);
        setAllTeachers(teachers);
        // Load all other sent schedules for history
        if (projectId) {
          const sent = await fetchSentSchedulesFull(projectId);
          setHistory(
            sent
              .filter((s) => s.schedule.id !== id)
              .sort((a, b) => {
                const aDate = a.schedule.sentAt ? new Date(a.schedule.sentAt).getTime() : 0;
                const bDate = b.schedule.sentAt ? new Date(b.schedule.sentAt).getTime() : 0;
                return bDate - aDate;
              })
          );
        }
      } catch {
        showError("Erro ao carregar escala.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  if (loading || !full) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const turmaIds = [
    ...new Set(full.sessions.map((s) => s.turmaId)),
  ].sort((a, b) => {
    const ca = allClasses.find((c) => c.id === a);
    const cb = allClasses.find((c) => c.id === b);
    const pa = periodOrder[ca?.period ?? ""] ?? 99;
    const pb = periodOrder[cb?.period ?? ""] ?? 99;
    if (pa !== pb) return pa - pb;
    return (ca?.startTime ?? "").localeCompare(cb?.startTime ?? "");
  });

  const dates = [...new Set(full.sessions.map((s) => s.date))].sort();

  function getTeacherName(teacherId: string | null): string {
    if (teacherId === null) return "Todos";
    const t = allTeachers.find((t) => t.id === teacherId);
    return t?.fullName?.split(" ")[0] ?? "—";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl bg-white shadow-sm border border-slate-100"
            onClick={() => navigate(`${base}/escalas`)}
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight">
              {full.schedule.weekNumber}ª Semana
            </h1>
            <p className="text-slate-500 font-medium">Visualização da escala.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`${base}/escalas/${id}/editar`)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>

          {full.schedule.sentAt ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                disabled={duplicating}
                onClick={async () => {
                  if (!id) return;
                  setDuplicating(true);
                  try {
                    const newSched = await duplicateSchedule(id);
                    if (!newSched) { showError("Erro ao duplicar escala."); return; }
                    showSuccess(`Semana ${newSched.weekNumber} criada como rascunho.`);
                    navigate(`${base}/escalas/${newSched.id}/editar`);
                  } catch {
                    showError("Erro ao duplicar escala.");
                  } finally {
                    setDuplicating(false);
                  }
                }}
              >
                {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Duplicar
              </Button>
              <Button variant="outline" className="gap-2 text-emerald-600 border-emerald-200 bg-emerald-50 cursor-default" disabled>
                <CheckCircle2 className="h-4 w-4" />
                Enviada
              </Button>
              <Button
                className="gap-2"
                onClick={() => navigate(`${base}/escalas/nova`)}
              >
                <Plus className="h-4 w-4" />
                Nova Escala
              </Button>
            </>
          ) : (
            <Button
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              disabled={sending}
              onClick={async () => {
                if (!id) return;
                if (!confirm("Enviar esta escala para os educadores e coordenadores?")) return;
                setSending(true);
                try {
                  await sendSchedule(id);
                  showSuccess("Escala enviada! Educadores já podem ver na agenda deles.");
                  navigate(`${base}/escalas`);
                } catch {
                  showError("Erro ao enviar escala.");
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Sent banner */}
      {full.schedule.sentAt && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 print:hidden">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Escala enviada aos educadores</p>
            <p className="text-xs text-emerald-600">
              Enviada em {new Date(full.schedule.sentAt).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-lg font-bold">
          {full.schedule.weekNumber}ª Semana — {formatDate(full.schedule.weekStartDate)}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-max w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-slate-100 border border-slate-300 text-left text-slate-600 font-medium min-w-32">
                Turma
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-2 bg-slate-100 border border-slate-300 text-center font-medium text-slate-700 min-w-40"
                >
                  {formatDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turmaIds.map((turmaId) => {
              const turma = allClasses.find((c) => c.id === turmaId);
              return (
                <tr key={turmaId} className="align-top">
                  <td className="px-3 py-3 border border-slate-200 bg-indigo-50">
                    <p className="font-semibold text-indigo-800 text-xs uppercase tracking-wide">
                      {turma?.period ?? ""}
                    </p>
                    <p className="font-medium text-slate-700 mt-0.5">{turma?.name ?? turmaId}</p>
                    {turma?.startTime && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {turma.startTime} – {turma.endTime}
                      </p>
                    )}
                  </td>
                  {dates.map((date) => {
                    const session = full.sessions.find(
                      (s) => s.turmaId === turmaId && s.date === date
                    );

                    if (!session) {
                      return (
                        <td
                          key={date}
                          className="px-3 py-3 border border-slate-200 bg-slate-50 text-center text-xs text-slate-300"
                        >
                          —
                        </td>
                      );
                    }

                    if (session.isHoliday) {
                      return (
                        <td
                          key={date}
                          className="px-3 py-3 border border-slate-200 bg-red-50 text-center text-xs text-red-500 font-medium"
                        >
                          Feriado
                        </td>
                      );
                    }

                    const activities = full.activities
                      .filter((a) => a.sessionId === session.id)
                      .sort((a, b) => a.orderIndex - b.orderIndex);

                    const timeRanges = turma?.startTime
                      ? calcTimeRange(turma.startTime, activities)
                      : [];

                    return (
                      <td
                        key={date}
                        className="px-2 py-2 border border-slate-200 align-top"
                      >
                        <div className="space-y-1">
                          {activities.map((activity, idx) => {
                            const teacherName = getTeacherName(activity.teacherId);
                            const bgColor =
                              activity.teacherId === null
                                ? "#fef9c3"
                                : strToColor(teacherName);
                            return (
                              <div
                                key={activity.id}
                                className="px-2 py-1.5 rounded-lg text-xs"
                                style={{ backgroundColor: bgColor }}
                              >
                                {timeRanges[idx] && (
                                  <div className="text-slate-500 font-medium mb-0.5">
                                    {timeRanges[idx]}
                                  </div>
                                )}
                                <div className="font-semibold text-slate-800">
                                  {activity.name || "—"}
                                </div>
                                <div className="text-slate-600 mt-0.5">{teacherName}</div>
                              </div>
                            );
                          })}
                          {activities.length === 0 && (
                            <span className="text-xs text-slate-300">Sem atividades</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Histórico de escalas enviadas ── */}
      {history.length > 0 && (
        <div className="print:hidden space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="font-bold text-slate-700">Histórico de Escalas Enviadas</h2>
            <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{history.length}</span>
          </div>

          {history.map((past) => {
            const isOpen = expanded.has(past.schedule.id);
            const pastDates = [...new Set(past.sessions.map((s) => s.date))].sort();
            const pastTurmaIds = [...new Set(past.sessions.map((s) => s.turmaId))].sort((a, b) => {
              const ca = allClasses.find((c) => c.id === a);
              const cb = allClasses.find((c) => c.id === b);
              const pa = periodOrder[ca?.period ?? ""] ?? 99;
              const pb = periodOrder[cb?.period ?? ""] ?? 99;
              if (pa !== pb) return pa - pb;
              return (ca?.startTime ?? "").localeCompare(cb?.startTime ?? "");
            });

            return (
              <div key={past.schedule.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header / toggle */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(past.schedule.id)) next.delete(past.schedule.id);
                    else next.add(past.schedule.id);
                    return next;
                  })}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="font-bold text-slate-800">{past.schedule.weekNumber}ª Semana</span>
                    <span className="text-sm text-slate-500">
                      {formatDate(past.schedule.weekStartDate)}
                    </span>
                    {past.schedule.sentAt && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        Enviada {new Date(past.schedule.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={(e) => { e.stopPropagation(); navigate(`${base}/escalas/${past.schedule.id}`); }}
                  >
                    Abrir →
                  </button>
                </button>

                {/* Expanded grid */}
                {isOpen && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="text-xs border-collapse" style={{ width: `${160 + pastDates.length * 288}px` }}>
                      <thead>
                        <tr>
                          <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-left text-slate-500 font-medium w-40">Turma</th>
                          {pastDates.map((d) => (
                            <th key={d} className="px-3 py-2 bg-slate-50 border border-slate-200 text-center text-slate-600 font-medium w-72">{formatDate(d)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastTurmaIds.map((turmaId) => {
                          const turma = allClasses.find((c) => c.id === turmaId);
                          return (
                            <tr key={turmaId} className="align-top">
                              <td className="px-3 py-2 border border-slate-200 bg-indigo-50">
                                <p className="font-semibold text-indigo-700 text-xs">{turma?.name ?? turmaId}</p>
                                {turma?.startTime && <p className="text-slate-400 text-xs">{turma.startTime}</p>}
                              </td>
                              {pastDates.map((date) => {
                                const session = past.sessions.find((s) => s.turmaId === turmaId && s.date === date);
                                if (!session) return <td key={date} className="px-2 py-2 border border-slate-200 text-center text-slate-300 text-xs">—</td>;
                                if (session.isHoliday) return <td key={date} className="px-2 py-2 border border-slate-200 bg-red-50 text-center text-xs text-red-400">Feriado</td>;
                                const acts = past.activities.filter((a) => a.sessionId === session.id).sort((a, b) => a.orderIndex - b.orderIndex);
                                return (
                                  <td key={date} className="px-2 py-2 border border-slate-200 align-top">
                                    <div className="space-y-1">
                                      {acts.map((activity) => {
                                        const teacherName = getTeacherName(activity.teacherId);
                                        const bgColor = activity.teacherId === null ? "#fef9c3" : strToColor(teacherName);
                                        return (
                                          <div key={activity.id} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: bgColor }}>
                                            <div className="font-semibold text-slate-800">{activity.name}</div>
                                            <div className="text-slate-500">{teacherName}</div>
                                          </div>
                                        );
                                      })}
                                      {acts.length === 0 && <span className="text-xs text-slate-300">—</span>}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { background: white; }
          table { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
