// src/pages/ScheduleViewer.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Printer, Pencil } from "lucide-react";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import { fetchScheduleFull } from "@/integrations/supabase/oficina-schedules";
import { fetchClassesRemote } from "@/integrations/supabase/classes";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import type { OficinaScheduleFull, OficinaScheduleSession } from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { getActiveProjectId } from "@/utils/projects";
import { showError } from "@/utils/toast";

/** Simple hash → hsl color for a string */
function strToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 85%)`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dayMonth} ${dayName}`;
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
  for (const [, list] of map.entries()) {
    list.sort((a, b) => {
      const ca = allClasses.find((c) => c.id === a.turmaId);
      const cb = allClasses.find((c) => c.id === b.turmaId);
      const pa = periodOrder[ca?.period ?? ""] ?? 99;
      const pb = periodOrder[cb?.period ?? ""] ?? 99;
      if (pa !== pb) return pa - pb;
      return (ca?.startTime ?? "").localeCompare(cb?.startTime ?? "");
    });
  }
  return map;
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

  const sessionsByDate = groupSessionsByDate(full.sessions, allClasses);
  const dates = [...sessionsByDate.keys()];
  const maxSlots = Math.max(...[...sessionsByDate.values()].map((s) => s.length), 0);

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
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

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
              <th className="px-3 py-2 bg-slate-100 border border-slate-300 text-center w-10 text-slate-500 font-medium">
                Min
              </th>
              <th className="px-3 py-2 bg-slate-100 border border-slate-300 text-left text-slate-600 font-medium min-w-28">
                Atividade
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-2 bg-slate-100 border border-slate-300 text-center font-medium text-slate-700 min-w-32"
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
              const templates = full.templates.filter(
                (t) => t.turmaId === representativeSession.turmaId
              );

              return (
                <React.Fragment key={representativeSession.turmaId}>
                  <tr>
                    <td
                      colSpan={2 + dates.length}
                      className="px-3 py-1.5 bg-indigo-50 border border-slate-300 text-xs font-bold text-indigo-800 uppercase tracking-wide"
                    >
                      {slotTurma?.period ?? ""} — {slotTurma?.name ?? ""}
                    </td>
                  </tr>
                  {templates.map((template) => (
                    <tr key={template.id}>
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
                              className="px-3 py-2 border border-slate-200 bg-red-50 text-center text-xs text-red-500 font-medium"
                            >
                              Feriado
                            </td>
                          );
                        }
                        const sessionTemplate = full.templates.find(
                          (t) =>
                            t.turmaId === session.turmaId && t.name === template.name
                        );
                        const assignment = sessionTemplate
                          ? full.assignments.find(
                              (a) =>
                                a.sessionId === session.id &&
                                a.activityTemplateId === sessionTemplate.id
                            )
                          : undefined;

                        const teacherName = assignment
                          ? getTeacherName(assignment.teacherId)
                          : "—";
                        const bgColor =
                          assignment?.teacherId === null
                            ? "#fef9c3"
                            : assignment?.teacherId
                            ? strToColor(teacherName)
                            : "transparent";

                        return (
                          <td
                            key={date}
                            className="px-3 py-2 border border-slate-200 text-center font-medium text-sm"
                            style={{ backgroundColor: bgColor }}
                          >
                            {teacherName}
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
