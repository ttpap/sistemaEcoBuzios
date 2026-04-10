"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ImageOff, Eye, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from 'react-router-dom';
import { StudentRegistration } from '@/types/student';
import { SchoolClass } from '@/types/class';
import StudentDetailsDialog from '@/components/StudentDetailsDialog';
import { showError } from '@/utils/toast';
import { readGlobalStudents, readScoped, writeGlobalStudents, writeScoped } from '@/utils/storage';
import { normalizeStudentRegistrations } from '@/utils/student-registration';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { fetchStudentsRemoteWithMeta } from "@/services/studentsService";
import { getActiveProjectId } from '@/utils/projects';
import { getCoordinatorSessionProjectId } from '@/utils/coordinator-auth';
import { getTeacherSessionProjectId } from '@/utils/teacher-auth';
import { fetchClassesRemoteWithMeta, fetchProjectEnrollmentsRemoteWithMeta } from '@/services/classesService';

const ImageAuthorization = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);

  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [enrollments, setEnrollments] = useState<Array<{ student_id: string; class_id: string }>>([]);
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

        if (!projectId) {
          setClasses(readScoped<SchoolClass[]>('classes', []));
          setStudents(readGlobalStudents<StudentRegistration[]>([]));
          setAllowedIds(new Set());
          return;
        }

        const classRes = await fetchClassesRemoteWithMeta(projectId);
        const baseClasses = classRes.classes.length ? classRes.classes : readScoped<SchoolClass[]>('classes', []);
        writeScoped('classes', baseClasses);
        setClasses(baseClasses);

        const enrRes = await fetchProjectEnrollmentsRemoteWithMeta(projectId);
        if (enrRes.issue === 'not_allowed') {
          showError('Acesso bloqueado: este usuário não está alocado neste projeto.');
        }
        const ids = new Set<string>();
        for (const e of enrRes.enrollments) ids.add(String(e.student_id));
        setAllowedIds(ids);
        setEnrollments(enrRes.enrollments as Array<{ student_id: string; class_id: string }>);

        const studentsRes = await fetchStudentsRemoteWithMeta(projectId);
        if (studentsRes.issue === 'not_allowed') {
          showError('Acesso bloqueado: este usuário não está alocado neste projeto.');
        }

        const remote = studentsRes.students;
        if (remote.length > 0) {
          const normalized = normalizeStudentRegistrations(remote);
          const finalList = normalized.changed ? normalized.students : remote;
          writeGlobalStudents(finalList);
          setStudents(finalList);
          return;
        }

        const saved = readGlobalStudents<StudentRegistration[]>([]);
        const normalized = normalizeStudentRegistrations(saved);
        setStudents(normalized.changed ? normalized.students : saved);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  // class_id → class name
  const classMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of classes) map[c.id] = c.name;
    return map;
  }, [classes]);

  // student_id → class name (via enrollments)
  const studentClassMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of enrollments) {
      const className = classMap[String(e.class_id)];
      if (className) map[String(e.student_id)] = className;
    }
    return map;
  }, [enrollments, classMap]);

  const filteredStudents = useMemo(() => {
    const inScope = students.filter((s) => allowedIds.has(String(s.id)));
    const notAuthorized = inScope.filter((s) => s.imageAuthorization === 'not_authorized');

    if (!searchTerm.trim()) return notAuthorized;
    const term = searchTerm.toLowerCase();
    return notAuthorized.filter((s) => {
      const full = (s.fullName || '').toLowerCase();
      const social = (s.socialName || '').toLowerCase();
      return full.includes(term) || social.includes(term);
    });
  }, [students, allowedIds, searchTerm]);

  const getStudentClass = (s: StudentRegistration) =>
    studentClassMap[String(s.id)] || '—';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <ImageOff className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Autorização de Imagem</h1>
            <p className="text-sm text-slate-500 font-medium">
              Alunos que <span className="font-black text-red-600">NÃO autorizaram</span> o uso de imagem e voz
            </p>
          </div>
        </div>
      </div>

      {/* Busca + contador */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-2xl border-slate-200"
          />
        </div>
        {!isLoading && (
          <span className="text-sm font-black text-red-600 bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'} sem autorização
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 font-bold text-sm">
            Carregando...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-14 w-14 rounded-3xl bg-emerald-50 flex items-center justify-center">
              <ImageOff className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-slate-500 font-black text-sm">
              {searchTerm ? 'Nenhum aluno encontrado para essa busca.' : 'Todos os alunos autorizaram o uso de imagem!'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-black text-slate-600 pl-6 w-16">Foto</TableHead>
                <TableHead className="font-black text-slate-600">Nome</TableHead>
                <TableHead className="font-black text-slate-600">Turma</TableHead>
                <TableHead className="font-black text-slate-600">Status</TableHead>
                <TableHead className="font-black text-slate-600 text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-slate-50/60">
                  {/* Foto */}
                  <TableCell className="pl-6">
                    <button
                      type="button"
                      className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden flex-shrink-0"
                      onClick={
                        student.photo
                          ? () => setPhotoZoom({ src: student.photo!, name: student.fullName })
                          : () => { setSelectedStudent(student); setIsDetailsOpen(true); }
                      }
                      title={student.photo ? 'Ampliar foto' : 'Ver ficha'}
                      style={student.photo ? { cursor: 'zoom-in' } : undefined}
                    >
                      {student.photo ? (
                        <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <GraduationCap className="h-6 w-6" />
                      )}
                    </button>
                  </TableCell>

                  {/* Nome completo + nome social */}
                  <TableCell>
                    <div className="font-black text-slate-900 leading-tight">
                      {student.fullName || '—'}
                    </div>
                    {student.socialName && (
                      <div className="text-xs font-medium text-slate-400 mt-0.5">
                        {student.socialName}
                      </div>
                    )}
                  </TableCell>

                  {/* Turma */}
                  <TableCell className="text-slate-600 font-medium">
                    {getStudentClass(student)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 text-red-700 text-xs font-black border border-red-100">
                      <ImageOff className="h-3 w-3" />
                      Não autorizado
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl hover:bg-slate-100"
                      title="Ver ficha do aluno"
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog de detalhes */}
      {selectedStudent && (
        <StudentDetailsDialog
          student={selectedStudent}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      {/* Zoom de foto */}
      {photoZoom && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPhotoZoom(null)}
        >
          <img
            src={photoZoom.src}
            alt={photoZoom.name}
            className="h-[90vh] w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-4 text-white text-lg font-bold drop-shadow">{photoZoom.name}</p>
          <p className="mt-1 text-white/60 text-sm">Clique fora para fechar</p>
        </div>
      )}
    </div>
  );
};

export default ImageAuthorization;
