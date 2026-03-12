"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { supabaseAuthService } from "@/services/supabaseAuthService";
import { logoutStudent } from "@/utils/student-auth";

export default function StudentSidebar({
  mode = "desktop",
  onNavigate,
}: {
  mode?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [{ icon: CalendarDays, label: "Calendário", path: "/aluno" }];

  const onLogout = async () => {
    logoutStudent();
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
      <div className="p-6 pt-10">
        <div className="rounded-[2rem] bg-white/70 border border-slate-200/60 shadow-sm p-4">
          <Logo className="w-full" />
          <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Área do aluno</p>
            <p className="text-sm font-black text-slate-800 mt-1">Acompanhe suas aulas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {items.map((item) => (
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
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/50 hover:text-[#008ca0] transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}