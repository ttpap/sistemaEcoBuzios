"use client";

import React, { useEffect, useState } from 'react';
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
import { Plus, Search, GraduationCap, Eye, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StudentRegistration } from '@/types/student';
import StudentDetailsDialog from '@/components/StudentDetailsDialog';
import { showSuccess } from '@/utils/toast';

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ecobuzios_students') || '[]');
    
    // Migração de matrículas antigas para o novo padrão sequencial formatado (YYYY-XXXX)
    let changed = false;
    const migrated = saved.map((s: any, index: number) => {
      const needsMigration = !s.registration || !s.registration.includes('-') || s.registration.length < 9;
      
      if (needsMigration) {
        const year = new Date(s.registrationDate || Date.now()).getFullYear();
        // Se já tinha um número mas sem hífen, tenta preservar o final
        const lastDigits = s.registration ? s.registration.slice(-4) : (index + 1).toString().padStart(4, '0');
        const reg = `${year}-${lastDigits}`;
        changed = true;
        return { ...s, registration: reg };
      }
      return s;
    });

    if (changed) {
      localStorage.setItem('ecobuzios_students', JSON.stringify(migrated));
      setStudents(migrated);
    } else {
      setStudents(saved);
    }
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este aluno?")) {
      const updated = students.filter(s => s.id !== id);
      localStorage.setItem('ecobuzios_students', JSON.stringify(updated));
      setStudents(updated);
      showSuccess("Aluno removido com sucesso.");
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.registration?.includes(searchTerm)
  );

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
          <Input 
            placeholder="Buscar aluno por nome ou matrícula..." 
            className="pl-12 h-12 rounded-xl border-slate-100 bg-slate-50/50" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest px-8">Aluno</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Matrícula</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Idade</TableHead>
              <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest px-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="font-bold px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                        {student.photo ? (
                          <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <GraduationCap className="h-5 w-5" />
                        )}
                      </div>
                      <span className="text-slate-700">{student.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 font-black tracking-tighter">{student.registration}</TableCell>
                  <TableCell className="font-medium text-slate-600">{student.age} anos</TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-emerald-50 hover:text-emerald-600"
                        onClick={() => navigate(`/alunos/editar/${student.id}`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StudentDetailsDialog 
        student={selectedStudent} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </div>
  );
};

export default Students;