"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', alunos: 400 },
  { name: 'Fev', alunos: 450 },
  { name: 'Mar', alunos: 480 },
  { name: 'Abr', alunos: 520 },
  { name: 'Mai', alunos: 510 },
  { name: 'Jun', alunos: 550 },
];

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bem-vindo, Administrador</h1>
        <p className="text-slate-500">Aqui está o que está acontecendo na sua escola hoje.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Alunos</p>
            <div className="text-3xl font-bold text-slate-900">1,284</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Professores</p>
            <div className="text-3xl font-bold text-slate-900">48</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Turmas Ativas</p>
            <div className="text-3xl font-bold text-slate-900">24</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Frequência Média</p>
            <div className="text-3xl font-bold text-slate-900">94%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Crescimento de Matrículas</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="alunos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;