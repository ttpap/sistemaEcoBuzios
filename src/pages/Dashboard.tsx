"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, TrendingUp, Star, Database, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';

const data = [
  { name: 'Jan', alunos: 400 },
  { name: 'Fev', alunos: 450 },
  { name: 'Mar', alunos: 480 },
  { name: 'Abr', alunos: 520 },
  { name: 'Mai', alunos: 510 },
  { name: 'Jun', alunos: 550 },
];

const Dashboard = () => {
  const [studentCount, setStudentCount] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ecobuzios_students') || '[]');
    setStudentCount(saved.length);
  }, []);

  const seedTestData = () => {
    setIsSeeding(true);
    
    const mockNames = [
      "Lucas Silva", "Maria Oliveira", "João Santos", "Ana Costa", "Pedro Souza",
      "Julia Ferreira", "Gabriel Pereira", "Beatriz Rodrigues", "Matheus Almeida", "Larissa Nascimento",
      "Thiago Lima", "Camila Gomes", "Vinicius Rocha", "Isabella Carvalho", "Felipe Araujo",
      "Manuela Melo", "Gustavo Barbosa", "Helena Castro", "Rodrigo Martins", "Alice Guimarães"
    ];

    const neighborhoods = ["Centro", "Geribá", "Rasa", "Manguinhos", "Ferradura", "Ossos", "Cem Braças"];
    const schools = ["Colégio Dominus", "E. M. Paulo Freire", "C. E. João de Oliveira Botas", "Colégio Integral"];

    const newStudents = mockNames.map((name, index) => {
      const year = 2024;
      const regNumber = (index + 1).toString().padStart(4, '0');
      const age = Math.floor(Math.random() * (18 - 6 + 1)) + 6;
      
      return {
        id: crypto.randomUUID(),
        registration: `${year}-${regNumber}`,
        fullName: name,
        email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
        cpf: `${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}`,
        birthDate: `${2024 - age}-05-15`,
        age: age,
        cellPhone: "(22) 99" + Math.floor(Math.random() * 90000000 + 10000000),
        phone: "(22) 26" + Math.floor(Math.random() * 9000000 + 1000000),
        gender: index % 2 === 0 ? 'Homem cis' : 'Mulher cis',
        race: ['Branca', 'Parda', 'Preta'][Math.floor(Math.random() * 3)],
        schoolType: index % 3 === 0 ? 'private' : 'municipal',
        schoolName: schools[Math.floor(Math.random() * schools.length)],
        cep: "28950-000",
        street: "Avenida José Bento Ribeiro Dantas",
        number: (index * 10 + 5).toString(),
        neighborhood: neighborhoods[Math.floor(Math.random() * neighborhoods.length)],
        city: "Armação dos Búzios",
        uf: "RJ",
        hasAllergy: index % 5 === 0,
        allergyDetail: index % 5 === 0 ? "Lactose" : "",
        hasSpecialNeeds: false,
        usesMedication: false,
        hasPhysicalRestriction: false,
        practicedActivity: true,
        familyHeartHistory: false,
        healthProblems: [],
        imageAuthorization: 'authorized',
        docsDelivered: ["RG do Aluno", "CPF do Aluno", "Comprovante de Residência"],
        registrationDate: new Date().toISOString(),
        status: 'Ativo',
        class: 'A definir'
      };
    });

    const existing = JSON.parse(localStorage.getItem('ecobuzios_students') || '[]');
    localStorage.setItem('ecobuzios_students', JSON.stringify([...existing, ...newStudents]));
    
    setTimeout(() => {
      setStudentCount(existing.length + 20);
      setIsSeeding(false);
      showSuccess("20 alunos de teste gerados com sucesso!");
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 font-medium">Bem-vindo à gestão centralizada EcoBúzios.</p>
        </div>
        <div className="flex gap-3">
          {studentCount < 5 && (
            <Button 
              variant="outline" 
              className="rounded-2xl gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold"
              onClick={seedTestData}
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Gerar Dados de Teste
            </Button>
          )}
          <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold border border-secondary/20">
            <Star className="h-4 w-4 fill-secondary" />
            Ano Letivo 2024
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-xl shadow-primary/5 bg-white rounded-[2rem]">
          <CardContent className="p-6">
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Alunos</p>
            <div className="text-3xl font-black text-primary">{studentCount}</div>
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