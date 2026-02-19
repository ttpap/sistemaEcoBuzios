"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import {
  ensureStudentRecords,
  findAttendanceByClassAndDate,
  getAttendanceForClass,
  getAllAttendance,
  saveAllAttendance,
  upsertAttendanceSession,
} from "@/utils/attendance";
import { StudentRegistration } from "@/types/student";
import { CalendarDays, CheckCircle2, Clock4, FileCheck2, Plus, XCircle } from "lucide-react";

function makeId() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function monthKeyFromYmd(ymd: string) {
  return ymd.slice(0, 7); // YYYY-MM
}

function monthLabelFromYmd(ymd: string) {
  const d = parseYMD(ymd);
  if (!d) return "mês";
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(d);
}

function displaySocialName(s: StudentRegistration) {
  return s.socialName || s.preferredName || s.fullName;
}

const statusMeta: Array<{ value: AttendanceStatus; label: string; icon: React.ReactNode; className: string }> = [
  {
    value: "presente",
    label: "Presente",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "data-[state=on]:bg-emerald-600 data-[state=on]:text-white data-[state=on]:border-emerald-600",
  },
  {
    value: "falta",
    label: "Falta",
    icon: <XCircle className="h-4 w-4" />,
    className: "data-[state=on]:bg-rose-600 data-[state=on]:text-white data-[state=on]:border-rose-600",
  },
  {
    value: "atrasado",
    label: "Atrasado",
    icon: <Clock4 className="h-4 w-4" />,
    className: "data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:border-amber-600",
  },
  {
    value: "justificada",
    label: "Falta justificada",
    icon: <FileCheck2 className="h-4 w-4" />,
    className: "data-[state=on]:bg-sky-600 data-[state=on]:text-white data-[state=on]:border-sky-600",
  },
];

