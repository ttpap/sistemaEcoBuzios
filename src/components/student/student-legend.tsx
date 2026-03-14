import React from "react";

const Item = ({ label, className }: { label: string; className: string }) => (
  <div className="flex items-center gap-2">
    <span className={`h-3.5 w-3.5 rounded-full ${className}`} />
    <span className="text-xs font-bold text-slate-700">{label}</span>
  </div>
);

export function StudentLegend() {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Legenda</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Item label="Presença" className="bg-emerald-600" />
        <Item label="Falta" className="bg-rose-600" />
        <Item label="Atraso" className="bg-amber-500" />
        <Item label="Falta justificada" className="bg-violet-600" />
        <Item label="Aula programada / sem chamada" className="bg-slate-300" />
      </div>
    </div>
  );
}
