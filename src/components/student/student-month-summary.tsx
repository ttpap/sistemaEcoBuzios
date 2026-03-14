import React, { useMemo } from "react";
import type { AttendanceStatus } from "@/types/attendance";

export type StudentMonthSummaryCounts = {
  total: number;
  presente: number;
  falta: number;
  atrasado: number;
  justificada: number;
  semChamada: number;
};

export function useStudentMonthSummary(rows: Array<{ ymd: string; status: AttendanceStatus | null; finalizedAt: string | null }>, todayYmd: string) {
  return useMemo((): StudentMonthSummaryCounts => {
    const c: StudentMonthSummaryCounts = {
      total: rows.length,
      presente: 0,
      falta: 0,
      atrasado: 0,
      justificada: 0,
      semChamada: 0,
    };

    for (const r of rows) {
      if (r.status === "presente") c.presente += 1;
      else if (r.status === "falta") c.falta += 1;
      else if (r.status === "atrasado") c.atrasado += 1;
      else if (r.status === "justificada") c.justificada += 1;
      else {
        // sem status
        // conta como “sem chamada/sem registro” apenas para aulas até hoje (o futuro é “programada”).
        if (r.ymd <= todayYmd) c.semChamada += 1;
      }
    }

    return c;
  }, [rows, todayYmd]);
}

function StatCard(props: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-[1.75rem] border border-slate-100 bg-white p-4 ${props.className}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{props.label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{props.value}</p>
    </div>
  );
}

export function StudentMonthSummary(props: { monthLabel: string; counts: StudentMonthSummaryCounts }) {
  const { counts } = props;
  return (
    <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50/50 p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resumo do mês</p>
          <p className="text-sm font-black text-slate-800">{props.monthLabel}</p>
        </div>
        <p className="text-xs font-bold text-slate-500">Total de aulas: {counts.total}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Presenças" value={counts.presente} className="" />
        <StatCard label="Faltas" value={counts.falta} className="" />
        <StatCard label="Atrasos" value={counts.atrasado} className="" />
        <StatCard label="Justificadas" value={counts.justificada} className="" />
        <StatCard label="Sem chamada/registro" value={counts.semChamada} className="" />
      </div>
    </div>
  );
}
