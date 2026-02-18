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
  School
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
    <div className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl">
          <School className="text-white h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-none">EduManage</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestão Escolar</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              location.pathname === item.path
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
          <LogOut className="h-5 w-5" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

export default Sidebar;