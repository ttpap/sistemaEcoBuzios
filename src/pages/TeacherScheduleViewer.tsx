// src/pages/TeacherScheduleViewer.tsx
// Grade completa da escala para o professor — read-only, com células do professor destacadas.

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchScheduleFull } from "@/integrations/supabase/oficina-schedules";
import { fetchClassesRemote } from "@/integrations/supabase/classes";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import { getTeacherSessionTeacherId } from "@/utils/teacher-auth";
import { getActiveProjectId } from "@/utils/projects";
import { showError } from "@/utils/toast";
import type { OficinaScheduleFull } from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";

const periodOrder: Record<string, number> = { "Manhã": 0, "Tarde": 1, "Noite": 2 };

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcTimeRange(startTime: string, activities: { durationMinutes: number | null }[]): string[] {
  const [h, m] = startTime.split(":").map(Number);
  let total = h * 60 + (m || 0);
  return activities.map((a) => {
    const start = formatTime(total);
    total += a.durationMinutes ?? 0;
    const end = formatTime(total);
    return a.durationMinutes ? `${start}/${end}` : start;
  });
}

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

export default function TeacherScheduleViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const teacherId = getTeacherSessionTeacherId();

  const [full, setFull] = useState<OficinaScheduleFull | null>(null);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherRegistration[]>([]);
  const [loading, setLoading] = useState(true);

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

  const turmaIds = [...new Set(full.sessions.map((s) => s.turmaId))].sort((a, b) => {
    const ca = allClasses.find((c) => c.id === a);
    const cb = allClasses.find((c) => c.id === b);
    const pa = periodOrder[ca?.period ?? ""] ?? 99;
    const pb = periodOrder[cb?.period ?? ""] ?? 99;
    if (pa !== pb) return pa - pb;
    return (ca?.startTime ?? "").localeCompare(cb?.startTime ?? "");
  });

  const dates = [...new Set(full.sessions.map((s) => s.date))].sort();

  function getTeacherName(tId: string | null): string {
    if (tId === null) return "Todos";
    const t = allTeachers.find((t) => t.id === tId);
    return t?.fullName?.split(" ")[0] ?? "—";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-white shadow-sm border border-slate-100"
          onClick={() => navigate("/professor/agenda")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            {full.schedule.weekNumber}ª Semana — Escala Completa
          </h1>
          <p className="text-slate-500 font-medium">Visualização da grade da semana.</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-indigo-400 border border-indigo-500" />
          Suas atividades
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-200" />
          Todos os professores
        </span>
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
                    <p className="font-semibold text-indigo-800 text-xs uppercase tracking-wide">{turma?.period ?? ""}</p>
                    <p className="font-medium text-slate-700 mt-0.5">{turma?.name ?? turmaId}</p>
                    {turma?.startTime && (
                      <p className="text-xs text-slate-400 mt-0.5">{turma.startTime} – {turma.endTime}</p>
                    )}
                  </td>
                  {dates.map((date) => {
                    const session = full.sessions.find((s) => s.turmaId === turmaId && s.date === date);
                    if (!session) return (
                      <td key={date} className="px-3 py-3 border border-slate-200 bg-slate-50 text-center text-xs text-slate-300">—</td>
                    );
                    if (session.isHoliday) return (
                      <td key={date} className="px-3 py-3 border border-slate-200 bg-red-50 text-center text-xs text-red-500 font-medium">Feriado</td>
                    );

                    const activities = full.activities
                      .filter((a) => a.sessionId === session.id)
                      .sort((a, b) => a.orderIndex - b.orderIndex);

                    const timeRanges = turma?.startTime ? calcTimeRange(turma.startTime, activities) : [];

                    return (
                      <td key={date} className="px-2 py-2 border border-slate-200 align-top">
                        <div className="space-y-1">
                          {activities.map((activity, idx) => {
                            const isMe = activity.teacherId === teacherId;
                            const isAll = activity.teacherId === null;
                            const teacherName = getTeacherName(activity.teacherId);
                            const bgColor = isMe
                              ? "#818cf8" // indigo-400 — bem mais saturado
                              : isAll
                              ? "#fef9c3"
                              : strToColor(teacherName);
                            const borderColor = isMe ? "#6366f1" : isAll ? "#fde68a" : "transparent";
                            return (
                              <div
                                key={activity.id}
                                className="px-2 py-1.5 rounded-lg text-xs"
                                style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
                              >
                                {timeRanges[idx] && (
                                  <div className={`font-medium mb-0.5 ${isMe ? "text-white/80" : "text-slate-500"}`}>
                                    {timeRanges[idx]}
                                  </div>
                                )}
                                <div className={`font-bold ${isMe ? "text-white" : "text-slate-800"}`}>
                                  {activity.name || "—"}
                                </div>
                                <div className={`mt-0.5 flex items-center gap-1 ${isMe ? "text-white font-bold text-[11px]" : "text-slate-500 text-[11px]"}`}>
                                  {isMe && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                                  {teacherName}
                                </div>
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
    </div>
  );
}
