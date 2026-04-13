"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Users, Clock, Search, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from 'react-router-dom';
import { SchoolClass } from '@/types/class';
import { showError } from '@/utils/toast';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { getActiveProjectId } from '@/utils/projects';
import {
  fetchProjectNucleosRemote,
  fetchProjectEnrollmentsRemoteWithMeta,
} from '@/services/classesService';

import { getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

const CLASS_COLORS = [
  { header: "bg-violet-600", text: "text-white", badge: "bg-violet-100 text-violet-700" },
  { header: "bg-emerald-600", text: "text-white", badge: "bg-emerald-100 text-emerald-700" },
  { header: "bg-sky-600", text: "text-white", badge: "bg-sky-100 text-sky-700" },
  { header: "bg-amber-500", text: "text-white", badge: "bg-amber-100 text-amber-700" },
  { header: "bg-rose-600", text: "text-white", badge: "bg-rose-100 text-rose-700" },
  { header: "bg-indigo-600", text: "text-white", badge: "bg-indigo-100 text-indigo-700" },
  { header: "bg-teal-600", text: "text-white", badge: "bg-teal-100 text-teal-700" },
  { header: "bg-orange-500", text: "text-white", badge: "bg-orange-100 text-orange-700" },
];

const Numeros = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const projectId = useMemo(() => getActiveProjectId(), [location.pathname]);

  const [nucleos, setNucleos] = useState<SchoolClass[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [enrollCounts, setEnrollCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const run = async () => {
      if (!projectId) return;

      if (base === "/professor" && !getTeacherSessionPassword()) {
        showError("Sua sessão do professor expirou. Saia e entre novamente.");
        setNucleos([]);
        return;
      }

      if (base === "/coordenador" && !getCoordinatorSessionPassword()) {
        showError("Sua sessão do coordenador expirou. Saia e entre novamente.");
        setNucleos([]);
        return;
      }

      try {
        const [nucleosList, enrollRes] = await Promise.all([
          fetchProjectNucleosRemote(projectId),
          fetchProjectEnrollmentsRemoteWithMeta(projectId),
        ]);

        setNucleos(nucleosList as SchoolClass[]);

        const counts = new Map<string, number>();
        for (const e of enrollRes.enrollments) {
          if (!e.removed_at) {
            counts.set(e.class_id, (counts.get(e.class_id) || 0) + 1);
          }
        }
        setEnrollCounts(counts);
      } catch {
        showError("Não foi possível carregar os números.");
        setNucleos([]);
      }
    };

    void run();
  }, [projectId, base]);

  const filtered = nucleos.filter(n =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Números</h1>
          <p className="text-slate-500 font-medium">Subcategorias das turmas do projeto.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Buscar número por nome..."
            className="pl-12 h-12 rounded-xl border-slate-100 bg-slate-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <Layers className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum número cadastrado.</p>
          </div>
        ) : (
          filtered.map((nucleo, idx) => {
            const color = CLASS_COLORS[idx % CLASS_COLORS.length];
            const count = enrollCounts.get(nucleo.id) || 0;
            return (
              <Card
                key={nucleo.id}
                className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 cursor-pointer"
                onClick={() => navigate(`${base}/turmas/${nucleo.id}`)}
              >
                <CardHeader className={`${color.header} p-6`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg font-black tracking-tight ${color.text}`}>{nucleo.name}</CardTitle>
                    <Badge className={`rounded-full font-black border-none px-3 ${color.badge}`}>
                      {nucleo.period}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-bold">{nucleo.startTime} - {nucleo.endTime}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-bold">{count} Aluno{count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <AlertCircle className="h-4 w-4 text-secondary" />
                    Limite de {nucleo.absenceLimit} faltas
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Numeros;
