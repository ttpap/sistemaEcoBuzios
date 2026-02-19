"use client";

import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  LogOut,
  BarChart3,
  FolderPlus,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import { clearActiveProjectId, getActiveProject } from '@/utils/projects';
import { logoutAdmin } from '@/utils/admin-auth';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);

  const menuItems = useMemo(() => {
    const base = [{ icon: FolderPlus, label: 'Projetos', path: '/projetos' }];
    if (!activeProject) return base;

    return [
      ...base,
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: GraduationCap, label: 'Alunos', path: '/alunos' },
      { icon: Users, label: 'Professores', path: '/professores' },
      { icon: BookOpen, label: 'Turmas', path: '/turmas' },
      { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
    ];
  }, [activeProject]);

  const isPdf = Boolean(activeProject?.imageUrl?.startsWith('data:application/pdf'));
  const isImage = Boolean(
    activeProject?.imageUrl?.startsWith('data:image/png') ||
      activeProject?.imageUrl?.startsWith('data:image/jpeg'),
  );

  const onLogout = () => {
    clearActiveProjectId();
    logoutAdmin();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 pt-10">
        {activeProject ? (
          <div className="rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-[1.5rem] bg-white overflow-hidden ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                {activeProject.imageUrl && isImage ? (
                  <img
                    src={activeProject.imageUrl}
                    alt={activeProject.name}
                    className="h-full w-full object-cover"
                  />
                ) : activeProject.imageUrl && isPdf ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <span className="text-primary font-black">{activeProject.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-800 truncate">{activeProject.name}</p>
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500">Projeto ativo</p>
              </div>
            </div>

            <Link
              to="/projetos"
              className="mt-3 inline-flex items-center justify-center w-full rounded-2xl bg-primary/10 text-primary border border-primary/15 px-3 py-2 text-xs font-black hover:bg-primary/15 transition-colors"
            >
              Trocar projeto
            </Link>
          </div>
        ) : (
          <>
            <Logo className="w-full" />
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
          </>
        )}
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
};

export default Sidebar;