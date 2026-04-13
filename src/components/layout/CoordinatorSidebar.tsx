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
  Award,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  Users,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProjects, getActiveProject, getActiveProjectId, setActiveProjectId } from "@/utils/projects";
import { supabaseAuthService } from "@/services/supabaseAuthService";
import type { Project } from "@/types/project";
import {
  getCoordinatorSessionProjectIds,
  logoutCoordinator,
  setCoordinatorSessionProjectId,
} from "@/utils/coordinator-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CoordinatorSidebar({
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

      const ids = getCoordinatorSessionProjectIds();
      if (ids.length === 1 && !getActiveProjectId()) {
        setActiveProjectId(ids[0]);
        setCoordinatorSessionProjectId(ids[0]);
      }
    };

    void run();
  }, []);

  const availableProjects = useMemo(() => {
    const allowed = new Set(getCoordinatorSessionProjectIds());
    return projects.filter((p) => allowed.has(p.id));
  }, [projects]);

  const selectedProjectId = useMemo(() => getActiveProjectId(), [location.pathname]);
  const [reportsOpen, setReportsOpen] = useState(() => location.pathname.startsWith('/coordenador/relatorios'));
  const [turmasOpen, setTurmasOpen] = useState(() => location.pathname.startsWith('/coordenador/turmas') || location.pathname.startsWith('/coordenador/numeros'));

  const onChangeProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setCoordinatorSessionProjectId(projectId);
    navigate("/coordenador", { replace: true });
  };

  const menuItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: "Dashboard", path: "/coordenador" },
      { icon: CalendarDays, label: "Escalas", path: "/coordenador/escalas" },
      { icon: GraduationCap, label: "Professores", path: "/coordenador/professores" },
      { icon: BookOpen, label: "Turmas", children: [
        { icon: BookOpen, label: "Turmas", path: "/coordenador/turmas" },
        { icon: Layers, label: "Números", path: "/coordenador/numeros" },
      ]},
      { icon: Users, label: "Alunos", path: "/coordenador/alunos" },
      { icon: BarChart3, label: "Relatórios", children: [
        { icon: BarChart3, label: "Relatórios gerais", path: "/coordenador/relatorios" },
        { icon: NotebookPen, label: "Relatório mensal", path: "/coordenador/relatorios/mensais" },
        { icon: FileText, label: "Relatório ENEL", path: "/coordenador/relatorios/enel" },
      ]},
      { icon: Award, label: "Certificados", path: "/coordenador/certificados" },
      { icon: ClipboardList, label: "Ata de Reunião", path: "/coordenador/ata-reuniao" },
      { icon: ImageOff, label: "Autorização de Imagem", path: "/coordenador/autorizar-imagem" },
      { icon: Link2, label: "Links de inscrição", path: "/coordenador/links-inscricao" },
      { icon: UserCog, label: "Conta", path: "/coordenador/conta" },
    ],
    [],
  );

  const onLogout = async () => {
    logoutCoordinator();
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
              <p className="text-[11px] font-bold text-slate-500">Área do coordenador</p>
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
          if ('children' in item && item.children) {
            const isGroupActive = item.children.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));
            const isOpen = item.label === "Relatórios" ? reportsOpen : turmasOpen;
            const toggleOpen = item.label === "Relatórios"
              ? () => setReportsOpen((v) => !v)
              : () => setTurmasOpen((v) => !v);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={toggleOpen}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-colors",
                    isGroupActive
                      ? "bg-white shadow-sm border border-slate-200 text-primary"
                      : "text-slate-700 hover:bg-white/60 hover:text-primary",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isGroupActive ? "text-primary" : "text-slate-500")} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                </button>
                {isOpen && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                    {item.children.map((child) => {
                      const isActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => onNavigate?.()}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                            isActive
                              ? "bg-white shadow-sm border border-slate-200 text-primary"
                              : "text-slate-600 hover:bg-white/60 hover:text-primary",
                          )}
                        >
                          <child.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
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