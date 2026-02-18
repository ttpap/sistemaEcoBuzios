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
import { Plus, Search, MoreHorizontal, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Students = () => {
  const students = [
    { id: '1', name: 'Ana Silva', registration: '2024001', class: '9º Ano A', status: 'Ativo' },
    { id: '2', name: 'Bruno Costa', registration: '2024002', class: '8º Ano B', status: 'Ativo' },
    { id: '3', name: 'Carla Souza', registration: '2024003', class: '9º Ano A', status: 'Inativo' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alunos</h1>
          <p className="text-slate-500">Gerencie as matrículas e informações dos estudantes.</p>
        </div>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Novo Aluno
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar aluno por nome ou matrícula..." className="pl-10 rounded-xl border-slate-200" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    {student.name}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">{student.registration}</TableCell>
                <TableCell>{student.class}</TableCell>
                <TableCell>
                  <Badge variant={student.status === 'Ativo' ? 'default' : 'secondary'} className="rounded-full">
                    {student.status}
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

export default Students;