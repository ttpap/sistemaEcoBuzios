// src/components/ScheduleGrid.tsx

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
  OficinaScheduleAssignment,
  OficinaScheduleActivity,
  OficinaScheduleSession,
} from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { saveScheduleActivitiesForTurma } from "@/integrations/supabase/oficina-schedules";
import { showError } from "@/utils/toast";

interface ScheduleGridProps {
  full: OficinaScheduleFull;
  allClasses: SchoolClass[];
  allTeachers: TeacherRegistration[];
  projectStaff: { id: string; fullName: string }[];
  saving: boolean;
  onSave: (assignments: Omit<OficinaScheduleAssignment, "id">[]) => Promise<void>;
}

type DraftActivity = {
  _key: string;
  id: string | null;
  name: string;
  durationMinutes: number | null;
  orderIndex: number;
};

type AssignmentMap = Map<string, string | null>; // `${sessionId}:${activityId}` → teacherId

let _keyCounter = 0;
function newKey() {
  return `draft_${++_keyCounter}`;
}

function groupSessionsByDate(
  sessions: OficinaScheduleSession[],
  allClasses: SchoolClass[]
): Map<string, OficinaScheduleSession[]> {
  const map = new Map<string, OficinaScheduleSession[]>();
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    const list = map.get(s.date) ?? [];
    list.push(s);
    map.set(s.date, list);
  }
  const periodOrder: Record<string, number> = { "Manhã": 0, "Tarde": 1, "Noite": 2 };
  for (const [date, list] of map.entries()) {
    list.sort((a, b) => {
      const ca = allClasses.find((c) => c.id === a.turmaId);
      const cb = allClasses.find((c) => c.id === b.turmaId);
      const pa = periodOrder[ca?.period ?? ""] ?? 99;
      const pb = periodOrder[cb?.period ?? ""] ?? 99;
      if (pa !== pb) return pa - pb;
      return (ca?.startTime ?? "").localeCompare(cb?.startTime ?? "");
    });
    map.set(date, list);
  }
  return map;
}

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
    return d.durationMinutes ? `${start}/${end}` : start;
  });
}

const TODOS_VALUE = "__todos__";

