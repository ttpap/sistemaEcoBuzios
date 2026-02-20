"use client";

import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, GraduationCap, BookOpen, BarChart3, LogOut, FileText, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveProject } from "@/utils/projects";
import { logoutTeacher } from "@/utils/teacher-auth";

export default function TeacherSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);

  const menuItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: "Dashboard", path: "/professor" },
      { icon: GraduationCap, label: "Alunos", path: "/professor/alunos" },
      { icon: BookOpen, label: "Turmas", path: "/professor/turmas" },
      { icon: BarChart3, label: "Relatórios", path: "/professor/relatorios" },
    ],
    [],
  );

  const isPdf = Boolean(activeProject?.imageUrl?.startsWith("data:application/pdf"));
  const isImage = Boolean(
    activeProject?.imageUrl?.startsWith("data:image/png") ||
      activeProject?.imageUrl?.startsWith("data:image/jpeg"),
  );

  const onLogout = () => {
    logoutTeacher();
    navigate("/professor/login");
  };

  return (
    <div className="w-64 bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 pt-10">
        <div className="rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[1.5rem] bg-white overflow-hidden ring-1 ring-slate-200 flex items-center justify-center shrink-0">
              {activeProject?.imageUrl && isImage ? (
                <img
                  src={activeProject.imageUrl}
                  alt={activeProject.name}
                  className="h-full w-full object-cover"
                />
              ) : activeProject?.imageUrl && isPdf ? (
                <FileText className="h-5 w-5 text-primary" />
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
              <p className="text-[11px] font-bold text-slate-500">Acesso do professor</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
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
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}
