"use client";

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Teachers = () => {
  const teachers = [
    { id: '1', name: 'Prof. Ricardo Oliveira', email: 'ricardo@escola.com', subject: 'Matemática', status: 'Ativo' },
    { id: '2', name: 'Profa. Maria Helena', email: 'maria@escola.com', subject: 'Português', status: 'Ativo' },
    { id: '3', name: 'Prof. João Pedro', email: 'joao@escola.com', subject: 'História', status: 'Inativo' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Professores</h1>
          <p className="text-slate-500">Gerencie o corpo docente e suas disciplinas.</p>
        </div>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Novo Professor
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar professor por nome ou disciplina..." className="pl-10 rounded-xl border-slate-200" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Users className="h-4 w-4" />
                    </div>
                    {teacher.name}
                  </div>
                </TableCell>
                <TableCell>{teacher.subject}</TableCell>
                <TableCell className="text-slate-500">{teacher.email}</TableCell>
                <TableCell>
                  <Badge variant={teacher.status === 'Ativo' ? 'default' : 'secondary'} className="rounded-full">
                    {teacher.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Teachers;