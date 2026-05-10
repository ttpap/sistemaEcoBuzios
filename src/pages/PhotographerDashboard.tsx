"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, LogOut, Plus, Trash2, ExternalLink, Pencil, X, ArrowLeft } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getPhotographerSession,
  getPhotographerSessionLogin,
  getPhotographerSessionPassword,
  logoutPhotographer,
} from "@/utils/photographer-auth";
import {
  deletePhotoLinkAsPhotographer,
  listPhotoLinksForPhotographer,
  upsertPhotoLinkAsPhotographer,
  type PhotoLink,
} from "@/services/photoLinksService";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type ProjectOption = { id: string; name: string };

export default function PhotographerDashboard() {
  const navigate = useNavigate();
  const session = getPhotographerSession();
  const login = getPhotographerSessionLogin();
  const password = getPhotographerSessionPassword();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [links, setLinks] = useState<PhotoLink[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    if (!login || !password) return;
    setLoading(true);
    try {
      const { data: projData, error: projErr } = await supabase.rpc("mode_b_list_photographer_assignments", {
        p_login: login,
        p_password: password,
      });
      if (projErr) throw projErr;
      const proj = (projData || []).map((r: any) => ({ id: r.project_id, name: r.project_name })) as ProjectOption[];
      setProjects(proj);
      if (!projectId && proj.length === 1) setProjectId(proj[0].id);

      const list = await listPhotoLinksForPhotographer(login, password);
      setLinks(list);
    } catch (err: any) {
      showError(err?.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login, password]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProjectId(projects.length === 1 ? projects[0].id : "");
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setDescription("");
    setUrl("");
  };

  const onEdit = (link: PhotoLink) => {
    setEditingId(link.id);
    setProjectId(link.project_id);
    setMonth(link.month);
    setYear(link.year);
    setDescription(link.description);
    setUrl(link.url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) {
      showError("Sessão expirou. Faça login novamente.");
      navigate("/fotografo/login", { replace: true });
      return;
    }
    if (!projectId) {
      showError("Selecione o projeto.");
      return;
    }
    if (!url.trim()) {
      showError("Cole o link das fotos.");
      return;
    }

    setSubmitting(true);
    try {
      await upsertPhotoLinkAsPhotographer(login, password, {
        id: editingId,
        projectId,
        month,
        year,
        description,
        url,
      });
      showSuccess(editingId ? "Link atualizado!" : "Link enviado!");
      resetForm();
      await loadAll();
    } catch (err: any) {
      showError(err?.message || "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!login || !password) return;
    const ok = window.confirm("Excluir este link?");
    if (!ok) return;
    try {
      await deletePhotoLinkAsPhotographer(login, password, id);
      showSuccess("Link excluído.");
      await loadAll();
    } catch (err: any) {
      showError(err?.message || "Erro ao excluir.");
    }
  };

  const onLogout = () => {
    logoutPhotographer();
    navigate("/fotografo/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f0e6]">
      <div className="sticky top-0 z-30 bg-[#f5f0e6]/95 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-2 flex-wrap">
          <Button
            onClick={() => navigate("/")}
            className="rounded-2xl font-black gap-2 bg-primary text-white hover:bg-primary/90"
            title="Voltar para a área do administrador"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para admin
          </Button>
          <Button variant="outline" onClick={onLogout} className="rounded-2xl font-black gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>

      <div className="px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0">
            <Logo className="h-full w-full" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Área do fotógrafo</p>
            <h1 className="text-xl font-black text-primary tracking-tight">
              {session?.fullName || "Fotógrafo"}
            </h1>
          </div>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-3">
            <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
              <Camera className="h-5 w-5" /> {editingId ? "Editar link" : "Enviar link de fotos"}
            </CardTitle>
            <p className="text-slate-500 font-medium mt-1">
              Cole o link do Google Drive (ou outro) com as fotos do mês para o projeto.
            </p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-3">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label className="font-black">Projeto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="font-bold">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-black">Mês</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)} className="font-bold">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-black">Ano</Label>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)} className="font-bold">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="font-black">Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fotos das aulas, evento de encerramento..."
                  className="h-12 rounded-xl"
                />
              </div>

              <div>
                <Label className="font-black">Link (URL)</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={submitting} className="h-12 rounded-2xl font-black gap-2">
                  {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Salvando..." : editingId ? "Salvar alterações" : "Enviar link"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-12 rounded-2xl font-black gap-2"
                  >
                    <X className="h-4 w-4" /> Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-3">
            <CardTitle className="text-xl font-black text-primary">Meus envios</CardTitle>
            <p className="text-slate-500 font-medium mt-1">Histórico dos seus links enviados.</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">Carregando...</div>
            ) : links.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">Nenhum link enviado ainda.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {links.map((l) => (
                  <div key={l.id} className="p-5 md:p-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{l.project_name}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {MESES[l.month - 1]} / {l.year}
                      </p>
                      {l.description ? (
                        <p className="text-xs font-bold text-slate-600 mt-1">{l.description}</p>
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
                        type="button"
                        variant="outline"
                        onClick={() => onEdit(l)}
                        className="h-10 rounded-2xl font-black gap-2"
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onDelete(l.id)}
                        className="h-10 rounded-2xl font-black border-red-200 text-red-600 hover:bg-red-50 gap-2"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
