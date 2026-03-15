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
import { IdCard, GraduationCap, CalendarDays, FileCheck2 } from "lucide-react";

import type { AttendanceStatus } from "@/types/attendance";
import type { StudentRegistration } from "@/types/student";

import { readGlobalStudents } from "@/utils/storage";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentSessionLogin,
  getStudentSessionStudentId,
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
};

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

export default function StudentDashboard() {
  const navigate = useNavigate();

  const projectId = getActiveProjectId();
  const project = getActiveProject();

  const studentId = useMemo(() => getStudentSessionStudentId(), []);
  const login = useMemo(() => getStudentSessionLogin() || "", []);

  const student = useMemo(() => {
    if (!studentId) return null;
    const list = readGlobalStudents<StudentRegistration[]>([]);
    return list.find((s) => s.id === studentId) || null;
  }, [studentId]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedMonth = useMemo(() => monthKeyFromDate(selectedDate), [selectedDate]);

  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<LessonRow | null>(null);

  const [justifyText, setJustifyText] = useState("");
  const [justifySaving, setJustifySaving] = useState(false);

  const todayYmd = useMemo(() => toYMD(new Date()), []);

  useEffect(() => {
    if (!projectId) {
      navigate("/aluno/selecionar-projeto", { replace: true });
    }
  }, [projectId, navigate]);

  useEffect(() => {
    const run = async () => {
      if (!projectId || !studentId) {
        setRows([]);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchModeBStudentMonthSchedule({
          projectId,
          studentId,
          month: selectedMonth,
        });

        setRows(
          (data || []).map((r: any) => ({
            ymd: r.ymd,
            classId: r.class_id,
            className: r.class_name,
            startTime: r.start_time,
            endTime: r.end_time,
            finalizedAt: r.finalized_at,
            status: (r.status as AttendanceStatus | null) || null,
            justificationMessage: r.justification_message,
          })),
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [projectId, studentId, selectedMonth]);

  const futureLessons = useMemo(() => {
    return rows
      .filter((r) => r.ymd >= todayYmd)
      .slice()
      .sort((a, b) => (a.ymd !== b.ymd ? a.ymd.localeCompare(b.ymd) : a.startTime.localeCompare(b.startTime)));
  }, [rows, todayYmd]);

  const pastLessons = useMemo(() => {
    return rows
      .filter((r) => r.ymd < todayYmd)
      .slice()
      .sort((a, b) => (a.ymd !== b.ymd ? b.ymd.localeCompare(a.ymd) : a.startTime.localeCompare(b.startTime)));
  }, [rows, todayYmd]);

  const openDetails = (r: LessonRow) => {
    setDetailTarget(r);
    setJustifyText(r.justificationMessage || "");
    setDetailOpen(true);
  };

  const saveJustification = async () => {
    if (!projectId || !studentId || !detailTarget) return;

    // Regra: só pode justificar enquanto a chamada NÃO estiver fechada.
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
      await setModeBStudentJustification({
        projectId,
        classId: detailTarget.classId,
        studentId,
        ymd: detailTarget.ymd,
        message,
      });

      setRows((prev) =>
        prev.map((x) =>
          x.classId === detailTarget.classId && x.ymd === detailTarget.ymd
            ? { ...x, justificationMessage: message }
            : x,
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
  const canJustify = Boolean(detailTarget) && !detailTarget?.finalizedAt;

  return (
    <div className="space-y-6 max-w-6xl">
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
                  <span className="text-slate-900 font-black">
                    {detailTarget.startTime}–{detailTarget.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 font-bold">Turma</span>
                  <span className="text-slate-900 font-black text-right">{detailTarget.className}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 font-bold">Professor</span>
                  <span className="text-slate-900 font-black text-right">Não informado</span>
                </div>
              </div>

              <Separator />

              {canJustify ? (
                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Justificar falta</p>
                  <Textarea
                    className="mt-3 min-h-[120px] rounded-2xl border-slate-200 font-bold bg-white"
                    value={justifyText}
                    onChange={(e) => setJustifyText(e.target.value)}
                    placeholder="Escreva sua justificativa..."
                    disabled={justifySaving}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      className="h-11 rounded-2xl font-black"
                      onClick={saveJustification}
                      disabled={justifySaving}
                    >
                      {justifySaving ? "Enviando…" : "Enviar justificativa"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl font-black border-slate-200"
                      onClick={() => setDetailOpen(false)}
                      disabled={justifySaving}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-800">Justificativa</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    A chamada já foi fechada. Não é possível enviar/editar justificativa.
                  </p>

                  {detailTarget.justificationMessage ? (
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enviada</p>
                      <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">
                        {detailTarget.justificationMessage}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary">
          Olá, {student.preferredName || student.fullName}.
        </h1>
        <p className="mt-2 text-slate-500 font-medium">
          {project ? (
            <>
              Projeto ativo: <span className="font-black">{project.name}</span>
            </>
          ) : (
            "Selecione um projeto para ver suas aulas."
          )}
        </p>
      </div>

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
                <p className="text-2xl font-black tracking-tight text-slate-900">{DEFAULT_STUDENT_PASSWORD}</p>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">Senha padrão do aluno</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 bg-white">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Calendário
            </CardTitle>
            <p className="mt-1 text-sm font-bold text-slate-500">{formatMonthPt(selectedMonth)}</p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} />
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
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                  Carregando…
                </div>
              ) : futureLessons.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                  Nenhuma aula futura neste mês.
                </div>
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
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                  Carregando…
                </div>
              ) : pastLessons.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                  Nenhuma aula passada neste mês.
                </div>
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