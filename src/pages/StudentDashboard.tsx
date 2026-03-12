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
import { IdCard, GraduationCap, CalendarDays, FileCheck2, XCircle, CheckCircle2, Clock3 } from "lucide-react";

import type { AttendanceStatus } from "@/types/attendance";
import type { StudentRegistration } from "@/types/student";

import { readGlobalStudents } from "@/utils/storage";
import {
  DEFAULT_STUDENT_PASSWORD,
  getStudentSessionLogin,
  getStudentSessionStudentId,
} from "@/utils/student-auth";
import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import { showError, showSuccess } from "@/utils/toast";
import { fetchModeBStudentMonthSchedule, setModeBStudentJustification } from "@/services/modeBService";

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

type DayRow = {
  ymd: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  finalizedAt: string | null;
  status: AttendanceStatus | null;
  justificationMessage: string | null;
};

function statusLabel(status: AttendanceStatus | null) {
  if (!status) return { label: "Aguardando", className: "bg-slate-100 text-slate-700" };
  if (status === "presente") return { label: "Presente", className: "bg-emerald-600 text-white" };
  if (status === "atrasado") return { label: "Atrasado", className: "bg-amber-600 text-white" };
  if (status === "falta") return { label: "Falta", className: "bg-rose-600 text-white" };
  return { label: "Justificada", className: "bg-orange-500 text-white" };
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
  const selectedYmd = useMemo(() => toYMD(selectedDate), [selectedDate]);
  const selectedMonth = useMemo(() => monthKeyFromDate(selectedDate), [selectedDate]);

  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyTarget, setJustifyTarget] = useState<DayRow | null>(null);
  const [justifyText, setJustifyText] = useState("");

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

  const rowsByDate = useMemo(() => {
    const map = new Map<string, DayRow[]>();
    for (const r of rows) {
      const arr = map.get(r.ymd) || [];
      arr.push(r);
      map.set(r.ymd, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      map.set(k, arr);
    }
    return map;
  }, [rows]);

  const dayRows = rowsByDate.get(selectedYmd) || [];

  const openJustify = (r: DayRow) => {
    setJustifyTarget(r);
    setJustifyText(r.justificationMessage || "");
    setJustifyOpen(true);
  };

  const saveJustification = async () => {
    if (!projectId || !studentId || !justifyTarget) return;

    const message = justifyText.trim();
    if (!message) {
      showError("Escreva uma justificativa antes de salvar.");
      return;
    }

    try {
      await setModeBStudentJustification({
        projectId,
        classId: justifyTarget.classId,
        studentId,
        ymd: justifyTarget.ymd,
        message,
      });
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar a justificativa.");
      return;
    }

    setRows((prev) =>
      prev.map((x) =>
        x.classId === justifyTarget.classId && x.ymd === justifyTarget.ymd
          ? { ...x, justificationMessage: message, status: x.status === "falta" ? "justificada" : x.status }
          : x,
      ),
    );

    setJustifyOpen(false);
    showSuccess("Justificativa enviada.");
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

  return (
    <div className="space-y-6 max-w-6xl">
      <Dialog open={justifyOpen} onOpenChange={setJustifyOpen}>
        <DialogContent className="border-none p-0 overflow-hidden rounded-[2.5rem] bg-white shadow-2xl w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black tracking-tight">Justificativa</DialogTitle>
            <p className="mt-1 text-white/85 text-sm font-bold">
              {justifyTarget ? `${justifyTarget.className} • ${formatDatePt(justifyTarget.ymd)}` : ""}
            </p>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-4">
            <Textarea
              className="min-h-[140px] rounded-2xl border-slate-200 font-bold"
              value={justifyText}
              onChange={(e) => setJustifyText(e.target.value)}
              placeholder="Escreva sua justificativa..."
            />
            <div className="flex gap-2">
              <Button className="flex-1 h-12 rounded-2xl font-black" onClick={saveJustification}>
                Enviar
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl font-black border-slate-200"
                onClick={() => setJustifyOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
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
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 bg-white">
            <CardTitle className="text-lg font-black text-slate-800">Aulas do dia</CardTitle>
            <p className="mt-1 text-sm font-bold text-slate-500">{formatDatePt(selectedYmd)}</p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {loading ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                Carregando…
              </div>
            ) : dayRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                Nenhuma aula para este dia.
              </div>
            ) : (
              <div className="space-y-4">
                {dayRows.map((r, idx) => {
                  const pill = statusLabel(r.status);
                  return (
                    <div key={`${r.classId}:${r.ymd}:${idx}`} className="rounded-[2rem] border border-slate-100 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{r.className}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {r.startTime}–{r.endTime}
                          </p>
                        </div>
                        <Badge className={`rounded-full border-none font-black ${pill.className}`}>{pill.label}</Badge>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-600">
                          {r.finalizedAt ? (
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Chamada finalizada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-slate-500" /> Chamada em aberto
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant={r.justificationMessage ? "outline" : "default"}
                          className="rounded-2xl font-black"
                          onClick={() => openJustify(r)}
                        >
                          {r.justificationMessage ? "Editar justificativa" : "Justificar"}
                        </Button>
                      </div>

                      {r.justificationMessage ? (
                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Justificativa</p>
                          <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">{r.justificationMessage}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {!projectId ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Selecione um projeto para carregar suas aulas.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
