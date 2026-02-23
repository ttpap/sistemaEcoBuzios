"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, User } from "lucide-react";
import Logo from "@/components/Logo";
import { isAdminLoggedIn, loginAdmin, logoutAdmin } from "@/utils/admin-auth";
import {
  isTeacherLoggedIn,
  loginTeacher,
  logoutTeacher,
} from "@/utils/teacher-auth";
import {
  isCoordinatorLoggedIn,
  loginCoordinator,
  logoutCoordinator,
} from "@/utils/coordinator-auth";
import { isStudentLoggedIn, loginStudent, logoutStudent } from "@/utils/student-auth";
import { showError, showSuccess } from "@/utils/toast";

function useRoleHintFromQuery() {
  const location = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const r = (sp.get("role") || "").toLowerCase();
    if (r === "admin") return "admin" as const;
    if (r === "teacher" || r === "professor") return "teacher" as const;
    if (r === "coordinator" || r === "coordenador") return "coordinator" as const;
    return null;
  }, [location.search]);
}

export default function Login() {
  const navigate = useNavigate();
  const roleHint = useRoleHintFromQuery();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const loginTrimmed = login.trim().toLowerCase();
  const placeholder = useMemo(() => {
    if (loginTrimmed === "pap") return "Pap";
    if (loginTrimmed.startsWith("prof.")) return "Ex.: prof.nome.sobrenome.123";
    if (loginTrimmed.startsWith("coord.")) return "Ex.: coord.nome.sobrenome.123";

    if (roleHint === "admin") return "Pap";
    if (roleHint === "teacher") return "Ex.: prof.nome.sobrenome.123";
    if (roleHint === "coordinator") return "Ex.: coord.nome.sobrenome.123";

    return "Digite seu usuário";
  }, [loginTrimmed, roleHint]);

  useEffect(() => {
    // If already logged in, route accordingly.
    if (isAdminLoggedIn()) {
      navigate("/projetos", { replace: true });
      return;
    }
    if (isTeacherLoggedIn()) {
      navigate("/professor", { replace: true });
      return;
    }
    if (isCoordinatorLoggedIn()) {
      navigate("/coordenador", { replace: true });
      return;
    }
    if (isStudentLoggedIn()) {
      navigate("/aluno", { replace: true });
    }
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const loginValue = login.trim();
    const passwordValue = password;

    // 1) Try admin
    const isAdmin = loginAdmin({ login: loginValue, password: passwordValue });
    if (isAdmin) {
      logoutTeacher();
      logoutCoordinator();
      logoutStudent();
      showSuccess("Bem-vindo(a)! Acesso de administrador liberado.");
      navigate("/projetos", { replace: true });
      return;
    }

    // 2) Try student (matrícula completa AAAA-XXXX ou só últimos 4 dígitos)
    const looksLikeStudent = /^\d{4}-\d{4}$/.test(loginValue) || /^\d{1,4}$/.test(loginValue);
    if (looksLikeStudent) {
      const studentRes = loginStudent({ registration: loginValue, password: passwordValue });
      if (studentRes.ok) {
        logoutAdmin();
        logoutTeacher();
        logoutCoordinator();
        showSuccess("Bem-vindo(a)! Acesso do aluno liberado.");
        if (studentRes.projectIds.length > 1) {
          navigate("/aluno/selecionar-projeto", { replace: true });
        } else {
          navigate("/aluno", { replace: true });
        }
        return;
      }
      if ("reason" in studentRes && studentRes.reason === "not_assigned") {
        showError("Sua matrícula ainda não está vinculada a nenhuma turma/projeto. Procure um gestor.");
        return;
      }
      if ("reason" in studentRes && studentRes.reason === "ambiguous_login") {
        showError("Existem alunos com os mesmos 4 últimos dígitos. Entre com a matrícula completa (AAAA-XXXX). ");
        return;
      }
      // Se parece aluno, mas não autenticou, cai pro erro padrão no fim.
    }

    // 3) Try teacher
    const teacherRes = loginTeacher({ login: loginValue, password: passwordValue });
    if (teacherRes.ok) {
      logoutAdmin();
      logoutCoordinator();
      logoutStudent();
      showSuccess("Bem-vindo(a)! Acesso do professor liberado.");
      if (teacherRes.projectIds.length > 1) {
        navigate("/professor/selecionar-projeto", { replace: true });
      } else {
        navigate("/professor", { replace: true });
      }
      return;
    }
    if ("reason" in teacherRes && teacherRes.reason === "not_assigned") {
      showError(
        "Acesso ainda não liberado. Aguarde o administrador alocar você em um projeto.",
      );
      return;
    }

    // 4) Try coordinator
    const coordRes = loginCoordinator({ login: loginValue, password: passwordValue });
    if (coordRes.ok) {
      logoutAdmin();
      logoutTeacher();
      logoutStudent();
      showSuccess("Bem-vindo(a)! Acesso do coordenador liberado.");
      if (coordRes.projectIds.length > 1) {
        navigate("/coordenador/selecionar-projeto", { replace: true });
      } else {
        navigate("/coordenador", { replace: true });
      }
      return;
    }
    if ("reason" in coordRes && coordRes.reason === "not_assigned") {
      showError(
        "Acesso ainda não liberado. Aguarde o administrador alocar você em um projeto.",
      );
      return;
    }

    showError("Login ou senha inválidos.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">
            Sistema de Gestão Pedagógica EcoBuzios
          </h1>
          <p className="mt-2 text-slate-500 font-medium">
            Digite seu usuário e senha. O sistema identifica seu perfil automaticamente.
          </p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Acesso</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder={placeholder}
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    type="password"
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/60"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
                Entrar
              </Button>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
                Se aparecer a mensagem de "acesso não liberado", peça ao administrador para alocar você em um projeto.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}