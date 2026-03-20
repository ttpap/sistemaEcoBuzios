"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  BarChart3,
  LogOut,
  FileText,
  BadgeCheck,
  NotebookPen,
  Layers,
  UserCog,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProjects, getActiveProject, getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import { supabaseAuthService } from "@/services/supabaseAuthService";
import type { Project } from "@/types/project";
import { getTeacherSessionProjectIds, logoutTeacher, setTeacherSessionProjectId } from "@/utils/teacher-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeacherSidebar({
  mode = "desktop",
  onNavigate,
}: {
  mode?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);

  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const run = async () => {
      setProjects(await fetchProjects());

      const ids = getTeacherSessionProjectIds();
      // Se só houver um projeto, garante que ele está ativo.
      if (ids.length === 1 && !getActiveProjectId()) {
        setActiveProjectId(ids[0]);
        setTeacherSessionProjectId(ids[0]);
      }
    };

    void run();
  }, []);

  const availableProjects = useMemo(() => {
    const allowed = new Set(getTeacherSessionProjectIds());
    return projects.filter((p) => allowed.has(p.id));
  }, [projects]);

  const selectedProjectId = useMemo(() => getActiveProjectId(), [location.pathname]);

  const onChangeProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setTeacherSessionProjectId(projectId);
    navigate("/professor", { replace: true });
  };

  const menuItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: "Dashboard", path: "/professor" },
      { icon: GraduationCap, label: "Alunos", path: "/professor/alunos" },
      { icon: BookOpen, label: "Turmas", path: "/professor/turmas" },
      { icon: BarChart3, label: "Relatórios", path: "/professor/relatorios" },
      { icon: NotebookPen, label: "Relatório mensal", path: "/professor/relatorios/mensais" },
      { icon: Link2, label: "Links de inscrição", path: "/professor/links-inscricao" },
      { icon: UserCog, label: "Conta", path: "/professor/conta" },
    ],
    [],
  );

  const onLogout = async () => {
    logoutTeacher();
    await supabaseAuthService.signOut();
    navigate("/login");
  };

  return (
    <div
      className={cn(
        "bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 flex flex-col",
        mode === "desktop" ? "w-64 h-screen sticky top-0" : "w-full h-full",
      )}
    >
      <div className="p-6 pt-8">
        <div className="rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[1.5rem] bg-white overflow-hidden ring-1 ring-slate-200 flex items-center justify-center shrink-0">
              {activeProject?.imageUrl ? (
                <img src={activeProject.imageUrl} alt={activeProject.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary font-black">{(activeProject?.name || "P").charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-800 truncate">
                  {activeProject?.name || "Projeto"}
                </p>
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-[11px] font-bold text-slate-500">Área do professor</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Projeto</p>
            <Select value={selectedProjectId || ""} onValueChange={onChangeProject}>
              <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-colors",
                isActive
                  ? "bg-white shadow-sm border border-slate-200 text-primary"
                  : "text-slate-700 hover:bg-white/60 hover:text-primary",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-slate-700 hover:bg-white/60 hover:text-primary transition-colors"
        >
          <LogOut className="h-5 w-5 text-slate-500" />
          Sair
        </button>
      </div>
    </div>
  );
}