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
import { Plus, Search, GraduationCap, Eye, Edit2, Trash2 } from "lucide-react";
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
import { fetchStudentsRemoteWithMeta, deleteStudent, fetchStudents } from "@/services/studentsService";

import { getActiveProjectId } from '@/utils/projects';
import { getCoordinatorSessionProjectId } from '@/utils/coordinator-auth';
import { getTeacherSessionProjectId } from '@/utils/teacher-auth';
import { fetchClassesRemoteWithMeta, fetchProjectEnrollmentsRemoteWithMeta } from '@/services/classesService';

import { useAuth } from '@/context/AuthContext';

const Students = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const { profile } = useAuth();

  const effectiveRole = useMemo(() => {
    if (profile?.role) return profile.role;
    if (base === '/professor') return 'teacher';
    if (base === '/coordenador') return 'coordinator';
    return null;
  }, [profile?.role, base]);

  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allowedIds, setAllowedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [photoZoom, setPhotoZoom] = useState<{ src: string; name: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const projectId = getActiveProjectId()
          || getCoordinatorSessionProjectId()
          || getTeacherSessionProjectId();

        // Admin: lista global (todos os alunos do sistema), independente de projeto.
        if (effectiveRole === 'admin') {
          try {
            const remote = await fetchStudents();
            if (remote.length > 0) {
              const normalized = normalizeStudentRegistrations(remote);
              const finalList = normalized.changed ? normalized.students : remote;
              writeGlobalStudents(finalList);
              setStudents(finalList);
            } else {
              setStudents(readGlobalStudents<StudentRegistration[]>([]));
            }
          } catch {
            setStudents(readGlobalStudents<StudentRegistration[]>([]));
          }
          setClasses(projectId ? readScoped<SchoolClass[]>('classes', []) : []);
          setAllowedIds(new Set());
          return;
        }

        if (!projectId) {
          setClasses(readScoped<SchoolClass[]>('classes', []));
          setStudents(readGlobalStudents<StudentRegistration[]>([]));
          setAllowedIds(new Set());
          return;
        }

        // 1) Classes (RPC quando existir; senão SELECT)
        const classRes = await fetchClassesRemoteWithMeta(projectId);
        const baseClasses = classRes.classes.length ? classRes.classes : readScoped<SchoolClass[]>('classes', []);
        writeScoped('classes', baseClasses);
        setClasses(baseClasses);

        // 2) Vínculos aluno<->turma
        // Professor: só alunos das suas próprias turmas
        // Coordenador: todos os alunos do projeto
        const enrRes = await fetchProjectEnrollmentsRemoteWithMeta(projectId);
        if (enrRes.issue === 'not_allowed') {
          showError('Acesso bloqueado: este usuário não está alocado neste projeto.');
        }
        const ids = new Set<string>();
        if (effectiveRole === 'teacher') {
          const myClassIds = new Set(baseClasses.map((c) => c.id));
          for (const e of enrRes.enrollments) {
            if (myClassIds.has(e.class_id)) ids.add(String(e.student_id));
          }
        } else {
          for (const e of enrRes.enrollments) ids.add(String(e.student_id));
        }
        setAllowedIds(ids);

        // 3) Students
        const studentsRes = await fetchStudentsRemoteWithMeta(projectId);
        if (studentsRes.issue === 'not_allowed') {
          showError('Acesso bloqueado: este usuário não está alocado neste projeto.');
        }

        const remote = studentsRes.students;
        if (remote.length > 0) {
          const normalized = normalizeStudentRegistrations(remote);
          if (normalized.changed) {
            writeGlobalStudents(normalized.students);
            setStudents(normalized.students);
          } else {
            writeGlobalStudents(remote);
            setStudents(remote);
          }
          return;
        }

        const saved = readGlobalStudents<StudentRegistration[]>([]);
        const normalized = normalizeStudentRegistrations(saved);
        if (normalized.changed) {
          writeGlobalStudents(normalized.students);
          setStudents(normalized.students);
        } else {
          setStudents(saved);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [effectiveRole]);

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

  const visibleStudents = useMemo(() => {
    if (effectiveRole === 'admin') return students;

    // Enquanto ainda carregando, não filtra (evita piscar lista vazia)
    if (isLoading) return [];

    // Após carregar: filtra sempre por allowedIds para coord/professor
    // Se allowedIds vazio após carga = nenhum vínculo real → lista vazia (correto)
    if (effectiveRole) {
      return students.filter((s) => allowedIds.has(s.id));
    }

    return students;
  }, [students, allowedIds, effectiveRole, isLoading]);

  const visibleStudentsSorted = useMemo(() => {
    return [...visibleStudents].sort((a, b) =>
      (a.socialName || a.preferredName || a.fullName).localeCompare(
        b.socialName || b.preferredName || b.fullName,
        "pt-BR",
      ),
    );
  }, [visibleStudents]);

  const filtered = visibleStudentsSorted.filter(s =>
    (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Carregando alunos…
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="font-bold px-8 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
                      onClick={() => openDetails(student)}
                      title="Ver ficha do aluno"
                    >
                      <div
                        className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden flex-shrink-0"
                        onClick={student.photo ? (e) => { e.stopPropagation(); setPhotoZoom({ src: student.photo!, name: student.fullName }); } : undefined}
                        title={student.photo ? "Ampliar foto" : undefined}
                        style={student.photo ? { cursor: 'zoom-in' } : undefined}
                      >
                        {student.photo ? (
                          <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <GraduationCap className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-700 truncate underline-offset-2 hover:underline">{student.fullName}</div>
                        {(student.socialName || student.preferredName) && (
                          <div className="text-xs font-bold text-slate-400 truncate">
                            {student.socialName || student.preferredName}
                          </div>
                        )}
                      </div>
                    </button>
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
                      {effectiveRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(student.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {photoZoom && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPhotoZoom(null)}
        >
          <img
            src={photoZoom.src}
            alt={photoZoom.name}
            className="max-h-[75vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-4 text-white text-lg font-bold drop-shadow">{photoZoom.name}</p>
          <p className="mt-1 text-white/60 text-sm">Clique fora para fechar</p>
        </div>
      )}
    </div>
  );
};

export default Students;