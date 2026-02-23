"use client";

import React, { useMemo } from "react";
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
import { getActiveProject, getProjects, setActiveProjectId } from "@/utils/projects";
import {
  getCoordinatorSessionCoordinatorId,
  logoutCoordinator,
  setCoordinatorSessionProjectId,
} from "@/utils/coordinator-auth";
import { getCoordinatorProjectIds } from "@/utils/coordinators";
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

  const coordinatorId = useMemo(() => getCoordinatorSessionCoordinatorId(), []);
  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);

  const availableProjects = useMemo(() => {
    if (!coordinatorId) return [];
    const allowed = new Set(getCoordinatorProjectIds(coordinatorId));
    return getProjects().filter((p) => allowed.has(p.id));
  }, [coordinatorId]);

  const menuItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: "Dashboard", path: "/coordenador" },
      { icon: GraduationCap, label: "Alunos", path: "/coordenador/alunos" },
      { icon: BookOpen, label: "Turmas", path: "/coordenador/turmas" },
      { icon: UserCog, label: "Professores", path: "/coordenador/professores" },
      { icon: Link2, label: "Link de inscrição", path: "/inscricao" },
      { icon: BarChart3, label: "Relatórios", path: "/coordenador/relatorios" },
      { icon: NotebookPen, label: "Relatório mensal", path: "/coordenador/relatorios/mensais" },
      { icon: UserCog, label: "Minha conta", path: "/coordenador/conta" },
    ],
    [],
  );

  const isPdf = Boolean(activeProject?.imageUrl?.startsWith("data:application/pdf"));
  const isImage = Boolean(
    activeProject?.imageUrl?.startsWith("data:image/png") ||
      activeProject?.imageUrl?.startsWith("data:image/jpeg"),
  );

  const onLogout = () => {
    logoutCoordinator();
    navigate("/login?role=coordinator");
  };

  const hasMultipleProjects = availableProjects.length > 1;
  const currentProjectId = activeProject?.id || availableProjects[0]?.id || "";

  const onChangeProject = (projectId: string) => {
    if (!projectId) return;
    setActiveProjectId(projectId);
    setCoordinatorSessionProjectId(projectId);
    navigate("/coordenador", { replace: true });
  };

  return (
    <div
      className={cn(
        "bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 flex flex-col",
        mode === "desktop" ? "w-64 h-screen sticky top-0" : "w-full h-full",
      )}
    >
      <div className="p-6 pt-10">
        <div className="rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[1.5rem] bg-white overflow-hidden ring-1 ring-slate-200 flex items-center justify-center shrink-0">
              {activeProject?.imageUrl && isImage ? (
                <img src={activeProject.imageUrl} alt={activeProject.name} className="h-full w-full object-cover" />
              ) : activeProject?.imageUrl && isPdf ? (
                <FileText className="h-5 w-5 text-primary" />
              ) : (
                <span className="text-primary font-black">{(activeProject?.name || "P").charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-800 truncate">{activeProject?.name || "Projeto"}</p>
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-[11px] font-bold text-slate-500">Acesso do coordenador</p>
            </div>
          </div>

          {hasMultipleProjects && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projeto ativo</p>
              <Select value={currentProjectId} onValueChange={onChangeProject}>
                <SelectTrigger className="mt-2 h-11 rounded-2xl border-slate-200 bg-white font-black">
                  <Layers className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-bold">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
              location.pathname === item.path
                ? "bg-[#008ca0] text-white shadow-xl shadow-[#008ca0]/30 scale-[1.02]"
                : "text-slate-600 hover:bg-white/50 hover:text-[#008ca0] hover:shadow-sm",
            )}
          >
            <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "text-[#ffa534]" : "")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200/50">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
        >
          <LogOut className="h-5 w-5" /> Sair
        </button>
      </div>
    </div>
  );
}