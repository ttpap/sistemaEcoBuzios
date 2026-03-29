// src/components/ScheduleGrid.tsx
// Grade: linhas = turmas, colunas = datas.
// Cada célula (turma × dia) tem sua própria lista independente de atividades.

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  OficinaScheduleFull,
  OficinaScheduleActivity,
  OficinaScheduleSession,
} from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { saveSessionActivities } from "@/integrations/supabase/oficina-schedules";
import { showError } from "@/utils/toast";

interface ScheduleGridProps {
  full: OficinaScheduleFull;
  allClasses: SchoolClass[];
  allTeachers: TeacherRegistration[];
  projectStaff: { id: string; fullName: string }[];
  saving: boolean;
  onSave: () => Promise<void>;
  /** Activities from previous week, keyed by currentSessionId. Used to prefill empty schedules. */
  prefillMap?: Map<string, { name: string; durationMinutes: number | null }[]>;
}

// Draft activity for a single cell
type DraftActivity = {
  _key: string;
  id: string | null;
  name: string;
  durationMinutes: number | null;
  teacherId: string | null;
};

// State: Map keyed by sessionId → DraftActivity[]
type CellDrafts = Map<string, DraftActivity[]>;

let _keyCounter = 0;
function newKey() {
  return `d${++_keyCounter}`;
}

