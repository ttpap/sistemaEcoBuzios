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
import { Plus, Search, Users, Edit2, Trash2, Eye, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { TeacherRegistration } from '@/types/teacher';
import { showSuccess } from '@/utils/toast';
import TeacherDetailsDialog from '@/components/TeacherDetailsDialog';
import { readScoped, writeScoped } from '@/utils/storage';

const Teachers = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRegistration | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const saved = readScoped<TeacherRegistration[]>('teachers', []);
    setTeachers(saved);
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este cadastro?")) {
      const updated = teachers.filter(t => t.id !== id);
      writeScoped('teachers', updated);
      setTeachers(updated);
      showSuccess("Cadastro removido com sucesso.");

    }
  };

  const filtered = teachers.filter(t => 
    t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cpf?.includes(searchTerm) ||
    t.cnpj?.includes(searchTerm) ||
    t.pixKey?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Professores</h1>
          <p className="text-slate-500 font-medium">Gestão de docentes e prestadores de serviço.</p>
        </div>
        <Button 
          className="rounded-2xl gap-2 h-12 px-6 font-bold shadow-lg shadow-primary/20"
          onClick={() => navigate('/professores/novo')}
        >
          <Plus className="h-5 w-5" />
          Novo Cadastro
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, documento ou chave PIX..." 
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
              <TableHead className="font-bold text-slate-400 uppercase text-xs tracking-widest px-8">Nome / Razão Social</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-xs tracking-widest">Documento</TableHead>
              <TableHead className="font-bold text-slate-400 uppercase text-xs tracking-widest">Chave PIX</TableHead>
              <TableHead className="text-right font-bold text-slate-400 uppercase text-xs tracking-widest px-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium">
                  Nenhum cadastro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((teacher) => (
                <TableRow key={teacher.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="font-bold px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                        {teacher.photo ? (
                          <img src={teacher.photo} alt={teacher.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>
                      <span className="text-slate-700">{teacher.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">{teacher.cpf || teacher.cnpj}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-100">
                      <CreditCard className="h-3 w-3" />
                      {teacher.pixKey}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-emerald-50 hover:text-emerald-600"
                        onClick={() => navigate(`/professores/editar/${teacher.id}`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(teacher.id)}
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

      <TeacherDetailsDialog 
        teacher={selectedTeacher} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </div>
  );
};

export default Teachers;