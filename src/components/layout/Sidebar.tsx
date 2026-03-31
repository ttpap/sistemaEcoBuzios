"use client";

import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Users2,
  GraduationCap,
  BookOpen,
  LogOut,
  BarChart3,
  FolderPlus,
  FileText,
  BadgeCheck,
  NotebookPen,
  Link2,
  Database,
  UserCog,
  DollarSign,
  Award,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import { clearActiveProjectId, getActiveProject, getActiveProjectId } from '@/utils/projects';
import { supabaseAuthService } from '@/services/supabaseAuthService';

const Sidebar = ({ mode = "desktop", onNavigate }: { mode?: "desktop" | "mobile"; onNavigate?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);
  const activeProjectId = useMemo(() => getActiveProjectId(), [location.pathname]);
  const hasActiveProject = Boolean(activeProjectId);

  const menuItems = useMemo(() => {
    const base = [
      { icon: FolderPlus, label: 'Projetos', path: '/projetos' },
      { icon: Users, label: 'Professores', path: '/professores' },
      { icon: Users2, label: 'Coordenadores', path: '/coordenadores' },
      { icon: Link2, label: 'Links de inscrição', path: '/links-inscricao' },
      { icon: Database, label: 'Supabase', path: '/supabase' },
      { icon: UserCog, label: 'Minha conta', path: '/conta' },
    ];

    // Mostra Alunos/Turmas assim que existe um projeto ativo (id no storage),
    // mesmo que o cache local de projetos ainda não tenha carregado o nome.
    if (!hasActiveProject) return base;

    return [
      ...base,
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: GraduationCap, label: 'Alunos', path: '/alunos' },
      { icon: BookOpen, label: 'Turmas', path: '/turmas' },
      { icon: CalendarDays, label: 'Escalas', path: '/escalas' },
      { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
      { icon: NotebookPen, label: 'Relatório mensal', path: '/relatorios/mensais' },
      { icon: FileText, label: 'Relatório ENEL', path: '/relatorios/enel' },
      { icon: Award, label: 'Certificados', path: '/certificados' },
      { icon: ClipboardList, label: 'Ata de Reunião', path: '/ata-reuniao' },
    ];
  }, [hasActiveProject]);

  const isPdf = Boolean(activeProject?.imageUrl?.startsWith('data:application/pdf'));
  const isImage = Boolean(
    activeProject?.imageUrl?.startsWith('data:image/png') ||
      activeProject?.imageUrl?.startsWith('data:image/jpeg'),
  );

  const onLogout = async () => {
    clearActiveProjectId();
    await supabaseAuthService.signOut();
    navigate('/login');
  };

  return (
    <div
      className={cn(
        "bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 flex flex-col",
        mode === "desktop" ? "w-64 h-screen sticky top-0" : "w-full h-full",
      )}
    >
      <div className="p-6 pt-8">
        <div className="flex justify-center">
          <Logo className="w-[170px]" />
        </div>

        {hasActiveProject ? (
          <div className="mt-6 rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
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
                    {activeProject?.name || "Projeto selecionado"}
                  </p>
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500">Projeto ativo</p>
              </div>
            </div>

            <Link
              to="/projetos"
              onClick={() => onNavigate?.()}
              className="mt-3 inline-flex items-center justify-center w-full rounded-2xl bg-primary/10 text-primary border border-primary/15 px-3 py-2 text-xs font-black hover:bg-primary/15 transition-colors"
            >
              Trocar projeto
            </Link>
          </div>
        ) : (
          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
        )}
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

      <div className="p-4 border-t border-slate-200 space-y-1">
        <a
          href="https://www.ecobuziosfinanceiro.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
        >
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Financeiro
        </a>
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
};

export default Sidebar;