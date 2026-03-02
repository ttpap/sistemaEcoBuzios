"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users2, Shield, UserRound } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-full max-w-[240px]">
            <Logo className="w-full" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-primary">EcoBúzios</h1>
          <p className="mt-2 text-slate-500 font-medium">Selecione seu tipo de acesso.</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-2">
            <CardTitle className="text-lg font-black text-slate-800">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 space-y-3">
            <Button
              className="w-full h-12 rounded-2xl font-black justify-start gap-3"
              onClick={() => navigate("/login/admin")}
              variant="default"
            >
              <Shield className="h-5 w-5" />
              Administrador
            </Button>

            <Button
              className="w-full h-12 rounded-2xl font-black justify-start gap-3"
              onClick={() => navigate("/professor/login")}
              variant="outline"
            >
              <GraduationCap className="h-5 w-5" />
              Professor
            </Button>

            <Button
              className="w-full h-12 rounded-2xl font-black justify-start gap-3"
              onClick={() => navigate("/coordenador/login")}
              variant="outline"
            >
              <Users2 className="h-5 w-5" />
              Coordenador
            </Button>

            <Button
              className="w-full h-12 rounded-2xl font-black justify-start gap-3"
              onClick={() => navigate("/aluno/login")}
              variant="outline"
            >
              <UserRound className="h-5 w-5" />
              Aluno
            </Button>

            <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4 text-xs font-bold text-slate-600">
              <p>
                <span className="font-black">Professor/Coordenador:</span> use o login e senha gerados no cadastro.
              </p>
              <p className="mt-2">
                <span className="font-black">Aluno:</span> use os 4 últimos dígitos da matrícula (ou a matrícula completa)
                e a senha padrão.
              </p>
            </div>

            <div className="mt-2">
              <Badge className="rounded-full border-none bg-secondary text-primary font-black px-3">
                Modo B (credenciais)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}