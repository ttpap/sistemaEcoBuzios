import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StudentStatusBadge } from "@/components/student/student-status";
import type { AttendanceStatus } from "@/types/attendance";

export type StudentLessonRow = {
  ymd: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  finalizedAt: string | null;
  status: AttendanceStatus | null;
  justificationMessage: string | null;
};

function formatDatePt(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("pt-BR");
}

export function StudentLessonDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StudentLessonRow | null;
  todayYmd: string;
}) {
  const r = props.row;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="rounded-[2rem] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-primary">Detalhes da aula</DialogTitle>
        </DialogHeader>

        {!r ? null : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{r.className}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  {formatDatePt(r.ymd)} • {r.startTime}–{r.endTime}
                </p>
              </div>
              <StudentStatusBadge status={r.status} finalizedAt={r.finalizedAt} ymd={r.ymd} todayYmd={props.todayYmd} />
            </div>

            <Separator />

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 font-bold">Turma</span>
                <span className="text-slate-900 font-black text-right">{r.className}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 font-bold">Horário</span>
                <span className="text-slate-900 font-black">{r.startTime}–{r.endTime}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 font-bold">Professor</span>
                <span className="text-slate-900 font-black">Não informado</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 font-bold">Chamada</span>
                <span className="text-slate-900 font-black">{r.finalizedAt ? "Finalizada" : "Não finalizada"}</span>
              </div>
            </div>

            {r.justificationMessage ? (
              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Justificativa</p>
                <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">{r.justificationMessage}</p>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
