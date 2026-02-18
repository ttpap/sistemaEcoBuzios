"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Classes = () => {
  const classes = [
    { id: '1', name: '9º Ano A', teacher: 'Prof. Ricardo Oliveira', students: 32, room: 'Sala 102', period: 'Manhã' },
    { id: '2', name: '8º Ano B', teacher: 'Profa. Maria Helena', students: 28, room: 'Sala 105', period: 'Tarde' },
    { id: '3', name: '1º Ano Médio', teacher: 'Prof. João Pedro', students: 35, room: 'Auditório', period: 'Manhã' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Turmas</h1>
          <p className="text-slate-500">Organização das salas e horários escolares.</p>
        </div>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Nova Turma
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Card key={cls.id} className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group hover:shadow-md transition-all">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900">{cls.name}</CardTitle>
                <Badge className="rounded-full bg-primary/10 text-primary border-none">
                  {cls.period}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{cls.teacher}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <span>{cls.students} Alunos matriculados</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{cls.room}</span>
              </div>
              
              <Button variant="outline" className="w-full rounded-xl mt-2 group-hover:bg-primary group-hover:text-white transition-colors">
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Classes;