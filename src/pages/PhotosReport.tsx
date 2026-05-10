"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, ExternalLink, Trash2, RotateCcw } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import {
  getCoordinatorSessionLogin,
  getCoordinatorSessionPassword,
  getCoordinatorSessionProjectId,
} from "@/utils/coordinator-auth";
import {
  deletePhotoLinkAdmin,
  listAllPhotoLinksAdmin,
  listPhotoLinksForProject,
  type PhotoLink,
} from "@/services/photoLinksService";
import { getAreaBaseFromPathname } from "@/utils/route-base";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Grouped = Record<string, Record<string, PhotoLink[]>>;

function groupByYearMonth(links: PhotoLink[]): Grouped {
  const out: Grouped = {};
  for (const l of links) {
    const y = String(l.year);
    const m = String(l.month).padStart(2, "0");
    out[y] = out[y] || {};
    out[y][m] = out[y][m] || [];
    out[y][m].push(l);
  }
  return out;
}

export default function PhotosReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [links, setLinks] = useState<PhotoLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const all = await listAllPhotoLinksAdmin();
        setLinks(all);
      } else {
        const login = getCoordinatorSessionLogin();
        const password = getCoordinatorSessionPassword();
        const projectId = getCoordinatorSessionProjectId();
        if (!login || !password || !projectId) {
          showError("Sessão sem projeto ativo.");
          setLinks([]);
          return;
        }
        const list = await listPhotoLinksForProject(login, password, projectId);
        setLinks(list);
      }
    } catch (err: any) {
      showError(err?.message || "Erro ao carregar fotos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const grouped = useMemo(() => groupByYearMonth(links), [links]);
  const years = useMemo(() => Object.keys(grouped).sort((a, b) => Number(b) - Number(a)), [grouped]);

  const onDelete = async (id: string) => {
    if (!isAdmin) return;
    const ok = window.confirm("Excluir este link?");
    if (!ok) return;
    try {
      await deletePhotoLinkAdmin(id);
      showSuccess("Excluído.");
      await load();
    } catch (err: any) {
      showError(err?.message || "Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
          onClick={() => navigate(`${base}/relatorios`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button variant="outline" className="rounded-2xl font-black gap-2" onClick={load}>
          <RotateCcw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
        <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
          <Camera className="h-7 w-7" /> Fotos
        </h1>
        <p className="text-slate-500 font-medium">
          {isAdmin ? "Links de fotos enviados por todos os fotógrafos, em todos os projetos." : "Links de fotos do seu projeto."}
        </p>
      </div>

      {loading ? (
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 text-center text-sm font-bold text-slate-500">Carregando...</CardContent>
        </Card>
      ) : links.length === 0 ? (
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 text-center text-sm font-bold text-slate-500">
            Nenhum link de foto enviado ainda.
          </CardContent>
        </Card>
      ) : (
        years.map((y) => {
          const months = Object.keys(grouped[y]).sort((a, b) => Number(b) - Number(a));
          return (
            <Card key={y} className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8 pb-3">
                <CardTitle className="text-2xl font-black text-primary">{y}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {months.map((m) => (
                    <div key={`${y}-${m}`} className="p-5 md:p-6">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                        {MESES[Number(m) - 1]} / {y}
                      </p>
                      <div className="space-y-3">
                        {grouped[y][m].map((l) => (
                          <div
                            key={l.id}
                            className="rounded-[1.5rem] border border-slate-100 bg-slate-50/40 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/15 px-3 py-1 text-xs font-black">
                                  {l.project_name}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-xs font-black">
                                  {l.photographer_name}
                                </span>
                              </div>
                              {l.description ? (
                                <p className="text-sm font-bold text-slate-800">{l.description}</p>
                              ) : null}
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs font-black text-primary underline break-all"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> {l.url}
                              </a>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                asChild
                                className="h-10 rounded-2xl font-black gap-2"
                              >
                                <a href={l.url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" /> Abrir
                                </a>
                              </Button>
                              {isAdmin ? (
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-2xl font-black border-red-200 text-red-600 hover:bg-red-50 gap-2"
                                  onClick={() => onDelete(l.id)}
                                >
                                  <Trash2 className="h-4 w-4" /> Excluir
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
