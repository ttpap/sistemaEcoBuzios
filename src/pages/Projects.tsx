"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess } from "@/utils/toast";
import {
  createProject,
  getActiveProjectId,
  getProjects,
  migrateLegacyDataToProjectIfNeeded,
  setActiveProjectId,
} from "@/utils/projects";
import { FolderPlus, LayoutDashboard, Layers, Pencil, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const activeId = useMemo(() => getActiveProjectId(), [projects]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const refresh = () => setProjects(getProjects());

  const onCreate = () => {
    const n = name.trim();
    if (!n) {
      showError("Informe o nome do projeto.");
      return;
    }

    const p = createProject({ name: n, imageUrl });
    migrateLegacyDataToProjectIfNeeded(p.id);

    setName("");
    setImageUrl("");
    refresh();

    showSuccess("Projeto criado e selecionado.");
    navigate("/");
  };

  const onSelect = (p: Project) => {
    setActiveProjectId(p.id);
    migrateLegacyDataToProjectIfNeeded(p.id);
    refresh();
    showSuccess("Projeto selecionado.");
    navigate("/");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Criar projeto</h1>
          <p className="text-slate-500 font-medium">
            Cada projeto tem seus próprios dados: Dashboard, Turmas e Relatórios.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 border border-slate-100 shadow-sm text-slate-600">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-black">Projetos: {projects.length}</span>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/40 bg-white rounded-[2.75rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-xl font-black text-primary flex items-center gap-3">
            <span className="h-11 w-11 rounded-[1.4rem] bg-primary/10 border border-primary/15 text-primary flex items-center justify-center">
              <FolderPlus className="h-5 w-5" />
            </span>
            Novo projeto
          </CardTitle>
          <p className="text-slate-500 font-medium mt-2">
            Informe um nome e uma imagem (link) para identificar o projeto.
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Nome do projeto
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: EcoBúzios – Núcleo Centro"
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Imagem do projeto (link)
              </Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/60"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-4">
              <div className="h-12 w-12 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-400">
                {imageUrl ? (
                  <img src={imageUrl} alt="Prévia" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">{name.trim() || "Nome do projeto"}</p>
                <p className="text-xs font-bold text-slate-500 truncate">
                  {imageUrl.trim() ? "Imagem definida" : "Sem imagem (opcional)"}
                </p>
              </div>
            </div>

            <Button
              className="rounded-2xl gap-2 h-12 px-6 font-black shadow-lg shadow-primary/20"
              onClick={onCreate}
            >
              <FolderPlus className="h-5 w-5" />
              Criar e abrir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-3">
          <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Projetos existentes
          </CardTitle>
          <p className="text-slate-500 font-medium mt-1">
            Selecione um projeto para trabalhar com os dados dele.
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-3">
          {projects.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <p className="text-sm font-bold text-slate-500">Nenhum projeto criado ainda.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[360px] pr-3">
              <div className="grid gap-3 md:grid-cols-2">
                {projects.map((p) => {
                  const isActive = p.id === activeId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelect(p)}
                      className={cn(
                        "w-full text-left rounded-[2rem] border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30",
                        isActive
                          ? "border-primary/25 bg-primary/5"
                          : "border-slate-100 bg-white hover:bg-slate-50",
                      )}
                      title="Selecionar projeto"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-black">{p.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">{p.name}</p>
                            <p className="text-xs font-bold text-slate-500 truncate">
                              Criado em {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isActive && (
                            <Badge className="rounded-full bg-secondary/15 text-primary border border-secondary/25 font-black">
                              Ativo
                            </Badge>
                          )}
                          <span className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black border bg-white text-slate-700 border-slate-200">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                            Abrir
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
