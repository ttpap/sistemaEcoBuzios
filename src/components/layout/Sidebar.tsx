"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '../Logo';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: GraduationCap, label: 'Alunos', path: '/alunos' },
    { icon: Users, label: 'Professores', path: '/professores' },
    { icon: BookOpen, label: 'Turmas', path: '/turmas' },
  ];

  return (
    <div className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-8">
        <Logo className="w-full" />
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <nav className="flex-1 px-4 space-y-1">
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