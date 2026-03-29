// src/components/ScheduleGrid.tsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type {
  OficinaScheduleFull,
  OficinaScheduleAssignment,
  OficinaActivityTemplate,
  OficinaScheduleSession,
} from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { fetchTemplatesByTurma } from "@/integrations/supabase/oficina-schedules";

interface ScheduleGridProps {
  full: OficinaScheduleFull;
  allClasses: SchoolClass[];
  allTeachers: TeacherRegistration[];
  projectStaff: { id: string; fullName: string }[];
  saving: boolean;
  onSave: (assignments: Omit<OficinaScheduleAssignment, "id">[]) => Promise<void>;
}

type AssignmentMap = Map<string, string | null>; // key: `${sessionId}:${activityId}` → teacherId | null

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

const TODOS_VALUE = "__todos__";

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcTimeRanges(
  startTime: string,
  templates: OficinaActivityTemplate[]
): string[] {
  const [h, m] = startTime.split(":").map(Number);
  let total = h * 60 + (m || 0);
  return templates.map((t) => {
    const start = formatTime(total);
    total += t.durationMinutes ?? 0;
    const end = formatTime(total);
    return t.durationMinutes ? `${start}/${end}` : start;
  });
}

export default function ScheduleGrid({
  full,
  allClasses,
  allTeachers,
  projectStaff,
  saving,
  onSave,
}: ScheduleGridProps) {
  const [templatesByTurma, setTemplatesByTurma] = useState<
    Map<string, OficinaActivityTemplate[]>
  >(new Map());
  const [assignments, setAssignments] = useState<AssignmentMap>(new Map());
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const turmaIds = [...new Set(full.sessions.map((s) => s.turmaId))];
    if (turmaIds.length === 0) { setLoadingTemplates(false); return; }

    Promise.all(
      turmaIds.map(async (turmaId) => {
        const templates = await fetchTemplatesByTurma(turmaId);
        return [turmaId, templates] as [string, OficinaActivityTemplate[]];
      })
    ).then((entries) => {
      setTemplatesByTurma(new Map(entries));
      setLoadingTemplates(false);
    });
  }, [full.sessions]);

  useEffect(() => {
    const map = new Map<string, string | null>();
    for (const a of full.assignments) {
      map.set(`${a.sessionId}:${a.activityTemplateId}`, a.teacherId);
    }
    setAssignments(map);
  }, [full.assignments]);

  function setAssignment(sessionId: string, activityId: string, teacherId: string | null) {
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(`${sessionId}:${activityId}`, teacherId);
      return next;
    });
  }

  async function handleSave() {
    const result: Omit<OficinaScheduleAssignment, "id">[] = [];
    for (const [key, teacherId] of assignments.entries()) {
      const [sessionId, activityTemplateId] = key.split(":");
      result.push({ sessionId, activityTemplateId, teacherId });
    }
    await onSave(result);
  }

  const sessionsByDate = groupSessionsByDate(full.sessions, allClasses);
  const dates = [...sessionsByDate.keys()];
  const maxSlots = Math.max(...[...sessionsByDate.values()].map((s) => s.length), 0);

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-center w-12 text-slate-500 font-medium">
                Min
              </th>
              <th className="px-3 py-2 bg-slate-50 border border-slate-200 text-left text-slate-600 font-medium min-w-32">
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
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxSlots }, (_, slotIndex) => {
              const representativeSession = [...sessionsByDate.values()]
                .map((sessions) => sessions[slotIndex])
                .find(Boolean);
              if (!representativeSession) return null;

              const slotTurma = allClasses.find(
                (c) => c.id === representativeSession.turmaId
              );
              const templates = templatesByTurma.get(representativeSession.turmaId) ?? [];

              const timeRanges = slotTurma?.startTime
                ? calcTimeRanges(slotTurma.startTime, templates)
                : [];

              return (
                <React.Fragment key={representativeSession.turmaId}>
                  <tr>
                    <td
                      colSpan={3 + dates.length}
                      className="px-3 py-1.5 bg-indigo-50 border border-slate-200 text-xs font-semibold text-indigo-700 uppercase tracking-wide"
                    >
                      {slotTurma?.period ?? ""} — {slotTurma?.name ?? ""}
                    </td>
                  </tr>
                  {templates.map((template, tIdx) => (
                    <tr key={template.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 border border-slate-200 text-center text-xs text-slate-500 whitespace-nowrap">
                        {timeRanges[tIdx] ?? ""}
                      </td>
                      <td className="px-3 py-2 border border-slate-200 text-center text-slate-400">
                        {template.durationMinutes ?? "—"}
                      </td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-700">
                        {template.name}
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
                        const sessionTemplates = templatesByTurma.get(session.turmaId) ?? [];
                        const matchingTemplate = sessionTemplates.find(
                          (t) => t.name === template.name
                        );
                        if (!matchingTemplate) {
                          return (
                            <td
                              key={date}
                              className="px-3 py-2 border border-slate-200 bg-slate-50"
                            />
                          );
                        }
                        const assignmentKey = `${session.id}:${matchingTemplate.id}`;
                        const currentTeacherId = assignments.get(assignmentKey);
                        const sessionTurmaTeacherIds =
                          allClasses.find((c) => c.id === session.turmaId)?.teacherIds ?? [];
                        const sessionTeachers = sessionTurmaTeacherIds
                          .map((tid) => allTeachers.find((t) => t.id === tid))
                          .filter((t): t is TeacherRegistration => t !== undefined);
                        // Combine turma teachers + project coordinators (deduplicated)
                        const coordIds = new Set(projectStaff.map((s) => s.id));
                        const cellStaff: { id: string; fullName: string }[] = [
                          ...projectStaff,
                          ...sessionTeachers.filter((t) => !coordIds.has(t.id)),
                        ];

                        return (
                          <td
                            key={date}
                            className="px-2 py-1.5 border border-slate-200"
                          >
                            <Select
                              value={
                                currentTeacherId === null
                                  ? TODOS_VALUE
                                  : currentTeacherId ?? ""
                              }
                              onValueChange={(val) =>
                                setAssignment(
                                  session.id,
                                  matchingTemplate.id,
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
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
