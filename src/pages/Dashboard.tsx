"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, TrendingUp, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 font-medium">Bem-vindo à gestão centralizada EcoBúzios.</p>
        </div>
        <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold border border-secondary/20">
          <Star className="h-4 w-4 fill-secondary" />
          Ano Letivo 2024
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-xl shadow-primary/5 bg-white rounded-[2rem]">
          <CardContent className="p-6">
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Alunos</p>
            <div className="text-3xl font-black text-primary">1,284</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-secondary/5 bg-white rounded-[2rem]">
          <CardContent className="p-6">
            <div className="bg-secondary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Docentes</p>
            <div className="text-3xl font-black text-primary">48</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-primary/5 bg-white rounded-[2rem]">
          <CardContent className="p-6">
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Turmas</p>
            <div className="text-3xl font-black text-primary">24</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-secondary/5 bg-white rounded-[2rem]">
          <CardContent className="p-6">
            <div className="bg-secondary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Frequência</p>
            <div className="text-3xl font-black text-primary">94%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-primary/5 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-bold text-primary">Crescimento de Matrículas</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] p-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
              />
              <Bar dataKey="alunos" radius={[10, 10, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;