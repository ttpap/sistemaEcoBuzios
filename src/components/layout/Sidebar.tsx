"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings,
  LogOut,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: GraduationCap, label: 'Alunos', path: '/alunos' },
    { icon: Users, label: 'Professores', path: '/professores' },
    { icon: BookOpen, label: 'Turmas', path: '/turmas' },
  ];

  return (
    <div className="w-64 bg-white/50 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 flex flex-col gap-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <Waves className="text-white h-6 w-6" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter text-primary">
            ECO<span className="text-secondary">BÚZIOS</span>
          </h1>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pl-1">Gestão Educacional</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
              location.pathname === item.path
                ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]"
                : "text-slate-500 hover:bg-white hover:text-primary hover:shadow-sm"
            )}
          >
            <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "text-secondary" : "")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;