"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from "recharts";

const pct = (v: number, total: number) => total > 0 ? `${Math.round((v / total) * 1000) / 10}%` : "0%";
const fmtCountPct = (total: number) => (v: any, n: any) => [`${v} (${pct(Number(v), total)})`, n ?? "Alunos"];
import { supabase } from "@/integrations/supabase/client";
import { Layers, MapPinned, School, Users } from "lucide-react";

type ChartItem = { name: string; value: number };

type ChartData = {
  projectCounts: ChartItem[];
  neighborhoods: ChartItem[];
  schoolTypes: ChartItem[];
  ageRanges: ChartItem[];
};

const SCHOOL_COLORS: Record<string, string> = {
  "Pública": "hsl(var(--primary))",
  "Privada": "hsl(var(--secondary))",
  "Outros": "#60a5fa",
};

const AGE_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#60a5fa", "#34d399", "#f59e0b", "#f87171"];

function getProjectIdsFromUrl(): string[] | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("projetos");
  if (!raw) return null;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : null;
}

export default function PublicCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState(false);
  const [projectNames, setProjectNames] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const projectIds = getProjectIdsFromUrl();

        // Se há filtro de projetos, busca os nomes para exibição
        if (projectIds) {
          const { data: projectRows } = await supabase
            .from("projects")
            .select("id, name")
            .in("id", projectIds);
          if (projectRows) {
            setProjectNames((projectRows as any[]).map((p) => p.name));
          }
        }

        const rpcParams = projectIds ? { p_project_ids: projectIds } : {};
        const { data: result, error: rpcErr } = await supabase.rpc("public_dashboard_charts", rpcParams);
        if (rpcErr || !result) { setError(true); return; }
        setData(result as ChartData);
      } catch {
        setError(true);
      }
    };
    void run();
  }, []);

  const subtitle = projectNames.length > 0
    ? projectNames.join(" · ")
    : "Painel de indicadores dos participantes";

  return (
    <div className="min-h-screen bg-[#f5f0e6]/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
          <img
            src="/ecobuzios-logo.png"
            alt="EcoBúzios"
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">EcoBúzios</h1>
            <p className="text-slate-500 font-medium text-sm">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {error && (
          <div className="rounded-[2rem] bg-rose-50 border border-rose-100 p-8 text-center">
            <p className="text-rose-600 font-bold">Não foi possível carregar os dados.</p>
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 font-bold">Carregando dados…</p>
            </div>
          </div>
        )}

        {data && (() => {
          const totalProjects = data.projectCounts.reduce((s, x) => s + x.value, 0);
          const totalNeighborhoods = data.neighborhoods.reduce((s, x) => s + x.value, 0);
          const totalSchools = data.schoolTypes.reduce((s, x) => s + x.value, 0);
          const totalAges = data.ageRanges.reduce((s, x) => s + x.value, 0);
          return (
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Alunos por projeto */}
            {data.projectCounts.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Alunos por projeto</p>
                    <p className="text-xs text-slate-500 font-medium">Matrículas únicas por projeto</p>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.projectCounts} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 900 }} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={fmtCountPct(totalProjects)} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {data.projectCounts.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} opacity={0.9} />
                        ))}
                        <LabelList dataKey="value" position="top" formatter={(v: any) => pct(Number(v), totalProjects)} style={{ fill: "#475569", fontSize: 10, fontWeight: 900 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Bairros */}
            {data.neighborhoods.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                    <MapPinned className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Bairros</p>
                    <p className="text-xs text-slate-500 font-medium">Top 12 bairros de residência</p>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.neighborhoods} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={fmtCountPct(totalNeighborhoods)} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {data.neighborhoods.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "#60a5fa" : "hsl(var(--primary))"} opacity={0.9} />
                        ))}
                        <LabelList dataKey="value" position="top" formatter={(v: any) => pct(Number(v), totalNeighborhoods)} style={{ fill: "#475569", fontSize: 10, fontWeight: 900 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Situação escolar */}
            {data.schoolTypes.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Situação escolar</p>
                    <p className="text-xs text-slate-500 font-medium">Tipo de escola dos participantes</p>
                  </div>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.schoolTypes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {data.schoolTypes.map((entry, i) => (
                          <Cell key={i} fill={SCHOOL_COLORS[entry.name] || AGE_COLORS[i % AGE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={fmtCountPct(totalSchools)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {data.schoolTypes.map((d) => {
                    const total = data.schoolTypes.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SCHOOL_COLORS[d.name] || "#60a5fa" }} />
                          {d.name}
                        </div>
                        <span className="font-black text-slate-800">{d.value} · {Math.round((d.value / total) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Faixa de idade */}
            {data.ageRanges.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Faixa de idade</p>
                    <p className="text-xs text-slate-500 font-medium">Distribuição etária dos participantes</p>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ageRanges} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 900 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} formatter={fmtCountPct(totalAges)} />
                      <Bar dataKey="value" radius={[14, 14, 8, 8]}>
                        {data.ageRanges.map((_, i) => (
                          <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} opacity={0.9} />
                        ))}
                        <LabelList dataKey="value" position="top" formatter={(v: any) => pct(Number(v), totalAges)} style={{ fill: "#475569", fontSize: 10, fontWeight: 900 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
          );
        })()}

        <p className="text-center text-xs text-slate-400 font-medium pt-4">
          Dados atualizados em tempo real · EcoBúzios
        </p>
      </div>
    </div>
  );
}
