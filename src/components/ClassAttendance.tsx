"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getActiveProjectId } from "@/utils/projects";
import {
  fetchAttendanceSessionsRemote,
  upsertAttendanceSessionRemote,
  deleteAttendanceSessionRemote,
} from "@/services/attendanceService";

import {
  fetchStudentJustificationsForClassMonthRemote,
  type StudentJustification,
} from "@/services/studentJustificationsService";

import { StudentRegistration } from "@/types/student";
import { showSuccess, showError } from "@/utils/toast";
import StudentDetailsDialog from "@/components/StudentDetailsDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function ensureStudentRecords(session: AttendanceSession, currentStudentIds: string[]): AttendanceSession {
  // Mantém snapshot de quem estava na turma no dia.
  // NÃO preenche presença/falta automaticamente.
  if (session.studentIds && session.studentIds.length > 0) return session;
  if (!currentStudentIds || currentStudentIds.length === 0) return session;
  return { ...session, studentIds: [...currentStudentIds] };
}

function displaySocialName(s: StudentRegistration) {
  return s.socialName || s.preferredName || s.fullName;
}

const MAX_MONTHLY_ABSENCES = 3;

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
  const studentsSorted = useMemo(
    () =>
      [...students].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR")),
    [students],
  );

  const studentIds = useMemo(() => studentsSorted.map((s) => s.id), [studentsSorted]);
  const activeProjectId = getActiveProjectId();
  const todayYmd = useMemo(() => toYMD(new Date()), []);

  const attendancePanelRef = useRef<HTMLDivElement | null>(null);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [justifications, setJustifications] = useState<StudentJustification[]>([]);

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


  const openSession = useCallback((sessionId: string, opts?: { scroll?: boolean }) => {
    setSelectedId(sessionId);

    if (!opts?.scroll) return;

    // Wait a tick so the selected panel updates, then scroll it into view.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        attendancePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!activeProjectId) {
        setSessions([]);
        setSelectedId(null);
        return;
      }

      const sess = await fetchAttendanceSessionsRemote(activeProjectId, classId);

      setSessions(sess);
      setSelectedId((prev) => {
        if (prev && sess.some((s) => s.id === prev)) return prev;
        const today = sess.find((s) => s.date === todayYmd);
        return today?.id || sess[0]?.id || null;
      });
    };

    void run();
  }, [activeProjectId, classId, todayYmd]);

  const monthKeysStr = useMemo(() => {
    const keys = new Set<string>();
    for (const s of sessions) keys.add(monthKeyFromYmd(s.date));
    return Array.from(keys).sort().join(",");
  }, [sessions]);

  useEffect(() => {
    const run = async () => {
      if (!activeProjectId) {
        setJustifications([]);
        return;
      }

      const monthKeys = monthKeysStr ? monthKeysStr.split(",") : [];
      if (!monthKeys.length) {
        setJustifications([]);
        return;
      }

      const parts = await Promise.all(
        monthKeys.map((month) =>
          fetchStudentJustificationsForClassMonthRemote({
            projectId: activeProjectId,
            classId,
            month,
          }),
        ),
      );

      setJustifications(parts.flat());
    };

    void run();
  }, [activeProjectId, classId, monthKeysStr]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) || null,
    [sessions, selectedId]
  );


  // Verifica se uma justificativa cobre uma data específica
  function justificationCoversDate(j: StudentJustification, ymd: string): boolean {
    const end = j.endDate || j.date;
    return j.date <= ymd && end >= ymd;
  }

  const justificationCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const sess of sessions) {
      const count = justifications.filter((j) => justificationCoversDate(j, sess.date)).length;
      if (count > 0) map.set(sess.date, count);
    }
    return map;
  }, [justifications, sessions]);

  const justificationsForSelected = useMemo(() => {
    if (!selectedSession) return [] as StudentJustification[];
    return justifications.filter((j) => justificationCoversDate(j, selectedSession.date));
  }, [justifications, selectedSession?.id]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, displaySocialName(s));
    return map;
  }, [students]);

  // Keep snapshot in sync with enrolled students (does NOT auto-mark presence)
  useEffect(() => {
    if (!selectedSession) {
      setDraftRecords(null);
      setIsDirty(false);
      return;
    }

    const synced = ensureStudentRecords(selectedSession, studentIds);
    if (synced !== selectedSession && activeProjectId) {
      // Persist snapshot in Supabase so other telas (aluno/relatórios) fiquem consistentes.
      void upsertAttendanceSessionRemote(activeProjectId, synced);
      setSessions((prev) => prev.map((s) => (s.id === synced.id ? synced : s)));
    }

    setDraftRecords({ ...(synced.records || {}) } as Record<string, AttendanceStatus>);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.id, studentIds.join(","), activeProjectId]);

  // Auto-marca "justificada" para alunos com justificativa ativa na data da chamada
  useEffect(() => {
    if (!selectedSession || !justifications.length) return;

    setDraftRecords((prev) => {
      if (!prev) return prev;
      const draft = { ...prev };
      let changed = false;

      for (const st of studentsSorted) {
        if (!draft[st.id]) {
          const hasJust = justifications.some(
            (j) => j.studentId === st.id && justificationCoversDate(j, selectedSession.date),
          );
          if (hasJust) {
            draft[st.id] = "justificada";
            changed = true;
          }
        }
      }

      return changed ? draft : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justifications, selectedSession?.id]);

  const monthKey = selectedSession ? monthKeyFromYmd(selectedSession.date) : null;
  const monthLabel = selectedSession ? monthLabelFromYmd(selectedSession.date) : "";

  const monthlyAbsencesByStudent = useMemo(() => {
    if (!monthKey) return new Map<string, number>();
    const all = sessions.filter((s) => monthKeyFromYmd(s.date) === monthKey);
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
  }, [monthKey, sessions]);

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
    const run = async () => {
      if (!activeProjectId) return;
      if (!selectedDate) return;
      const date = toYMD(selectedDate);

      const existing = sessions.find((s) => s.date === date);
      if (existing) {
        openSession(existing.id, { scroll: true });
        setCreateOpen(false);
        return;
      }

      const session: AttendanceSession = {
        id: makeId(),
        classId,
        date,
        createdAt: new Date().toISOString(),
        studentIds: [...studentIds],
        records: {},
      };

      try {
        await upsertAttendanceSessionRemote(activeProjectId, session);
      } catch (e: any) {
        showError(e?.message || "Não foi possível criar a chamada.");
        return;
      }

      const next = [session, ...sessions].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.createdAt.localeCompare(a.createdAt);
      });
      setSessions(next);
      openSession(session.id, { scroll: true });
      setCreateOpen(false);
      setSelectedDate(undefined);
      showSuccess("Chamada criada. Marque os status e clique em Salvar.");
    };

    void run();
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
    const run = async () => {
      if (!activeProjectId) return;
      if (!selectedSession || !draftRecords) return;

      // Block save if any enrolled student has no status
      const targetIds =
        selectedSession.studentIds && selectedSession.studentIds.length > 0
          ? selectedSession.studentIds
          : studentIds;
      const unmarked = targetIds.filter((id) => !draftRecords[id]);
      if (unmarked.length > 0) {
        showError(
          `Faltam ${unmarked.length} aluno(s) sem status marcado. Marque todos antes de salvar.`,
        );
        return;
      }

      const next: AttendanceSession = {
        ...selectedSession,
        finalizedAt: selectedSession.finalizedAt || new Date().toISOString(),
        records: { ...draftRecords },
      };

      try {
        await upsertAttendanceSessionRemote(activeProjectId, next);
      } catch (e: any) {
        showError(e?.message || "Não foi possível salvar a chamada.");
        return;
      }

      setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
      setIsDirty(false);
      showSuccess("Chamada salva com sucesso.");
    };

    void run();
  };

  const confirmDelete = () => {
    const run = async () => {
      if (!activeProjectId) return;
      if (!deleteTarget) return;

      try {
        await deleteAttendanceSessionRemote(deleteTarget.id);
      } catch (e: any) {
        showError(e?.message || "Não foi possível remover a chamada.");
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSelectedId((prev) => {
        if (prev !== deleteTarget.id) return prev;
        const remaining = sessions.filter((s) => s.id !== deleteTarget.id);
        return remaining[0]?.id || null;
      });
      showSuccess("Dia de chamada removido.");
    };

    void run();
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

      {/* Cabeçalho: seletor de chamada + botão nova chamada */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">Chamada</h2>
          <p className="text-slate-500 font-medium">Registre presença, falta e atrasos por dia.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:items-center">
          {/* Seletor de chamada por data */}
          {sessions.length > 0 && (
            <Select
              value={selectedId || ""}
              onValueChange={(v) => openSession(v, { scroll: false })}
            >
              <SelectTrigger className="rounded-2xl h-12 px-5 font-black border-slate-200 bg-white min-w-[200px] gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <SelectValue placeholder="Selecionar chamada..." />
              </SelectTrigger>
              <SelectContent className="rounded-[1.5rem]">
                {sessions.map((s) => {
                  const d = parseYMD(s.date);
                  const label = d ? d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : s.date;
                  const isToday = s.date === todayYmd;
                  const justCount = justificationCountByDate.get(s.date) || 0;
                  return (
                    <SelectItem key={s.id} value={s.id} className="rounded-xl font-bold cursor-pointer">
                      <span className="flex items-center gap-2">
                        <span>{label}</span>
                        {isToday && <span className="text-[10px] font-black text-primary bg-primary/10 rounded-full px-2 py-0.5">Hoje</span>}
                        {!s.finalizedAt
                          ? <span className="text-[10px] font-black text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">Rascunho</span>
                          : <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Salva</span>
                        }
                        {justCount > 0 && <span className="text-[10px] font-black text-sky-700">{justCount} just.</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Botão Nova chamada */}
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
                  <Button className="rounded-2xl font-black" disabled={!selectedDate} onClick={createSession}>
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div ref={attendancePanelRef} />
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden bg-white">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chamada do dia</p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <p className="text-xl font-black text-primary">
                  {selectedSession
                    ? new Date(selectedSession.date + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—" }
                </p>
                {selectedSession && (
                  <Badge
                    className={cn(
                      "rounded-full border-none font-black",
                      !selectedSession.finalizedAt
                        ? "bg-sky-600 text-white"
                        : isDirty
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white",
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
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-2xl font-black gap-2"
                    onClick={saveSession}
                    disabled={Boolean(selectedSession.finalizedAt) && !isDirty}
                  >
                    <Save className="h-4 w-4" />
                    Salvar chamada
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl text-slate-400 hover:text-rose-700 hover:bg-rose-600/10"
                    onClick={() => setDeleteTarget(selectedSession)}
                    title="Apagar chamada"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
            <p className="text-sm font-bold text-slate-500">Crie ou selecione uma chamada para começar.</p>
          </div>
        ) : (
          <ScrollArea className="h-[520px] lg:h-[560px]">
            <div className="p-4 sm:p-6 space-y-4">
              {justificationsForSelected.length > 0 ? (
                <div className="rounded-[2rem] border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">
                        Justificativas recebidas
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {justificationsForSelected.length} para esta chamada ({selectedSession.date})
                      </p>
                    </div>
                    <Badge className="rounded-full border-none bg-sky-600 text-white font-black w-fit">
                      {justificationsForSelected.length}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {justificationsForSelected.slice(0, 4).map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          setJustificationText(j.message);
                          setJustificationOpen(true);
                        }}
                        className="w-full text-left rounded-[1.5rem] border border-sky-200 bg-white px-4 py-3 hover:bg-sky-50 transition-colors"
                        title="Abrir justificativa"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {studentNameById.get(j.studentId) || "Aluno"}
                          </p>
                          <span className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 text-sky-700 px-3 py-1 text-xs font-black">
                            <FileCheck2 className="h-3.5 w-3.5" /> Ver
                          </span>
                        </div>
                      </button>
                    ))}
                    {justificationsForSelected.length > 4 ? (
                      <p className="text-xs font-bold text-sky-700/90">
                        +{justificationsForSelected.length - 4} outra(s) (veja nos alunos abaixo)
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {studentsSorted.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                  <p className="text-sm font-bold text-slate-500">Nenhum aluno matriculado na turma.</p>
                </div>
              ) : (
                studentsSorted.map((st) => {
                  const status = (draftRecords?.[st.id] || selectedSession.records?.[st.id] || null) as
                    | AttendanceStatus
                    | null;
                  const abs = monthlyAbsencesByStudent.get(st.id) || 0;

                  const justification = selectedSession
                    ? justifications.find((j) => j.studentId === st.id && justificationCoversDate(j, selectedSession.date)) || null
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
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 text-slate-600 font-bold"
                              >
                                {abs} falta(s) em {monthLabel}
                              </Badge>
                              {abs >= MAX_MONTHLY_ABSENCES && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 text-[10px] font-black">
                                  ⚠ cota atingida
                                </span>
                              )}
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
                              className={cn(
                                "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start md:justify-end",
                                "w-full sm:w-auto"
                              )}
                            >
                              {statusMeta.map((m) => (
                                <ToggleGroupItem
                                  key={m.value}
                                  value={m.value}
                                  className={cn(
                                    "justify-start rounded-2xl min-h-11 px-3 sm:px-4 font-black border border-slate-200 bg-white text-slate-700",
                                    "hover:bg-slate-50",
                                    "whitespace-normal leading-tight text-[12px] sm:text-sm",
                                    m.className
                                  )}
                                  aria-label={m.label}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    {m.icon}
                                    <span>{m.label}</span>
                                  </span>
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>

                            {status ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl font-black w-full sm:w-auto"
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