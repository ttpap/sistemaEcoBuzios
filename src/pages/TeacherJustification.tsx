"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, MessageSquarePlus, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { getTeacherSession } from "@/utils/teacher-auth";
import { getActiveProjectId } from "@/utils/projects";
import { showSuccess, showError } from "@/utils/toast";

type TeacherJustification = {
  id: string;
  teacherId: string;
  projectId: string | null;
  startDate: string;
  endDate: string | null;
  message: string;
  createdAt: string;
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPeriod(j: TeacherJustification) {
  const start = new Date(j.startDate + "T00:00:00").toLocaleDateString("pt-BR");
  if (!j.endDate || j.endDate === j.startDate) return start;
  const end = new Date(j.endDate + "T00:00:00").toLocaleDateString("pt-BR");
  return `${start} até ${end}`;
}

export default function TeacherJustification() {
  const session = getTeacherSession();
  const teacherId = session?.teacherId || "";
  const projectId = getActiveProjectId();

  const [items, setItems] = useState<TeacherJustification[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TeacherJustification | null>(null);

  // Carrega justificativas do professor
  useEffect(() => {
    const run = async () => {
      if (!supabase || !teacherId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("teacher_justifications")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("start_date", { ascending: false });

      if (!error && data) {
        setItems(
          data.map((r: any) => ({
            id: r.id,
            teacherId: r.teacher_id,
            projectId: r.project_id,
            startDate: r.start_date,
            endDate: r.end_date ?? null,
            message: r.message,
            createdAt: r.created_at,
          })),
        );
      }
      setLoading(false);
    };
    void run();
  }, [teacherId]);

  const handleSave = () => {
    const run = async () => {
      if (!supabase) return;
      if (!dateRange?.from) {
        showError("Selecione pelo menos a data de início.");
        return;
      }
      if (!message.trim()) {
        showError("Informe o motivo da ausência.");
        return;
      }

      const startDate = toYMD(dateRange.from);
      const endDate = dateRange.to ? toYMD(dateRange.to) : null;

      setSaving(true);
      try {
        const row = {
          teacher_id: teacherId,
          project_id: projectId || null,
          start_date: startDate,
          end_date: endDate,
          message: message.trim(),
        };

        const { data, error } = await supabase
          .from("teacher_justifications")
          .insert(row)
          .select()
          .single();

        if (error) throw error;

        const newItem: TeacherJustification = {
          id: data.id,
          teacherId: data.teacher_id,
          projectId: data.project_id,
          startDate: data.start_date,
          endDate: data.end_date ?? null,
          message: data.message,
          createdAt: data.created_at,
        };

        setItems((prev) => [newItem, ...prev]);
        showSuccess("Justificativa registrada com sucesso.");
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
        .from("teacher_justifications")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) {
        showError("Não foi possível remover a justificativa.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
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
              {deleteTarget ? `Período: ${formatPeriod(deleteTarget)}. Essa ação não pode ser desfeita.` : ""}
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
          <p className="text-slate-500 font-medium">Registre suas ausências com motivo e período.</p>
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
              <DialogTitle className="text-xl font-black text-primary">Registrar justificativa</DialogTitle>
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
                  <p className="text-xs font-bold text-slate-400 text-center">Clique para selecionar uma data ou intervalo</p>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Motivo</p>
                <Textarea
                  placeholder="Ex: Consulta médica, problema familiar, etc."
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
                {saving ? "Salvando..." : "Salvar justificativa"}
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Nenhuma justificativa registrada.</p>
            <p className="text-slate-300 text-sm font-medium mt-1">Use o botão acima para registrar sua primeira ausência.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="p-6 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-none bg-sky-600/10 text-sky-700 font-black">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        {formatPeriod(item)}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{item.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => setDeleteTarget(item)}
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
