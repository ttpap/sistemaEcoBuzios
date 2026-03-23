"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarDays, FileCheck2, MessageSquarePlus, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSessionStudentId } from "@/utils/student-auth";
import { getActiveProjectId } from "@/utils/projects";
import { upsertStudentJustificationRemote } from "@/services/studentJustificationsService";
import { showSuccess, showError } from "@/utils/toast";

type MyJustification = {
  id: string;
  classId: string;
  className: string;
  startDate: string;
  endDate: string | null;
  message: string;
  createdAt: string;
};

type ClassOption = { classId: string; className: string };

function makeId() {
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPeriod(startDate: string, endDate: string | null) {
  const start = new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR");
  if (!endDate || endDate === startDate) return start;
  const end = new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR");
  return `${start} até ${end}`;
}

export default function StudentJustification() {
  const studentId = getStudentSessionStudentId();
  const projectId = getActiveProjectId();

  const [myClasses, setMyClasses] = useState<ClassOption[]>([]);
  const [justifications, setJustifications] = useState<MyJustification[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MyJustification | null>(null);

  // Carrega turmas do aluno e justificativas anteriores
  useEffect(() => {
    const run = async () => {
      if (!supabase || !studentId || !projectId) {
        setLoading(false);
        return;
      }

      // Turmas do aluno neste projeto
      const { data: enrollData } = await supabase
        .from("class_student_enrollments")
        .select("class_id, classes(name, project_id)")
        .eq("student_id", studentId);

      const classes: ClassOption[] = [];
      for (const e of (enrollData || []) as any[]) {
        if (e.classes?.project_id === projectId) {
          classes.push({ classId: e.class_id, className: e.classes.name });
        }
      }
      setMyClasses(classes);

      // Justificativas já enviadas
      const classIds = classes.map((c) => c.classId);
      if (classIds.length > 0) {
        const { data: justData } = await supabase
          .from("student_justifications")
          .select("*")
          .eq("student_id", studentId)
          .in("class_id", classIds)
          .order("date", { ascending: false });

        if (justData) {
          // Deduplica por data + mensagem (quando salva em múltiplas turmas)
          const seen = new Set<string>();
          const deduped: MyJustification[] = [];
          for (const r of justData as any[]) {
            const key = `${r.date}_${r.end_date || ""}_${r.message}`;
            if (!seen.has(key)) {
              seen.add(key);
              const cls = classes.find((c) => c.classId === r.class_id);
              deduped.push({
                id: r.id,
                classId: r.class_id,
                className: cls?.className || "Turma",
                startDate: r.date,
                endDate: r.end_date ?? null,
                message: r.message,
                createdAt: r.created_at,
              });
            }
          }
          setJustifications(deduped);
        }
      }

      setLoading(false);
    };
    void run();
  }, [studentId, projectId]);

  const handleSave = () => {
    const run = async () => {
      if (!studentId || !projectId) return;
      if (!dateRange?.from) {
        showError("Selecione pelo menos a data de início.");
        return;
      }
      if (!message.trim()) {
        showError("Descreva o motivo da ausência.");
        return;
      }
      if (myClasses.length === 0) {
        showError("Você não está matriculado em nenhuma turma neste projeto.");
        return;
      }

      const startYmd = toYMD(dateRange.from);
      const endYmd = dateRange.to ? toYMD(dateRange.to) : null;

      setSaving(true);
      try {
        const newItems: MyJustification[] = [];

        // Salva uma justificativa por turma em que o aluno está
        for (const cls of myClasses) {
          const item = {
            id: makeId(),
            projectId,
            classId: cls.classId,
            studentId,
            date: startYmd,
            endDate: endYmd && endYmd !== startYmd ? endYmd : undefined,
            message: message.trim(),
            createdAt: new Date().toISOString(),
          };
          await upsertStudentJustificationRemote(item);
          // Para exibição, guarda apenas uma entrada (primeira turma)
          if (newItems.length === 0) {
            newItems.push({
              id: item.id,
              classId: cls.classId,
              className: cls.className,
              startDate: startYmd,
              endDate: endYmd && endYmd !== startYmd ? endYmd : null,
              message: message.trim(),
              createdAt: item.createdAt,
            });
          }
        }

        setJustifications((prev) => [...newItems, ...prev]);
        showSuccess("Justificativa enviada com sucesso!");
        setOpen(false);
        setDateRange(undefined);
        setMessage("");
      } catch (e: any) {
        showError(e?.message || "Não foi possível salvar a justificativa.");
      } finally {
        setSaving(false);
      }
    };
    void run();
  };

  const handleDelete = () => {
    const run = async () => {
      if (!supabase || !deleteTarget) return;
      const { error } = await supabase
        .from("student_justifications")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) {
        showError("Não foi possível remover a justificativa.");
        return;
      }
      setJustifications((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      setDeleteTarget(null);
      showSuccess("Justificativa removida.");
    };
    void run();
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-primary">Remover justificativa?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium">
              {deleteTarget ? `Período: ${formatPeriod(deleteTarget.startDate, deleteTarget.endDate)}. Essa ação não pode ser desfeita.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl font-black bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Minhas Justificativas</h1>
          <p className="text-slate-500 font-medium">Justifique sua ausência com período e motivo.</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setDateRange(undefined);
              setMessage("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-12 px-6 font-black shadow-lg shadow-primary/20">
              <MessageSquarePlus className="h-5 w-5" />
              Nova justificativa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-primary">Justificar ausência</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              {/* Período */}
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Período de ausência
                </p>
                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-3 flex justify-center">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    className="rounded-xl"
                  />
                </div>
                {dateRange?.from ? (
                  <p className="text-xs font-bold text-sky-700 text-center">
                    {dateRange.from.toLocaleDateString("pt-BR")}
                    {dateRange.to && dateRange.to.toDateString() !== dateRange.from.toDateString()
                      ? ` até ${dateRange.to.toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 text-center">
                    Selecione um dia ou intervalo
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Motivo</p>
                <Textarea
                  placeholder="Ex: Consulta médica, viagem, etc."
                  className="rounded-2xl resize-none font-medium border-slate-200"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button
                className="w-full rounded-2xl font-black h-12"
                onClick={handleSave}
                disabled={saving || !dateRange?.from || !message.trim()}
              >
                {saving ? "Enviando..." : "Enviar justificativa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.75rem] overflow-hidden bg-white">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 font-bold">Carregando...</p>
          </div>
        ) : justifications.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Nenhuma justificativa registrada.</p>
            <p className="text-slate-300 text-sm font-medium mt-1">
              Use o botão acima para justificar sua ausência.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="p-6 space-y-3">
              {justifications.map((j) => (
                <div
                  key={j.id}
                  className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-none bg-sky-600/10 text-sky-700 font-black">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        {formatPeriod(j.startDate, j.endDate)}
                      </Badge>
                      <Badge className="rounded-full border-none bg-slate-100 text-slate-600 font-bold text-[10px]">
                        {j.className}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{j.message}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Enviado em {new Date(j.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => setDeleteTarget(j)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
