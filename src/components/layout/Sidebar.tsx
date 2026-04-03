"use client";

import React, { useMemo, useState } from 'react';
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
  FolderOpen,
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
  KeyRound,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import { clearActiveProjectId, getActiveProject, getActiveProjectId } from '@/utils/projects';
import { supabaseAuthService } from '@/services/supabaseAuthService';

const SISTEMA_PATHS = ['/professores', '/coordenadores', '/api-keys', '/links-inscricao', '/supabase', '/conta'];
const PROJECT_PATHS = ['/', '/escalas', '/turmas', '/alunos', '/relatorios', '/ata-reuniao', '/certificados'];

const Sidebar = ({ mode = "desktop", onNavigate }: { mode?: "desktop" | "mobile"; onNavigate?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = useMemo(() => getActiveProject(), [location.pathname]);
  const activeProjectId = useMemo(() => getActiveProjectId(), [location.pathname]);
  const hasActiveProject = Boolean(activeProjectId);

  const isSistemaRoute = SISTEMA_PATHS.some((p) => location.pathname.startsWith(p));
  const [sistemaOpen, setSistemaOpen] = useState(() => isSistemaRoute);
  const [projetosOpen, setProjetosOpen] = useState(() => !isSistemaRoute);
  const [reportsOpen, setReportsOpen] = useState(() => location.pathname.startsWith('/relatorios'));

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

  const sistemaItems = [
    { icon: Users, label: 'Professores', path: '/professores' },
    { icon: Users2, label: 'Coordenadores', path: '/coordenadores' },
    { icon: GraduationCap, label: 'Todos os alunos', path: '/alunos' },
    { icon: KeyRound, label: 'Chaves de API', path: '/api-keys' },
    { icon: Link2, label: 'Links de inscrição', path: '/links-inscricao' },
    { icon: Database, label: 'Supabase', path: '/supabase' },
    { icon: UserCog, label: 'Minha conta', path: '/conta' },
  ];

  const projectItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CalendarDays, label: 'Escalas', path: '/escalas' },
    { icon: BookOpen, label: 'Turmas', path: '/turmas' },
    { icon: GraduationCap, label: 'Alunos', path: '/alunos' },
  ];

  const isSistemaActive = sistemaItems.some((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
  const isProjetosActive = !isSistemaActive;

  return (
    <div
      className={cn(
        "bg-[#f5f0e6]/90 backdrop-blur-xl border-r border-slate-200 flex flex-col",
        mode === "desktop" ? "w-64 h-screen sticky top-0" : "w-full h-full",
      )}
    >
      {/* Logo */}
      <div className="p-6 pt-8 pb-4">
        <div className="flex justify-center">
          <Logo className="w-[170px]" />
        </div>
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">

        {/* ── SISTEMA ─────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setSistemaOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-colors",
              isSistemaActive
                ? "bg-white shadow-sm border border-slate-200 text-primary"
                : "text-slate-700 hover:bg-white/60 hover:text-primary",
            )}
          >
            <Settings className={cn("h-5 w-5", isSistemaActive ? "text-primary" : "text-slate-500")} />
            <span className="flex-1 text-left">Sistema</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", sistemaOpen ? "rotate-180" : "")} />
          </button>

          {sistemaOpen && (
            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
              {sistemaItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                      isActive
                        ? "bg-white shadow-sm border border-slate-200 text-primary"
                        : "text-slate-600 hover:bg-white/60 hover:text-primary",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PROJETOS ────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setProjetosOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-colors",
              isProjetosActive && location.pathname !== '/projetos'
                ? "bg-white shadow-sm border border-slate-200 text-primary"
                : "text-slate-700 hover:bg-white/60 hover:text-primary",
            )}
          >
            <FolderOpen className={cn("h-5 w-5", isProjetosActive && location.pathname !== '/projetos' ? "text-primary" : "text-slate-500")} />
            <span className="flex-1 text-left min-w-0">
              <span>Projetos</span>
              {hasActiveProject && activeProject && (
                <span className="ml-1 text-[10px] font-bold text-slate-400 truncate"> — {activeProject.name}</span>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200 shrink-0", projetosOpen ? "rotate-180" : "")} />
          </button>

          {projetosOpen && (
            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">

              {/* Selecionar / trocar projeto */}
              {hasActiveProject ? (
                <div className="mx-1 mb-2 rounded-[1.5rem] bg-white/80 border border-slate-200/60 shadow-sm p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-white overflow-hidden ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                      {activeProject?.imageUrl && isImage ? (
                        <img src={activeProject.imageUrl} alt={activeProject.name} className="h-full w-full object-cover" />
                      ) : activeProject?.imageUrl && isPdf ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-primary font-black text-xs">{(activeProject?.name || "P").charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-black text-slate-800 truncate">{activeProject?.name || "Projeto"}</p>
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">Projeto ativo</p>
                    </div>
                  </div>
                  <Link
                    to="/projetos"
                    onClick={() => onNavigate?.()}
                    className="mt-2 inline-flex items-center justify-center w-full rounded-xl bg-primary/10 text-primary border border-primary/15 px-3 py-1.5 text-xs font-black hover:bg-primary/15 transition-colors"
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-1.5" /> Trocar projeto
                  </Link>
                </div>
              ) : (
                <Link
                  to="/projetos"
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                    location.pathname === '/projetos'
                      ? "bg-white shadow-sm border border-slate-200 text-primary"
                      : "text-slate-600 hover:bg-white/60 hover:text-primary",
                  )}
                >
                  <FolderPlus className={cn("h-4 w-4", location.pathname === '/projetos' ? "text-primary" : "text-slate-400")} />
                  Selecionar projeto
                </Link>
              )}

              {/* Itens do projeto ativo */}
              {hasActiveProject && (
                <>
                  {projectItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => onNavigate?.()}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                          isActive
                            ? "bg-white shadow-sm border border-slate-200 text-primary"
                            : "text-slate-600 hover:bg-white/60 hover:text-primary",
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                        {item.label}
                      </Link>
                    );
                  })}

                  {/* Relatórios (sub-grupo) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setReportsOpen((v) => !v)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                        location.pathname.startsWith('/relatorios')
                          ? "bg-white shadow-sm border border-slate-200 text-primary"
                          : "text-slate-600 hover:bg-white/60 hover:text-primary",
                      )}
                    >
                      <BarChart3 className={cn("h-4 w-4", location.pathname.startsWith('/relatorios') ? "text-primary" : "text-slate-400")} />
                      <span className="flex-1 text-left">Relatórios</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", reportsOpen ? "rotate-180" : "")} />
                    </button>

                    {reportsOpen && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-2">
                        {[
                          { icon: BarChart3, label: 'Relatórios gerais', path: '/relatorios' },
                          { icon: NotebookPen, label: 'Relatório mensal', path: '/relatorios/mensais' },
                          { icon: FileText, label: 'Relatório ENEL', path: '/relatorios/enel' },
                        ].map((child) => {
                          const isActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => onNavigate?.()}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-2xl text-sm font-black transition-colors",
                                isActive
                                  ? "bg-white shadow-sm border border-slate-200 text-primary"
                                  : "text-slate-500 hover:bg-white/60 hover:text-primary",
                              )}
                            >
                              <child.icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-400")} />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/ata-reuniao"
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                      location.pathname === '/ata-reuniao'
                        ? "bg-white shadow-sm border border-slate-200 text-primary"
                        : "text-slate-600 hover:bg-white/60 hover:text-primary",
                    )}
                  >
                    <ClipboardList className={cn("h-4 w-4", location.pathname === '/ata-reuniao' ? "text-primary" : "text-slate-400")} />
                    Ata de Reunião
                  </Link>

                  <Link
                    to="/certificados"
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors",
                      location.pathname === '/certificados'
                        ? "bg-white shadow-sm border border-slate-200 text-primary"
                        : "text-slate-600 hover:bg-white/60 hover:text-primary",
                    )}
                  >
                    <Award className={cn("h-4 w-4", location.pathname === '/certificados' ? "text-primary" : "text-slate-400")} />
                    Certificados
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

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