export default function ScheduleGrid({
  full,
  allClasses,
  allTeachers,
  projectStaff,
  saving,
  onSave,
}: ScheduleGridProps) {
  const [draftsByTurma, setDraftsByTurma] = useState<Map<string, DraftActivity[]>>(new Map());
  const [assignments, setAssignments] = useState<AssignmentMap>(new Map());

  // Init drafts from full.activities
  useEffect(() => {
    const map = new Map<string, DraftActivity[]>();
    for (const a of full.activities) {
      const list = map.get(a.turmaId) ?? [];
      list.push({
        _key: a.id,
        id: a.id,
        name: a.name,
        durationMinutes: a.durationMinutes,
        orderIndex: a.orderIndex,
      });
      map.set(a.turmaId, list);
    }
    for (const [turmaId, list] of map.entries()) {
      map.set(turmaId, list.sort((a, b) => a.orderIndex - b.orderIndex));
    }
    setDraftsByTurma(map);
  }, [full.activities]);

  // Init assignments from full.assignments
  useEffect(() => {
    const map = new Map<string, string | null>();
    for (const a of full.assignments) {
      map.set(`${a.sessionId}:${a.scheduleActivityId}`, a.teacherId);
    }
    setAssignments(map);
  }, [full.assignments]);

  function setDraftField(turmaId: string, key: string, patch: Partial<DraftActivity>) {
    setDraftsByTurma((prev) => {
      const next = new Map(prev);
      const list = (prev.get(turmaId) ?? []).map((d) =>
        d._key === key ? { ...d, ...patch } : d
      );
      next.set(turmaId, list);
      return next;
    });
  }

  function addActivity(turmaId: string) {
    setDraftsByTurma((prev) => {
      const next = new Map(prev);
      const list = prev.get(turmaId) ?? [];
      next.set(turmaId, [
        ...list,
        {
          _key: newKey(),
          id: null,
          name: "",
          durationMinutes: null,
          orderIndex: list.length,
        },
      ]);
      return next;
    });
  }

  function removeActivity(turmaId: string, key: string) {
    setDraftsByTurma((prev) => {
      const next = new Map(prev);
      next.set(
        turmaId,
        (prev.get(turmaId) ?? []).filter((d) => d._key !== key)
      );
      return next;
    });
  }

  function setAssignment(sessionId: string, activityId: string, teacherId: string | null) {
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(`${sessionId}:${activityId}`, teacherId);
      return next;
    });
  }

  async function handleSave() {
    const turmaIds = [...new Set(full.sessions.map((s) => s.turmaId))];
    // Save activities per turma to get stable IDs
    const savedByTurma = new Map<string, OficinaScheduleActivity[]>();
    try {
      await Promise.all(
        turmaIds.map(async (turmaId) => {
          const drafts = draftsByTurma.get(turmaId) ?? [];
          const saved = await saveScheduleActivitiesForTurma(
            full.schedule.id,
            turmaId,
            drafts.map((d, i) => ({
              id: d.id,
              name: d.name,
              durationMinutes: d.durationMinutes,
              orderIndex: i,
            }))
          );
          savedByTurma.set(turmaId, saved);
        })
      );
    } catch {
      showError("Erro ao salvar atividades.");
      return;
    }

    // Update local drafts with the saved IDs
    setDraftsByTurma((prev) => {
      const next = new Map(prev);
      for (const [turmaId, saved] of savedByTurma.entries()) {
        const existing = prev.get(turmaId) ?? [];
        const updated = saved.map((s, i) => ({
          _key: s.id,
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          orderIndex: i,
        }));
        // Preserve any drafts that were not yet saved (shouldn't happen, but safety)
        const unsaved = existing.filter(
          (d) => !d.id && !updated.find((u) => u.name === d.name)
        );
        next.set(turmaId, [...updated, ...unsaved]);
      }
      return next;
    });

    // Build assignments from current map (only include entries with valid activity IDs)
    const result: Omit<OficinaScheduleAssignment, "id">[] = [];
    for (const [key, teacherId] of assignments.entries()) {
      const colonIdx = key.indexOf(":");
      const sessionId = key.slice(0, colonIdx);
      const scheduleActivityId = key.slice(colonIdx + 1);
      if (sessionId && scheduleActivityId) {
        result.push({ sessionId, scheduleActivityId, teacherId });
      }
    }
    await onSave(result);
  }

  const sessionsByDate = groupSessionsByDate(full.sessions, allClasses);
  const dates = [...sessionsByDate.keys()];
  const maxSlots = Math.max(...[...sessionsByDate.values()].map((s) => s.length), 0);

  if (maxSlots === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Grade de Atribuições</h2>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar escala
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-max">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-center text-slate-500 font-medium min-w-24">
                Horário
              </th>
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-center w-16 text-slate-500 font-medium">
                Min
              </th>
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-left text-slate-600 font-medium min-w-44">
                Atividade
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 text-center font-medium text-slate-700 min-w-36"
                >
                  {formatDate(date)}
                </th>
              ))}
              <th className="px-2 py-2 bg-slate-50 border border-slate-200 w-8" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxSlots }, (_, slotIndex) => {
              const representativeSession = [...sessionsByDate.values()]
                .map((sessions) => sessions[slotIndex])
                .find(Boolean);
              if (!representativeSession) return null;

              const turmaId = representativeSession.turmaId;
              const slotTurma = allClasses.find((c) => c.id === turmaId);
              const drafts = draftsByTurma.get(turmaId) ?? [];
              const timeRanges = slotTurma?.startTime
                ? calcTimeRanges(slotTurma.startTime, drafts)
                : [];

              return (
                <React.Fragment key={turmaId}>
                  {/* Section header */}
                  <tr>
                    <td
                      colSpan={4 + dates.length}
                      className="px-3 py-1.5 bg-indigo-50 border border-slate-200 text-xs font-semibold text-indigo-700 uppercase tracking-wide"
                    >
                      {slotTurma?.period ?? ""} — {slotTurma?.name ?? ""}
                    </td>
                  </tr>

                  {/* Activity rows */}
                  {drafts.map((draft, dIdx) => (
                    <tr key={draft._key} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 border border-slate-200 text-center text-xs text-slate-500 whitespace-nowrap">
                        {timeRanges[dIdx] ?? ""}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200">
                        <Input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={draft.durationMinutes ?? ""}
                          onChange={(e) =>
                            setDraftField(turmaId, draft._key, {
                              durationMinutes: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            })
                          }
                          className="h-7 w-14 text-center text-xs px-1"
                        />
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200">
                        <Input
                          type="text"
                          placeholder="Nome da atividade"
                          value={draft.name}
                          onChange={(e) =>
                            setDraftField(turmaId, draft._key, { name: e.target.value })
                          }
                          className="h-7 text-xs min-w-36"
                        />
                      </td>

                      {dates.map((date) => {
                        const session = sessionsByDate.get(date)?.[slotIndex];
                        if (!session) {
                          return (
                            <td
                              key={date}
                              className="px-3 py-2 border border-slate-200 bg-slate-50"
                            />
                          );
                        }
                        if (session.isHoliday) {
                          return (
                            <td
                              key={date}
                              className="px-3 py-2 border border-slate-200 bg-red-50 text-center text-xs text-red-400 font-medium"
                            >
                              Feriado
                            </td>
                          );
                        }
                        if (!draft.id) {
                          return (
                            <td
                              key={date}
                              className="px-3 py-2 border border-slate-200 bg-slate-50 text-center text-xs text-slate-400"
                            >
                              Salve primeiro
                            </td>
                          );
                        }

                        const assignmentKey = `${session.id}:${draft.id}`;
                        const currentTeacherId = assignments.get(assignmentKey);
                        const sessionTurmaTeacherIds =
                          allClasses.find((c) => c.id === session.turmaId)?.teacherIds ?? [];
                        const sessionTeachers = sessionTurmaTeacherIds
                          .map((tid) => allTeachers.find((t) => t.id === tid))
                          .filter((t): t is TeacherRegistration => t !== undefined);
                        const coordIds = new Set(projectStaff.map((s) => s.id));
                        const cellStaff: { id: string; fullName: string }[] = [
                          ...projectStaff,
                          ...sessionTeachers.filter((t) => !coordIds.has(t.id)),
                        ];

                        return (
                          <td key={date} className="px-2 py-1.5 border border-slate-200">
                            <Select
                              value={
                                currentTeacherId === null
                                  ? TODOS_VALUE
                                  : currentTeacherId ?? ""
                              }
                              onValueChange={(val) =>
                                setAssignment(
                                  session.id,
                                  draft.id!,
                                  val === TODOS_VALUE ? null : val
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-full min-w-28">
                                <SelectValue placeholder="—" />
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
                          </td>
                        );
                      })}

                      {/* Delete activity */}
                      <td className="px-1 py-1 border border-slate-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => removeActivity(turmaId, draft._key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* Add activity row */}
                  <tr>
                    <td
                      colSpan={4 + dates.length}
                      className="px-3 py-1 border border-slate-200 bg-slate-50/50"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-slate-500 hover:text-slate-700 gap-1"
                        onClick={() => addActivity(turmaId)}
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar atividade
                      </Button>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
