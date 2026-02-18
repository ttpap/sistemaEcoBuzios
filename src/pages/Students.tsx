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
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Students = () => {
  const navigate = useNavigate();
  const students = [
    { id: '1', name: 'Ana Silva', registration: '2024001', class: '9º Ano A', status: 'Ativo' },
    { id: '2', name: 'Bruno Costa', registration: '2024002', class: '8º Ano B', status: 'Ativo' },
    { id: '3', name: 'Carla Souza', registration: '2024003', class: '9º Ano A', status: 'Inativo' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Alunos</h1>
          <p className="text-slate-500 font-medium">Gerencie as matrículas e informações dos estudantes.</p>
        </div>
        <Button 
          className="rounded-2xl gap-2 h-12 px-6 font-bold shadow-lg shadow-primary/20"
          onClick={() => navigate('/alunos/novo')}
        >
          <Plus className="h-5 w-5" />
          Novo Aluno
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input placeholder="Buscar aluno por nome ou matrícula..." className="pl-12 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest px-8">Aluno</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Matrícula</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Turma</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest px-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                <TableCell className="font-bold px-8 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="text-slate-700">{student.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 font-medium">{student.registration}</TableCell>
                <TableCell className="font-medium text-slate-600">{student.class}</TableCell>
                <TableCell>
                  <Badge 
                    variant={student.status === 'Ativo' ? 'default' : 'secondary'} 
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                      student.status === 'Ativo' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-8">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
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