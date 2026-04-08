"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { IdCard, GraduationCap, CalendarDays, FileCheck2, BarChart2, KeyRound } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { AttendanceStatus } from "@/types/attendance";
import type { StudentRegistration } from "@/types/student";

import { readGlobalStudents } from "@/utils/storage";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentSessionLogin,
  getStudentSessionStudentId,
  changeStudentPassword,
} from "@/utils/student-auth";
import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import { fetchModeBStudentMonthSchedule, setModeBStudentJustification } from "@/services/modeBService";
import { showError, showSuccess } from "@/utils/toast";

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKeyFromDate(d: Date) {
  return toYMD(d).slice(0, 7);
}

function formatDatePt(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatMonthPt(monthKey: string) {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

type LessonRow = {
  ymd: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  finalizedAt: string | null;
  status: AttendanceStatus | null;
  justificationMessage: string | null;
  teacherNames: string[];
};

function mapRawRow(r: any): LessonRow {
  return {
    ymd: r.ymd,
    classId: r.class_id,
    className: r.class_name,
    startTime: r.start_time,
    endTime: r.end_time,
    finalizedAt: r.finalized_at,
    status: (r.status as AttendanceStatus | null) || null,
    justificationMessage: r.justification_message,
    teacherNames: Array.isArray(r.teacher_names) ? r.teacher_names : [],
  };
}

function statusMeta(status: AttendanceStatus): { label: string; accentClass: string; badgeClass: string } {
  if (status === "presente") {
    return {
      label: "Presente",
      accentClass: "border-emerald-200 bg-emerald-50/60",
      badgeClass: "bg-emerald-600 text-white",
    };
  }
  if (status === "falta") {
    return {
      label: "Falta",
      accentClass: "border-rose-200 bg-rose-50/60",
      badgeClass: "bg-rose-600 text-white",
    };
  }
  if (status === "atrasado") {
    return {
      label: "Atraso",
      accentClass: "border-amber-200 bg-amber-50/60",
      badgeClass: "bg-amber-500 text-white",
    };
  }
  return {
    label: "Justificada",
    accentClass: "border-violet-200 bg-violet-50/60",
    badgeClass: "bg-violet-600 text-white",
  };
}

function LessonCard({ row, onClick }: { row: LessonRow; onClick: () => void }) {
  const canColorize = Boolean(row.finalizedAt) && Boolean(row.status);
  const meta = row.status ? statusMeta(row.status) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-[2rem] border p-5 transition hover:bg-slate-50 ${
        canColorize && meta ? meta.accentClass : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">{row.className}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {formatDatePt(row.ymd)} • {row.startTime}–{row.endTime}
          </p>
        </div>
        {canColorize && meta ? (
          <Badge className={`rounded-full border-none font-black ${meta.badgeClass}`}>{meta.label}</Badge>
        ) : null}
      </div>
    </button>
  );
}

const CALENDAR_STATUS_CLASSES: Record<string, string> = {
  "cal-presente":
    "!bg-emerald-500 !text-white !rounded-full font-black hover:!bg-emerald-600 focus:!bg-emerald-600",
  "cal-falta":
    "!bg-rose-500 !text-white !rounded-full font-black hover:!bg-rose-600 focus:!bg-rose-600",
  "cal-atrasado":
    "!bg-amber-400 !text-white !rounded-full font-black hover:!bg-amber-500 focus:!bg-amber-500",
  "cal-justificada":
    "!bg-violet-500 !text-white !rounded-full font-black hover:!bg-violet-600 focus:!bg-violet-600",
  "cal-agendada":
    "!bg-sky-400 !text-white !rounded-full font-black hover:!bg-sky-500 focus:!bg-sky-500",
};

const LEGEND_ITEMS = [
  { key: "cal-agendada", color: "bg-sky-400", label: "Agendada" },
  { key: "cal-presente", color: "bg-emerald-500", label: "Presente" },
  { key: "cal-atrasado", color: "bg-amber-400", label: "Atraso" },
  { key: "cal-falta", color: "bg-rose-500", label: "Falta" },
  { key: "cal-justificada", color: "bg-violet-500", label: "Justificada" },
];

const CHART_COLORS = {
  presente: "#10b981",
  atrasado: "#f59e0b",
  justificada: "#8b5cf6",
  falta: "#ef4444",
};

export default function StudentDashboard() {
  const navigate = useNavigate();

  const projectId = getActiveProjectId();
  const project = getActiveProject();

  const studentId = useMemo(() => getStudentSessionStudentId(), []);
  const login = useMemo(() => getStudentSessionLogin() || "", []);

  const [student, setStudent] = useState<StudentRegistration | null>(() => {
    if (!studentId) return null;
    const list = readGlobalStudents<StudentRegistration[]>([]);
    return list.find((s) => s.id === studentId) || null;
  });

  // Se não encontrou no localStorage, busca do Supabase via RPC (bypassa RLS do Mode B)
  useEffect(() => {
    if (student || !studentId) return;
    const run = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { mapStudentRowToModel } = await import("@/integrations/supabase/mappers");
        const { writeGlobalStudents } = await import("@/utils/storage");
        const { data } = await supabase.rpc("mode_b_get_student_profile", { p_student_id: studentId });
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = mapStudentRowToModel(data[0]);
          setStudent(mapped);
          const existing = readGlobalStudents<StudentRegistration[]>([]);
          writeGlobalStudents([...existing.filter((s) => s.id !== studentId), mapped]);
        }
      } catch {
        // mantém student como null, exibe mensagem de erro
      }
    };
    void run();
  }, [student, studentId]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedMonth = useMemo(() => monthKeyFromDate(selectedDate), [selectedDate]);

  // Data for the selected month (calendar + lesson lists)
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Data for the annual chart (all 12 months of current year)
  const [yearRows, setYearRows] = useState<LessonRow[]>([]);
  const [yearLoading, setYearLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<LessonRow | null>(null);

  const [justifyText, setJustifyText] = useState("");
  const [justifySaving, setJustifySaving] = useState(false);

  // Change password dialog
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!studentId) return;
    if (pwNew.length < 6) { showError("A nova senha precisa ter pelo menos 6 caracteres."); return; }
    if (pwNew !== pwConfirm) { showError("As senhas não conferem."); return; }
    setPwSaving(true);
    try {
      const result = await changeStudentPassword({ studentId, oldPassword: pwOld, newPassword: pwNew });
      if (result.ok) {
        showSuccess("Senha alterada com sucesso!");
        setPwOpen(false);
        setPwOld(""); setPwNew(""); setPwConfirm("");
      } else if (result.reason === "wrong_password") {
        showError("Senha atual incorreta.");
      } else {
        showError("Não foi possível alterar a senha.");
      }
    } finally {
      setPwSaving(false);
    }
  };

  const todayYmd = useMemo(() => toYMD(new Date()), []);

  useEffect(() => {
    if (!projectId) {
      navigate("/aluno/selecionar-projeto", { replace: true });
    }
  }, [projectId, navigate]);

  // Fetch selected month lessons
  useEffect(() => {
    const run = async () => {
      if (!projectId || !studentId) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchModeBStudentMonthSchedule({ projectId, studentId, month: selectedMonth });
        setRows((data || []).map(mapRawRow));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [projectId, studentId, selectedMonth]);

  // Fetch all 12 months of current year for annual chart
  useEffect(() => {
    const run = async () => {
      if (!projectId || !studentId) return;
      setYearLoading(true);
      try {
        const year = new Date().getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
        const results = await Promise.all(
          months.map((month) => fetchModeBStudentMonthSchedule({ projectId, studentId, month })),
        );
        setYearRows(results.flat().map(mapRawRow));
      } finally {
        setYearLoading(false);
      }
    };
    void run();
  }, [projectId, studentId]);

  // Calendar colored modifiers
  const calendarModifiers = useMemo(() => {
    const presente: Date[] = [];
    const falta: Date[] = [];
    const atrasado: Date[] = [];
    const justificada: Date[] = [];
    const agendada: Date[] = [];

    for (const r of rows) {
      const d = new Date(`${r.ymd}T00:00:00`);
      if (r.finalizedAt && r.status) {
        if (r.status === "presente") presente.push(d);
        else if (r.status === "falta") falta.push(d);
        else if (r.status === "atrasado") atrasado.push(d);
        else if (r.status === "justificada") justificada.push(d);
      } else {
        agendada.push(d);
      }
    }

    return { "cal-presente": presente, "cal-falta": falta, "cal-atrasado": atrasado, "cal-justificada": justificada, "cal-agendada": agendada };
  }, [rows]);

  // Annual stats grouped by month
  const monthlyStats = useMemo(() => {
    const year = new Date().getFullYear();
    const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
      const monthRows = yearRows.filter((r) => r.ymd.startsWith(monthKey) && r.finalizedAt);
      return {
        mes: monthLabels[i],
        Presente: monthRows.filter((r) => r.status === "presente").length,
        Atraso: monthRows.filter((r) => r.status === "atrasado").length,
        Justificada: monthRows.filter((r) => r.status === "justificada").length,
        Falta: monthRows.filter((r) => r.status === "falta").length,
      };
    });
  }, [yearRows]);

  // Annual totals
  const annualTotals = useMemo(() => {
    const finalized = yearRows.filter((r) => r.finalizedAt);
    return {
      presente: finalized.filter((r) => r.status === "presente").length,
      atrasado: finalized.filter((r) => r.status === "atrasado").length,
      justificada: finalized.filter((r) => r.status === "justificada").length,
      falta: finalized.filter((r) => r.status === "falta").length,
      total: finalized.length,
    };
  }, [yearRows]);

  const futureLessons = useMemo(
    () =>
      rows
        .filter((r) => r.ymd >= todayYmd)
        .slice()
        .sort((a, b) => (a.ymd !== b.ymd ? a.ymd.localeCompare(b.ymd) : a.startTime.localeCompare(b.startTime))),
    [rows, todayYmd],
  );

  const pastLessons = useMemo(
    () =>
      rows
        .filter((r) => r.ymd < todayYmd)
        .slice()
        .sort((a, b) => (a.ymd !== b.ymd ? b.ymd.localeCompare(a.ymd) : a.startTime.localeCompare(b.startTime))),
    [rows, todayYmd],
  );

  const openDetails = (r: LessonRow) => {
    setDetailTarget(r);
    setJustifyText(r.justificationMessage || "");
    setDetailOpen(true);
  };

  const handleDayClick = (day: Date) => {
    const ymd = toYMD(day);
    const dayRows = rows.filter((r) => r.ymd === ymd);
    if (dayRows.length === 0) return;
    // Prefer agendada (not finalized), otherwise open the first lesson
    const target = dayRows.find((r) => !r.finalizedAt) || dayRows[0];
    openDetails(target);
  };

  const saveJustification = async () => {
    if (!projectId || !studentId || !detailTarget) return;
    if (detailTarget.finalizedAt) {
      showError("A chamada já foi fechada. Não é mais possível enviar justificativa.");
      return;
    }
    const message = justifyText.trim();
    if (!message) {
      showError("Escreva uma justificativa antes de enviar.");
      return;
    }
    setJustifySaving(true);
    try {
      await setModeBStudentJustification({ projectId, classId: detailTarget.classId, studentId, ymd: detailTarget.ymd, message });
      setRows((prev) =>
        prev.map((x) =>
          x.classId === detailTarget.classId && x.ymd === detailTarget.ymd ? { ...x, justificationMessage: message } : x,
        ),
      );
      setDetailTarget((prev) => (prev ? { ...prev, justificationMessage: message } : prev));
      showSuccess("Justificativa enviada.");
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar a justificativa.");
    } finally {
      setJustifySaving(false);
    }
  };

  if (!student) {
    return (
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.25rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 bg-white">
          <CardTitle className="text-xl font-black text-slate-800">Painel do aluno</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0">
          <p className="text-slate-600 font-medium">Não foi possível carregar seus dados.</p>
        </CardContent>
      </Card>
    );
  }

  const detailStatus = detailTarget?.status && detailTarget?.finalizedAt ? statusMeta(detailTarget.status) : null;
  // Can justify if attendance not yet closed (includes future/scheduled lessons)
  const canJustify = Boolean(detailTarget) && !detailTarget?.finalizedAt;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={(o) => { if (!pwSaving) { setPwOpen(o); if (!o) { setPwOld(""); setPwNew(""); setPwConfirm(""); } } }}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-primary flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Alterar senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Senha atual</p>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Digite sua senha atual"
                value={pwOld}
                onChange={(e) => setPwOld(e.target.value)}
                disabled={pwSaving}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nova senha</p>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Mínimo 6 caracteres"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                disabled={pwSaving}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Confirmar nova senha</p>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Repita a nova senha"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                disabled={pwSaving}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" className="h-11 rounded-2xl font-black flex-1" onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? "Salvando…" : "Alterar senha"}
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-2xl font-black border-slate-200" onClick={() => setPwOpen(false)} disabled={pwSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="rounded-[2rem] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-primary">Detalhes da aula</DialogTitle>
          </DialogHeader>
          {!detailTarget ? null : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{detailTarget.className}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {formatDatePt(detailTarget.ymd)} • {detailTarget.startTime}–{detailTarget.endTime}
                  </p>
                </div>
                {detailStatus ? (
                  <Badge className={`rounded-full border-none font-black ${detailStatus.badgeClass}`}>{detailStatus.label}</Badge>
                ) : null}
              </div>
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 font-bold">Data</span>
                  <span className="text-slate-900 font-black text-right">{formatDatePt(detailTarget.ymd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 font-bold">Horário</span>
                  <span className="text-slate-900 font-black">{detailTarget.startTime}–{detailTarget.endTime}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 font-bold">Turma</span>
                  <span className="text-slate-900 font-black text-right">{detailTarget.className}</span>
                </div>
                {detailTarget.teacherNames.length > 0 ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-500 font-bold shrink-0">
                      {detailTarget.teacherNames.length === 1 ? "Professor(a)" : "Professores"}
                    </span>
                    <span className="text-slate-900 font-black text-right">
                      {detailTarget.teacherNames.join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>
              <Separator />
              {canJustify ? (
                <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                    {detailTarget.ymd >= todayYmd ? "Justificativa prévia de falta" : "Justificar falta"}
                  </p>
                  {detailTarget.ymd >= todayYmd ? (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Escreva uma justificativa antes da aula acontecer. O professor verá na chamada.
                    </p>
                  ) : null}
                  <Textarea
                    className="mt-3 min-h-[120px] rounded-2xl border-slate-200 font-bold bg-white"
                    value={justifyText}
                    onChange={(e) => setJustifyText(e.target.value)}
                    placeholder="Escreva sua justificativa..."
                    disabled={justifySaving}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" className="h-11 rounded-2xl font-black" onClick={saveJustification} disabled={justifySaving}>
                      {justifySaving ? "Enviando…" : "Enviar justificativa"}
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-2xl font-black border-slate-200" onClick={() => setDetailOpen(false)} disabled={justifySaving}>
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-800">Justificativa</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">A chamada já foi fechada. Não é possível enviar/editar justificativa.</p>
                  {detailTarget.justificationMessage ? (
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enviada</p>
                      <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">{detailTarget.justificationMessage}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center gap-4">
        {student.photo && (
          <div className="shrink-0 w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-white shadow-xl">
            <img src={student.photo} alt={student.preferredName || student.fullName} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">
            Olá, {student.preferredName || student.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-slate-500 font-medium">
            {project ? (
              <>Projeto ativo: <span className="font-black">{project.name}</span></>
            ) : (
              "Selecione um projeto para ver suas aulas."
            )}
          </p>
        </div>
      </div>

      {/* Annual stats — topo */}
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <CardTitle className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" /> Frequência anual — {new Date().getFullYear()}
          </CardTitle>
          <p className="mt-1 text-sm font-bold text-slate-500">Totais e distribuição mensal</p>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
          {/* Totals row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Presenças", count: annualTotals.presente, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
              { label: "Atrasos", count: annualTotals.atrasado, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
              { label: "Justificadas", count: annualTotals.justificada, bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
              { label: "Faltas", count: annualTotals.falta, bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
            ].map(({ label, count, bg, text, border }) => (
              <div key={label} className={`rounded-[1.5rem] border ${border} ${bg} p-4`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${text}`}>{label}</p>
                <p className={`mt-1 text-3xl font-black ${text}`}>{yearLoading ? "…" : count}</p>
                {annualTotals.total > 0 && !yearLoading ? (
                  <p className={`mt-1 text-xs font-bold ${text} opacity-70`}>
                    {Math.round((count / annualTotals.total) * 100)}%
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {/* Monthly bar chart */}
          <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/50 p-4">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Por mês</p>
            {yearLoading ? (
              <div className="flex items-center justify-center h-[220px] text-sm font-bold text-slate-400">Carregando…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyStats} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "1rem", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(v: any, n: any, p: any) => {
                      const row = p?.payload || {};
                      const total = (row.Presente || 0) + (row.Atraso || 0) + (row.Justificada || 0) + (row.Falta || 0);
                      const pct = total > 0 ? Math.round((Number(v) / total) * 1000) / 10 : 0;
                      return [`${v} (${pct}%)`, n];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
                  <Bar dataKey="Presente" fill={CHART_COLORS.presente} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Atraso" fill={CHART_COLORS.atrasado} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Justificada" fill={CHART_COLORS.justificada} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Falta" fill={CHART_COLORS.falta} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800">Credenciais</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Seu login é os <span className="font-black">4 últimos dígitos</span> da matrícula.
              </p>
            </div>
            <Badge className="rounded-full px-4 py-2 bg-primary/10 text-primary border-none font-black">
              <GraduationCap className="h-4 w-4 mr-2" /> Aluno
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Login</p>
              <div className="mt-2 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-primary" />
                <p className="text-2xl font-black tracking-tight text-slate-900">{login}</p>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">Matrícula: {student.registration}</p>
            </div>
            <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha</p>
              <div className="mt-2 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <p className="text-2xl font-black tracking-tight text-slate-900">••••••••</p>
              </div>
              <button
                type="button"
                onClick={() => setPwOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-black text-primary hover:bg-primary/10 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5" /> Alterar senha
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar + lessons */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 bg-white">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Calendário
            </CardTitle>
            <p className="mt-1 text-sm font-bold text-slate-500">{formatMonthPt(selectedMonth)}</p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              onDayClick={handleDayClick}
              modifiers={calendarModifiers}
              modifiersClassNames={CALENDAR_STATUS_CLASSES}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {LEGEND_ITEMS.map(({ key, color, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded-full ${color}`} />
                  <span className="text-xs font-bold text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 bg-white">
              <CardTitle className="text-lg font-black text-slate-800">Aulas futuras</CardTitle>
              <p className="mt-1 text-sm font-bold text-slate-500">A partir de hoje</p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">Carregando…</div>
              ) : futureLessons.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">Nenhuma aula futura neste mês.</div>
              ) : (
                <div className="space-y-3">
                  {futureLessons.map((r) => (
                    <LessonCard key={`${r.classId}:${r.ymd}:${r.startTime}`} row={r} onClick={() => openDetails(r)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 bg-white">
              <CardTitle className="text-lg font-black text-slate-800">Aulas passadas</CardTitle>
              <p className="mt-1 text-sm font-bold text-slate-500">Já realizadas</p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">Carregando…</div>
              ) : pastLessons.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">Nenhuma aula passada neste mês.</div>
              ) : (
                <div className="space-y-3">
                  {pastLessons.map((r) => (
                    <LessonCard key={`${r.classId}:${r.ymd}:${r.startTime}`} row={r} onClick={() => openDetails(r)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
