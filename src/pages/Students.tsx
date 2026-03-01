"use client";

import React, { useEffect, useMemo, useState } from 'react';

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
import { Plus, Search, GraduationCap, Eye, Edit2, Trash2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StudentRegistration } from '@/types/student';
import { SchoolClass } from '@/types/class';

import StudentDetailsDialog from '@/components/StudentDetailsDialog';
import { showError, showSuccess } from '@/utils/toast';
import { readGlobalStudents, readScoped, writeGlobalStudents, writeScoped } from '@/utils/storage';
import { normalizeStudentRegistrations } from '@/utils/student-registration';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { fetchStudents, deleteStudent } from "@/integrations/supabase/students";
import { getActiveProjectId } from '@/utils/projects';
import { fetchClassesRemote } from '@/integrations/supabase/classes';
import { useAuth } from '@/context/AuthContext';

const Students = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const { profile } = useAuth();

  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      // Carrega turmas do projeto (necessário para filtrar alunos por projeto)
      const projectId = getActiveProjectId();
      if (projectId) {
        const remoteClasses = await fetchClassesRemote(projectId);
        if (remoteClasses.length) {
          writeScoped('classes', remoteClasses);
          setClasses(remoteClasses);
        } else {
          setClasses(readScoped<SchoolClass[]>('classes', []));
        }
      } else {
        setClasses(readScoped<SchoolClass[]>('classes', []));
      }

      const remote = await fetchStudents();
      if (remote.length > 0) {
        // Fonte de verdade: Supabase. Mantém cache local para o restante do app que ainda não migrou.
        const normalized = normalizeStudentRegistrations(remote);
        if (normalized.changed) {
          // Não regrava no Supabase aqui para evitar alterar matrículas existentes sem confirmação.
          writeGlobalStudents(normalized.students);
          setStudents(normalized.students);
        } else {
          writeGlobalStudents(remote);
          setStudents(remote);
        }
        return;
      }

      // Fallback (legado)
      const saved = readGlobalStudents<StudentRegistration[]>([]);
      const normalized = normalizeStudentRegistrations(saved);
      if (normalized.changed) {
        writeGlobalStudents(normalized.students);
        setStudents(normalized.students);
      } else {
        setStudents(saved);
      }
    };

    void run();
  }, []);

  const handleDelete = (id: string) => {
    const run = async () => {
      if (!window.confirm("Tem certeza que deseja excluir este aluno?")) return;

      try {
        await deleteStudent(id);
      } catch (e: any) {
        showError(e?.message || "Não foi possível excluir no Supabase.");
        return;
      }

      const updated = students.filter(s => s.id !== id);
      writeGlobalStudents(updated);

      setStudents(updated);
      showSuccess("Aluno removido com sucesso.");
    };

    void run();
  };

  const seedTestStudents = () => {
    const existing = readGlobalStudents<StudentRegistration[]>([]);

    if (existing.length > 0) {
      const ok = window.confirm(
        `Já existem ${existing.length} aluno(s) cadastrados.\n\nDeseja SUBSTITUIR pelos 10 alunos de teste?`
      );
      if (!ok) return;
    }

    const makeId = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = typeof crypto !== "undefined" ? crypto : null;
      return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const today = new Date();
    const year = today.getFullYear();
    const registrationDate = today.toISOString();

    const base = {
      emailDomain: "@email.com",
      schoolType: "Pública",
      schoolName: "Escola Municipal Eco Búzios",
      cep: "28950-000",
      street: "Rua das Palmeiras",
      neighborhood: "Centro",
      city: "Armação dos Búzios",
      uf: "RJ",
      imageAuthorization: "Autorizado",
      docsDelivered: ["Certidão de Nascimento", "CPF"],
      status: "Ativo",
      class: "",
      healthProblems: [] as string[],
    };

    const samples: Array<Pick<StudentRegistration, "fullName" | "birthDate" | "age" | "cellPhone" | "gender" | "race"> & Partial<StudentRegistration>> = [
      { fullName: "Ana Luiza Cardoso", birthDate: "2012-03-18", age: 13, cellPhone: "(22) 99911-2233", gender: "Feminino", race: "Parda", preferredName: "Ana Lu" },
      { fullName: "Bruno Henrique Souza", birthDate: "2011-11-02", age: 14, cellPhone: "(22) 98877-6655", gender: "Masculino", race: "Branca" },
      { fullName: "Camila Fernandes Lima", birthDate: "2013-07-29", age: 12, cellPhone: "(22) 99770-1122", gender: "Feminino", race: "Preta" },
      { fullName: "Diego Matheus Ribeiro", birthDate: "2010-01-14", age: 16, cellPhone: "(22) 99661-4433", gender: "Masculino", race: "Parda" },
      { fullName: "Eduarda Martins Almeida", birthDate: "2014-09-06", age: 11, cellPhone: "(22) 99123-4567", gender: "Feminino", race: "Amarela" },
      { fullName: "Felipe Augusto Nascimento", birthDate: "2012-05-21", age: 13, cellPhone: "(22) 99988-7766", gender: "Masculino", race: "Parda" },
      { fullName: "Gabriela Rocha Santos", birthDate: "2011-04-10", age: 14, cellPhone: "(22) 99333-2211", gender: "Feminino", race: "Branca" },
      { fullName: "Hugo Vinícius Pereira", birthDate: "2013-12-19", age: 12, cellPhone: "(22) 99222-1100", gender: "Masculino", race: "Indígena" },
      { fullName: "Isabela Costa Oliveira", birthDate: "2010-08-03", age: 15, cellPhone: "(22) 99555-7788", gender: "Feminino", race: "Parda" },
      { fullName: "João Pedro Silva", birthDate: "2014-02-25", age: 11, cellPhone: "(22) 99444-5566", gender: "Masculino", race: "Preta" },
    ];

    const seeded: StudentRegistration[] = samples.map((s, index) => {
      const n = (index + 1).toString().padStart(4, '0');
      return {
        // Required
        id: makeId(),
        registration: `${year}-${n}`,
        registrationDate,
        fullName: s.fullName,
        birthDate: s.birthDate,
        age: s.age,
        phone: "(22) 0000-0000",
        cellPhone: s.cellPhone,
        gender: s.gender,
        race: s.race,
        status: "Ativo",

        // Optional-ish (depends on schema)
        preferredName: s.preferredName,
        email: `${s.fullName.split(' ')[0].toLowerCase()}${index + 1}${base.emailDomain}`,
        cpf: "",

        // Address
        cep: base.cep,
        street: base.street,
        number: String(100 + index),
        complement: "",
        neighborhood: base.neighborhood,
        city: base.city,
        uf: base.uf,

        // School
        schoolType: base.schoolType as any,
        schoolName: base.schoolName,
        schoolOther: "",
        class: "",

        // Health / Docs
        healthProblems: base.healthProblems,
        imageAuthorization: base.imageAuthorization as any,
        docsDelivered: base.docsDelivered as any,

        // Contacts
        guardianName: "",
        guardianKinship: "",
        guardianPhone: "",
      } as StudentRegistration;
    });

    writeGlobalStudents(seeded);

    setStudents(seeded);
    showSuccess("10 alunos de teste criados!");
  };

  const allowedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);
    return ids;
  }, [classes]);

  const visibleStudents = useMemo(() => {
    // Admin vê todos os alunos
    if (profile?.role === 'admin') return students;

    // Professor/Coordenador: dentro do projeto, só aparecem alunos vinculados a turmas do projeto
    return students.filter((s) => allowedStudentIds.has(s.id));
  }, [students, allowedStudentIds, profile?.role]);

  const filtered = visibleStudents.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.registration || "").includes(searchTerm)
  );

  const openDetails = (student: StudentRegistration) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Alunos</h1>
          <p className="text-slate-500 font-medium">Cadastros e fichas de inscrição.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="rounded-2xl gap-2 h-12 px-5 font-black border-slate-200 bg-white hover:bg-slate-50"
            onClick={seedTestStudents}
          >
            <Sparkles className="h-5 w-5 text-secondary" />
            Criar 10 alunos (teste)
          </Button>
          <Button
            className="rounded-2xl gap-2 h-12 px-6 font-bold shadow-lg shadow-primary/20"
            onClick={() => navigate(`${base}/alunos/novo`) }
          >
            <Plus className="h-5 w-5" />
            Novo Aluno
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou matrícula..."
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
              <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest px-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
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
                      <div className="min-w-0">
                        <div className="text-slate-700 truncate">{student.fullName}</div>
                        {(student.socialName || student.preferredName) && (
                          <div className="text-xs font-bold text-slate-400 truncate">
                            {student.socialName || student.preferredName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">{student.registration}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-full border-none font-black px-3",
                      student.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10"
                        onClick={() => openDetails(student)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10"
                        onClick={() => navigate(`${base}/alunos/editar/${student.id}`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
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
    </div>
  );
};

export default Students;