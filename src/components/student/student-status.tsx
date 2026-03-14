import React from "react";
import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/types/attendance";

export type StudentLessonStatusMeta = {
  label: string;
  className: string;
};

export function getStudentLessonStatusMeta(input: {
  status: AttendanceStatus | null;
  finalizedAt: string | null;
  ymd: string;
  todayYmd: string;
}): StudentLessonStatusMeta {
  const { status, finalizedAt, ymd, todayYmd } = input;

  if (status === "presente") return { label: "Presente", className: "bg-emerald-600 text-white" };
  if (status === "falta") return { label: "Falta", className: "bg-rose-600 text-white" };
  if (status === "atrasado") return { label: "Atrasado", className: "bg-amber-500 text-white" };
  if (status === "justificada") return { label: "Justificada", className: "bg-violet-600 text-white" };

  // Sem status ainda.
  if (ymd > todayYmd) return { label: "Programada", className: "bg-slate-200 text-slate-800" };
  if (finalizedAt) return { label: "Sem registro", className: "bg-slate-200 text-slate-800" };
  return { label: "Sem chamada", className: "bg-slate-200 text-slate-800" };
}

export function StudentStatusBadge(props: {
  status: AttendanceStatus | null;
  finalizedAt: string | null;
  ymd: string;
  todayYmd: string;
}) {
  const meta = getStudentLessonStatusMeta(props);
  return <Badge className={`rounded-full border-none font-black ${meta.className}`}>{meta.label}</Badge>;
}