const TODOS_VALUE = "__todos__";
const periodOrder: Record<string, number> = { "Manhã": 0, "Tarde": 1, "Noite": 2 };

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dayMonth} ${dayName}`;
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcTimeRanges(startTime: string, drafts: DraftActivity[]): string[] {
  const [h, m] = startTime.split(":").map(Number);
  let total = h * 60 + (m || 0);
  return drafts.map((d) => {
    const start = formatTime(total);
    total += d.durationMinutes ?? 0;
    const end = formatTime(total);
    return d.durationMinutes ? `${start}/${end}` : "";
  });
}

export default function ScheduleGrid({
  full,
  allClasses,
  allTeachers,
  projectStaff,
  saving,
  onSave,
  prefillMap,
}: ScheduleGridProps) {
  const [cellDrafts, setCellDrafts] = useState<CellDrafts>(new Map());
  const [wasPrefilled, setWasPrefilled] = useState(false);

  // Init drafts from full.activities, or from prefillMap when schedule is new/empty
  useEffect(() => {
    if (full.activities.length > 0) {
      const map = new Map<string, DraftActivity[]>();
      for (const sessionId of new Set(full.activities.map((a) => a.sessionId))) {
        const sorted = full.activities
          .filter((a) => a.sessionId === sessionId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        map.set(
          sessionId,
          sorted.map((a) => ({
            _key: a.id,
            id: a.id,
            name: a.name,
            durationMinutes: a.durationMinutes,
            teacherId: a.teacherId,
          }))
        );
      }

      // Auto-propagar para sessões sem atividades salvas
      const filledIds = new Set(full.activities.map((a) => a.sessionId));
      const firstFilledSession = full.sessions
        .filter((s) => filledIds.has(s.id) && !s.isHoliday)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      if (firstFilledSession) {
        const template = map.get(firstFilledSession.id) ?? [];
        for (const session of full.sessions) {
          if (!filledIds.has(session.id) && !session.isHoliday) {
            map.set(session.id, template.map((a) => ({
              ...a,
              _key: newKey(),
              id: null,       // não salvo ainda
              teacherId: null, // professor em branco
            })));
          }
        }
      }

      setCellDrafts(map);
      setWasPrefilled(false);
    } else if (prefillMap && prefillMap.size > 0) {
      // Prefill from previous week: same activities, teachers em branco
      const map = new Map<string, DraftActivity[]>();
      for (const [sessionId, activities] of prefillMap.entries()) {
        map.set(
          sessionId,
          activities.map((a) => ({
            _key: newKey(),
            id: null,
            name: a.name,
            durationMinutes: a.durationMinutes,
            teacherId: null,
          }))
        );
      }
      setCellDrafts(map);
      setWasPrefilled(true);
    }
  }, [full.activities, prefillMap]);

  function setDraftField(sessionId: string, key: string, patch: Partial<DraftActivity>) {
    setCellDrafts((prev) => {
      const next = new Map(prev);
      const updated = (prev.get(sessionId) ?? []).map((d) =>
        d._key === key ? { ...d, ...patch } : d
      );
      next.set(sessionId, updated);

      // Auto-propagar para todas as células que ainda estão vazias
      // (só quando o campo "name" muda e tem conteúdo)
      if (patch.name !== undefined) {
        const emptySessions = full.sessions.filter(
          (s) => s.id !== sessionId && (prev.get(s.id) ?? []).length === 0
        );
        if (emptySessions.length > 0) {
          const template = updated.map((a) => ({
            ...a,
            _key: newKey(),
            id: null,
            teacherId: null,
          }));
          for (const s of emptySessions) {
            next.set(s.id, template.map((a) => ({ ...a, _key: newKey() })));
          }
        }
      }

      return next;
    });
  }

  function addActivity(sessionId: string) {
    setCellDrafts((prev) => {
      const next = new Map(prev);
      const list = prev.get(sessionId) ?? [];
      const newActivity = { _key: newKey(), id: null, name: "", durationMinutes: null, teacherId: null };
      next.set(sessionId, [...list, newActivity]);

      // Se esta célula estava vazia e agora tem 1 atividade,
      // propagar o novo item para todas as outras células vazias
      if (list.length === 0) {
        const emptySessions = full.sessions.filter(
          (s) => s.id !== sessionId && (prev.get(s.id) ?? []).length === 0
        );
        for (const s of emptySessions) {
          next.set(s.id, [{ ...newActivity, _key: newKey() }]);
        }
      }

      return next;
    });
  }

  function removeActivity(sessionId: string, key: string) {
    setCellDrafts((prev) => {
      const next = new Map(prev);
      next.set(
        sessionId,
        (prev.get(sessionId) ?? []).filter((d) => d._key !== key)
      );
      return next;
    });
  }

  async function handleSave() {
    try {
      await Promise.all(
        full.sessions.map((session) => {
          const drafts = cellDrafts.get(session.id) ?? [];
          return saveSessionActivities(
            session.id,
            drafts.map((d, i) => ({
              id: d.id,
              name: d.name,
              durationMinutes: d.durationMinutes,
              orderIndex: i,
              teacherId: d.teacherId,
            }))
          ).then((saved) => {
            // Update local drafts with server IDs
            setCellDrafts((prev) => {
              const next = new Map(prev);
              next.set(
                session.id,
                saved.map((s) => ({
                  _key: s.id,
                  id: s.id,
                  name: s.name,
                  durationMinutes: s.durationMinutes,
                  teacherId: s.teacherId,
                }))
              );
              return next;
            });
          });
        })
      );
    } catch {
      showError("Erro ao salvar atividades.");
      return;
    }
    await onSave();
  }

  // Sorted unique turmaIds by period → startTime
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

  // Sorted unique dates
  const dates = [...new Set(full.sessions.map((s) => s.date))].sort();

  if (turmaIds.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-white py-2 -mx-6 px-6 border-b border-slate-100">
        <h2 className="font-bold text-slate-800">Grade de Atividades</h2>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar escala
        </Button>
      </div>

      {wasPrefilled && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span>
            Atividades copiadas da semana anterior. Ajuste os responsáveis e salve.
          </span>
        </div>
      )}

      <style>{`
        .sgrid-scroll::-webkit-scrollbar { height: 10px; }
        .sgrid-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 5px; }
        .sgrid-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 5px; border: 2px solid #f1f5f9; }
        .sgrid-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
      <div
        className="sgrid-scroll overflow-x-scroll w-full"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "auto", scrollbarColor: "#94a3b8 #f1f5f9" }}
      >
        <table className="text-sm border-collapse min-w-max">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-left text-slate-600 font-medium min-w-32">
                Turma
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 text-center font-medium text-slate-700 min-w-56"
                >
                  {formatDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turmaIds.map((turmaId) => {
              const turma = allClasses.find((c) => c.id === turmaId);

              // Staff for this turma
              const turmaTeacherIds = turma?.teacherIds ?? [];
              const turmaTeachers = turmaTeacherIds
                .map((tid) => allTeachers.find((t) => t.id === tid))
                .filter((t): t is TeacherRegistration => t !== undefined);
              const coordIds = new Set(projectStaff.map((s) => s.id));
              const cellStaff: { id: string; fullName: string }[] = [
                ...projectStaff,
                ...turmaTeachers.filter((t) => !coordIds.has(t.id)),
              ];

              return (
                <tr key={turmaId} className="align-top">
                  {/* Turma label */}
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

                  {/* One cell per date */}
                  {dates.map((date) => {
                    const session = full.sessions.find(
                      (s) => s.turmaId === turmaId && s.date === date
                    );

                    // No session for this turma on this date
                    if (!session) {
                      return (
                        <td
                          key={date}
                          className="px-3 py-3 border border-slate-200 bg-slate-50/50 text-center text-xs text-slate-300"
                        >
                          —
                        </td>
                      );
                    }

                    // Holiday
                    if (session.isHoliday) {
                      return (
                        <td
                          key={date}
                          className="px-3 py-3 border border-slate-200 bg-red-50 text-center text-xs text-red-400 font-medium"
                        >
                          Feriado
                        </td>
                      );
                    }

                    const drafts = cellDrafts.get(session.id) ?? [];
                    const timeRanges = turma?.startTime
                      ? calcTimeRanges(turma.startTime, drafts)
                      : [];

                    return (
                      <td
                        key={date}
                        className="px-2 py-2 border border-slate-200 align-top"
                      >
                        <div className="space-y-1.5 min-w-48">
                          {drafts.map((draft, dIdx) => (
                            <div
                              key={draft._key}
                              className="flex flex-col gap-1 p-2 rounded-lg border border-slate-100 bg-slate-50/70"
                            >
                              {/* Time range */}
                              {timeRanges[dIdx] && (
                                <span className="text-xs text-slate-400 font-medium">
                                  {timeRanges[dIdx]}
                                </span>
                              )}
                              {/* Name + duration + delete */}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="text"
                                  placeholder="Atividade"
                                  value={draft.name}
                                  onChange={(e) =>
                                    setDraftField(session.id, draft._key, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="h-6 text-xs flex-1 min-w-0 px-1.5"
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="min"
                                  value={draft.durationMinutes ?? ""}
                                  onChange={(e) =>
                                    setDraftField(session.id, draft._key, {
                                      durationMinutes: e.target.value
                                        ? parseInt(e.target.value, 10)
                                        : null,
                                    })
                                  }
                                  className="h-6 w-12 text-center text-xs px-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-400 hover:text-red-600 flex-shrink-0"
                                  onClick={() => removeActivity(session.id, draft._key)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {/* Teacher */}
                              <Select
                                value={
                                  draft.teacherId === null
                                    ? TODOS_VALUE
                                    : draft.teacherId ?? TODOS_VALUE
                                }
                                onValueChange={(val) =>
                                  setDraftField(session.id, draft._key, {
                                    teacherId: val === TODOS_VALUE ? null : val,
                                  })
                                }
                              >
                                <SelectTrigger className="h-6 text-xs w-full">
                                  <SelectValue placeholder="Responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={TODOS_VALUE}>Todos</SelectItem>
                                  {cellStaff.map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                      {person.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}

                          {/* Add activity */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-full text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-400 rounded-lg gap-1"
                            onClick={() => addActivity(session.id)}
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar
                          </Button>
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

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar escala
        </Button>
      </div>
    </div>
  );
}