export default function ClassAttendance({
  classId,
  students,
}: {
  classId: string;
  students: StudentRegistration[];
}) {
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const list = getAttendanceForClass(classId);
    setSessions(list);
    setSelectedId((prev) => prev || list[0]?.id || null);
  }, [classId]);

  const selectedSession = useMemo(() => sessions.find((s) => s.id === selectedId) || null, [sessions, selectedId]);

  // Keep records in sync with enrolled students (e.g., if new students are added after a session is created)
  useEffect(() => {
    if (!selectedSession) return;
    const synced = ensureStudentRecords(selectedSession, studentIds, "presente");
    if (synced === selectedSession) return;

    upsertAttendanceSession(synced);
    setSessions((prev) => prev.map((s) => (s.id === synced.id ? synced : s)));
  }, [selectedSession?.id, studentIds.join(",")]);

  const monthKey = selectedSession ? monthKeyFromYmd(selectedSession.date) : null;
  const monthLabel = selectedSession ? monthLabelFromYmd(selectedSession.date) : "";

  const monthlyAbsencesByStudent = useMemo(() => {
    if (!monthKey) return new Map<string, number>();
    const all = getAttendanceForClass(classId).filter((s) => monthKeyFromYmd(s.date) === monthKey);
    const map = new Map<string, number>();

    for (const sess of all) {
      for (const sid of Object.keys(sess.records || {})) {
        const st = sess.records[sid];
        const isAbsence = st === "falta" || st === "justificada";
        if (!isAbsence) continue;
        map.set(sid, (map.get(sid) || 0) + 1);
      }
    }

    return map;
  }, [classId, monthKey, sessions.length]);

  const summary = useMemo(() => {
    if (!selectedSession) return null;
    const counts: Record<AttendanceStatus, number> = {
      presente: 0,
      falta: 0,
      atrasado: 0,
      justificada: 0,
    };
    for (const sid of studentIds) {
      const st = selectedSession.records?.[sid] || "presente";
      counts[st] += 1;
    }
    return counts;
  }, [selectedSession?.id, studentIds.join(",")]);

  const createSession = () => {
    if (!selectedDate) return;
    const date = toYMD(selectedDate);

    const existing = findAttendanceByClassAndDate(classId, date);
    if (existing) {
      setSelectedId(existing.id);
      setCreateOpen(false);
      return;
    }

    const session: AttendanceSession = {
      id: makeId(),
      classId,
      date,
      createdAt: new Date().toISOString(),
      records: studentIds.reduce((acc, sid) => {
        acc[sid] = "presente";
        return acc;
      }, {} as Record<string, AttendanceStatus>),
    };

    // Persist by rewriting full list to keep ordering predictable
    const all = getAllAttendance();
    const next = [session, ...all];
    saveAllAttendance(next);

    const list = getAttendanceForClass(classId);
    setSessions(list);
    setSelectedId(session.id);
    setCreateOpen(false);
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession) return;
    const next: AttendanceSession = {
      ...selectedSession,
      records: {
        ...(selectedSession.records || {}),
        [studentId]: status,
      },
    };

    upsertAttendanceSession(next);
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">Chamada</h2>
          <p className="text-slate-500 font-medium">
            Registre presença, falta e atrasos por dia.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-12 px-6 font-black shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              Nova chamada
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-primary">Selecionar dia</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-xl"
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm font-bold">
                    {selectedDate ? selectedDate.toLocaleDateString("pt-BR") : "Escolha uma data"}
                  </span>
                </div>
                <Button
                  className="rounded-2xl font-black"
                  disabled={!selectedDate}
                  onClick={createSession}
                >
                  Criar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Lista de chamadas */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chamadas</p>
            <p className="text-sm font-bold text-slate-600 mt-1">Últimas no topo</p>
          </div>
          <ScrollArea className="h-[360px] lg:h-[560px]">
            <div className="p-4 space-y-3">
              {sessions.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">Nenhuma chamada criada.</p>
                  <p className="text-xs text-slate-400 mt-1">Clique em “Nova chamada”.</p>
                </div>
              ) : (
                sessions.map((s) => {
                  const d = parseYMD(s.date);
                  const day = d ? String(d.getDate()).padStart(2, "0") : s.date.slice(-2);
                  const mon = d
                    ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d)
                    : s.date.slice(5, 7);

                  const isActive = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "w-full text-left rounded-[1.75rem] border p-4 transition-all",
                        isActive
                          ? "border-primary/30 bg-primary/5 shadow-md"
                          : "border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center font-black",
                              isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                            )}
                          >
                            <div className="leading-none text-center">
                              <div className="text-base">{day}</div>
                              <div className={cn("text-[10px] uppercase tracking-widest", isActive ? "text-white/80" : "text-slate-400")}>
                                {mon}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-700">{d ? d.toLocaleDateString("pt-BR") : s.date}</p>
                            <p className="text-xs font-bold text-slate-400">Criada em {new Date(s.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>
                        {isActive && (
                          <Badge className="rounded-full bg-secondary text-primary font-black border-none">Selecionada</Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Conteúdo da chamada */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chamada do dia</p>
                <p className="text-xl font-black text-primary mt-1">
                  {selectedSession ? new Date(selectedSession.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              {selectedSession && summary && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full border-none bg-emerald-600 text-white font-black">
                    {summary.presente} presente(s)
                  </Badge>
                  <Badge className="rounded-full border-none bg-rose-600 text-white font-black">
                    {summary.falta} falta(s)
                  </Badge>
                  <Badge className="rounded-full border-none bg-amber-600 text-white font-black">
                    {summary.atrasado} atrasado(s)
                  </Badge>
                  <Badge className="rounded-full border-none bg-sky-600 text-white font-black">
                    {summary.justificada} justificada(s)
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {!selectedSession ? (
            <div className="p-10 text-center bg-slate-50/50">
              <CalendarDays className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">Selecione uma chamada para começar.</p>
            </div>
          ) : (
            <ScrollArea className="h-[520px] lg:h-[560px]">
              <div className="p-4 sm:p-6 space-y-4">
                {students.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                    <p className="text-sm font-bold text-slate-500">Nenhum aluno matriculado na turma.</p>
                  </div>
                ) : (
                  students.map((st) => {
                    const status = selectedSession.records?.[st.id] || "presente";
                    const abs = monthlyAbsencesByStudent.get(st.id) || 0;

                    return (
                      <div
                        key={st.id}
                        className="rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-14 w-14 rounded-[1.5rem] bg-slate-100 ring-1 ring-slate-200 overflow-hidden flex items-center justify-center text-primary font-black shrink-0">
                              {st.photo ? (
                                <img src={st.photo} alt={st.fullName} className="w-full h-full object-cover" />
                              ) : (
                                st.fullName.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-black text-primary truncate">
                                {displaySocialName(st)}
                              </p>
                              <p className="text-sm font-bold text-slate-600 truncate">{st.fullName}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-slate-200 text-slate-600 font-bold">
                                  {abs} falta(s) em {monthLabel}
                                </Badge>
                                <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                                  Matrícula {st.registration}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="md:pl-4 md:border-l md:border-slate-100">
                            <ToggleGroup
                              type="single"
                              value={status}
                              onValueChange={(v) => {
                                if (!v) return;
                                updateStudentStatus(st.id, v as AttendanceStatus);
                              }}
                              className="flex flex-wrap justify-start md:justify-end gap-2"
                            >
                              {statusMeta.map((m) => (
                                <ToggleGroupItem
                                  key={m.value}
                                  value={m.value}
                                  className={cn(
                                    "rounded-2xl h-11 px-4 font-black border border-slate-200 bg-white text-slate-700",
                                    "hover:bg-slate-50",
                                    m.className
                                  )}
                                  aria-label={m.label}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    {m.icon}
                                    <span className="hidden sm:inline">{m.label}</span>
                                    <span className="sm:hidden">
                                      {m.value === "presente"
                                        ? "Pres." 
                                        : m.value === "falta"
                                          ? "Falta"
                                          : m.value === "atrasado"
                                            ? "Atr." 
                                            : "Just."}
                                    </span>
                                  </span>
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}
