"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import {
  ensureStudentRecords,
  findAttendanceByClassAndDate,
  getAttendanceForClass,
  getAllAttendance,
  saveAllAttendance,
  upsertAttendanceSession,
  deleteAttendanceSession,
} from "@/utils/attendance";
import { getActiveProjectId } from "@/utils/projects";
import { getJustificationForStudent } from "@/utils/student-justifications";
import { StudentRegistration } from "@/types/student";
import { showSuccess } from "@/utils/toast";
import StudentDetailsDialog from "@/components/StudentDetailsDialog";
import {
  CalendarDays,
  CheckCircle2,
  Clock4,
  Eye,
  FileCheck2,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";

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

  const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null);

  // Draft state (only persists when user clicks "Salvar")
  const [draftRecords, setDraftRecords] = useState<Record<string, AttendanceStatus> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Student details from attendance screen
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);

  // Student justification viewer
  const [justificationOpen, setJustificationOpen] = useState(false);
  const [justificationText, setJustificationText] = useState("");

  useEffect(() => {
    const list = getAttendanceForClass(classId);
    setSessions(list);
    setSelectedId((prev) => prev || list[0]?.id || null);
  }, [classId]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) || null,
    [sessions, selectedId]
  );

  // Keep snapshot in sync with enrolled students (does NOT auto-mark presence)
  useEffect(() => {
    if (!selectedSession) {
      setDraftRecords(null);
      setIsDirty(false);
      return;
    }

    const synced = ensureStudentRecords(selectedSession, studentIds);
    if (synced !== selectedSession) {
      upsertAttendanceSession(synced);
      setSessions((prev) => prev.map((s) => (s.id === synced.id ? synced : s)));
    }

    setDraftRecords({ ...(synced.records || {}) } as Record<string, AttendanceStatus>);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!selectedSession || !draftRecords) return null;

    const targetIds =
      selectedSession.studentIds && selectedSession.studentIds.length > 0
        ? selectedSession.studentIds
        : studentIds;

    const counts: Record<AttendanceStatus, number> = {
      presente: 0,
      falta: 0,
      atrasado: 0,
      justificada: 0,
    };

    for (const sid of targetIds) {
      const st = draftRecords[sid];
      if (!st) continue; // em branco
      counts[st] += 1;
    }

    return counts;
  }, [selectedSession?.id, studentIds.join(","), draftRecords, isDirty]);

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
      // snapshot
      studentIds: [...studentIds],
      // começa em branco: professor marca e salva
      records: {},
    };

    // Persist by rewriting full list to keep ordering predictable
    const all = getAllAttendance();
    const next = [session, ...all];
    saveAllAttendance(next);

    const list = getAttendanceForClass(classId);
    setSessions(list);
    setSelectedId(session.id);
    setCreateOpen(false);
    setSelectedDate(undefined);
    showSuccess("Chamada criada. Marque os status e clique em Salvar.");
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession) return;
    setDraftRecords((prev) => {
      const base = prev || ({ ...(selectedSession.records || {}) } as Record<string, AttendanceStatus>);
      return { ...base, [studentId]: status };
    });
    setIsDirty(true);
  };

  const clearStudentStatus = (studentId: string) => {
    if (!selectedSession) return;
    setDraftRecords((prev) => {
      const base = prev || ({ ...(selectedSession.records || {}) } as Record<string, AttendanceStatus>);
      const next = { ...base };
      delete next[studentId];
      return next;
    });
    setIsDirty(true);
  };

  const saveSession = () => {
    if (!selectedSession || !draftRecords) return;

    const next: AttendanceSession = {
      ...selectedSession,
      finalizedAt: selectedSession.finalizedAt || new Date().toISOString(),
      records: { ...draftRecords },
    };

    upsertAttendanceSession(next);
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
    setIsDirty(false);
    showSuccess("Chamada salva com sucesso.");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteAttendanceSession(deleteTarget.id);

    const list = getAttendanceForClass(classId);
    setSessions(list);

    setSelectedId((prev) => {
      if (prev !== deleteTarget.id) return prev;
      return list[0]?.id || null;
    });

    setDeleteTarget(null);
    showSuccess("Dia de chamada removido.");
  };

  const openStudentDetails = (student: StudentRegistration) => {
    setSelectedStudent(student);
    setIsStudentDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => (!o ? setDeleteTarget(null) : null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-primary">Apagar dia da chamada?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium">
              {deleteTarget
                ? `Isso vai remover a chamada do dia ${new Date(deleteTarget.date + "T00:00:00").toLocaleDateString("pt-BR")}. Essa ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl font-black bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmDelete}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <p className="text-xs text-slate-400 mt-1">Clique em "Nova chamada".</p>
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
                              <div
                                className={cn(
                                  "text-[10px] uppercase tracking-widest",
                                  isActive ? "text-white/80" : "text-slate-400"
                                )}
                              >
                                {mon}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-700">{d ? d.toLocaleDateString("pt-BR") : s.date}</p>
                            <p className="text-xs font-bold text-slate-400">Criada em {new Date(s.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "rounded-2xl",
                              isActive
                                ? "text-rose-700 hover:text-rose-800 hover:bg-rose-600/10"
                                : "text-slate-400 hover:text-rose-700 hover:bg-rose-600/10"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTarget(s);
                            }}
                            title="Apagar dia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          {isActive && (
                            <Badge className="rounded-full bg-secondary text-primary font-black border-none">Selecionada</Badge>
                          )}
                        </div>
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
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-xl font-black text-primary">
                    {selectedSession
                      ? new Date(selectedSession.date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                  {selectedSession && (
                    <Badge
                      className={cn(
                        "rounded-full border-none font-black",
                        !selectedSession.finalizedAt
                          ? "bg-sky-600 text-white"
                          : isDirty
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                      )}
                    >
                      {!selectedSession.finalizedAt
                        ? "Rascunho (não salva)"
                        : isDirty
                          ? "Alterações não salvas"
                          : "Salvo"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                {selectedSession && (
                  <Button
                    className="rounded-2xl font-black gap-2"
                    onClick={saveSession}
                    disabled={Boolean(selectedSession.finalizedAt) && !isDirty}
                  >
                    <Save className="h-4 w-4" />
                    Salvar chamada
                  </Button>
                )}

                {selectedSession && summary && (
                  <div className="flex flex-wrap gap-2 justify-start md:justify-end">
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
                    const status = (draftRecords?.[st.id] || selectedSession.records?.[st.id] || null) as
                      | AttendanceStatus
                      | null;
                    const abs = monthlyAbsencesByStudent.get(st.id) || 0;

                    const projectId = getActiveProjectId();
                    const justification = projectId && selectedSession
                      ? getJustificationForStudent(projectId, classId, selectedSession.date, st.id)
                      : null;

                    return (
                      <div
                        key={st.id}
                        className="rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <button
                              className="h-14 w-14 rounded-[1.5rem] bg-slate-100 ring-1 ring-slate-200 overflow-hidden flex items-center justify-center text-primary font-black shrink-0"
                              onClick={() => openStudentDetails(st)}
                              title="Abrir ficha do aluno"
                            >
                              {st.photo ? (
                                <img src={st.photo} alt={st.fullName} className="w-full h-full object-cover" />
                              ) : (
                                st.fullName.charAt(0)
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-base font-black text-primary truncate">
                                  {displaySocialName(st)}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary shrink-0"
                                  onClick={() => openStudentDetails(st)}
                                  title="Ver ficha"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-sm font-bold text-slate-600 truncate">{st.fullName}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-slate-200 text-slate-600 font-bold">
                                  {abs} falta(s) em {monthLabel}
                                </Badge>
                                <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                                  Matrícula {st.registration}
                                </Badge>
                                {justification && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setJustificationText(justification.message);
                                      setJustificationOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 text-sky-700 px-3 py-1 text-xs font-black hover:bg-sky-600/15"
                                    title="Ver justificativa"
                                  >
                                    <FileCheck2 className="h-3.5 w-3.5" />
                                    Justificativa
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="md:pl-4 md:border-l md:border-slate-100">
                            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
                              {!selectedSession.finalizedAt ? (
                                <Badge className="rounded-full bg-sky-600/10 text-sky-700 border-none font-black">
                                  Rascunho
                                </Badge>
                              ) : null}

                              <ToggleGroup
                                type="single"
                                value={status || ""}
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

                              {status ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl font-black"
                                  onClick={() => clearStudentStatus(st.id)}
                                >
                                  Limpar
                                </Button>
                              ) : null}
                            </div>
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

      <Dialog open={justificationOpen} onOpenChange={setJustificationOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">Justificativa do aluno</DialogTitle>
          </DialogHeader>
          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{justificationText}</p>
          </div>
          <div className="flex justify-end">
            <Button className="rounded-2xl font-black" onClick={() => setJustificationOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isStudentDetailsOpen}
        onClose={() => setIsStudentDetailsOpen(false)}
      />
    </div>
  );
}