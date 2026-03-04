"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Users, GraduationCap, Info, Plus, Trash2,
  Save, Search, UserPlus, BookOpen, Clock, X, Eye, ClipboardCheck
} from 'lucide-react';
import { SchoolClass } from '@/types/class';
import { TeacherRegistration } from '@/types/teacher';
import { StudentRegistration } from '@/types/student';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import StudentDetailsDialog from '@/components/StudentDetailsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClassAttendance from '@/components/ClassAttendance';
import { enrollStudent, ensureStudentEnrollments, removeStudentEnrollment } from '@/utils/class-enrollment';
import { readGlobalStudents, readScoped, writeScoped } from '@/utils/storage';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { getActiveProjectId } from '@/utils/projects';
import {
  enrollStudentRemote,
  fetchClassTeacherIdsRemote,
  fetchEnrollmentsRemoteWithMeta,
  removeStudentEnrollmentRemote,
  setClassTeacherIdsRemote,
} from '@/integrations/supabase/classes';
import { readGlobalTeachers } from "@/utils/teachers";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import { fetchStudentsRemote } from "@/integrations/supabase/students";

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacherArea = location.pathname.startsWith('/professor');
  const base = getAreaBaseFromPathname(location.pathname);

  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [allTeachers, setAllTeachers] = useState<TeacherRegistration[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRegistration[]>([]);
  const [info, setInfo] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      const classes = readScoped<SchoolClass[]>('classes', []);
      const found = classes.find((c: any) => c.id === id);
      if (!found) {
        navigate(`${base}/turmas`);
        return;
      }

      const localNormalized = ensureStudentEnrollments(found);

      try {
        const [teacherIds, enrollmentsRes] = await Promise.all([
          fetchClassTeacherIdsRemote(found.id),
          fetchEnrollmentsRemoteWithMeta(found.id),
        ]);

        // Importante: quando o RLS bloqueia, às vezes a lista vem vazia SEM erro.
        // Só confiamos no "vazio" quando conseguimos listar via RPC do modo B
        // (ou quando veio preenchido pela query normal).
        const canTrustRemoteEnrollments = !enrollmentsRes.issue;

        const enrollments = canTrustRemoteEnrollments
          ? enrollmentsRes.enrollments
          : (localNormalized.studentEnrollments || []).map((e) => ({
              class_id: found.id,
              student_id: e.studentId,
              enrolled_at: e.enrolledAt,
              removed_at: e.removedAt ?? null,
            }));

        const activeStudentIds = enrollments.filter((e) => !e.removed_at).map((e) => e.student_id);
        const studentEnrollments = enrollments.map((e) => ({
          studentId: e.student_id,
          enrolledAt: e.enrolled_at,
          ...(e.removed_at ? { removedAt: e.removed_at } : null),
        }));

        const merged: SchoolClass = {
          ...localNormalized,
          teacherIds,
          studentIds: activeStudentIds,
          studentEnrollments,
        };

        const normalized = ensureStudentEnrollments(merged);
        const newClasses = classes.map((c: any) => (c.id === id ? normalized : c));
        writeScoped('classes', newClasses);

        setSchoolClass(normalized);
        setInfo(normalized.complementaryInfo || "");
      } catch {
        const normalized = ensureStudentEnrollments(localNormalized);
        if (!found.studentEnrollments) {
          const newClasses = classes.map((c: any) => (c.id === id ? normalized : c));
          writeScoped('classes', newClasses);
        }
        setSchoolClass(normalized);
        setInfo(normalized.complementaryInfo || "");
      }

      // Professores: preferir Supabase (fonte da verdade). Se não houver, cair para storage.
      try {
        const remoteTeachers = await fetchTeachers();
        if (remoteTeachers.length) {
          setAllTeachers(remoteTeachers);
        } else {
          setAllTeachers(
            readScoped<TeacherRegistration[]>('teachers', []).length
              ? readScoped<TeacherRegistration[]>('teachers', [])
              : readGlobalTeachers([])
          );
        }
      } catch {
        const scoped = readScoped<TeacherRegistration[]>('teachers', []);
        setAllTeachers(scoped.length ? scoped : readGlobalTeachers([]));
      }

      // Alunos: no professor, buscar do Supabase (com fallback modo B) para não depender do storage local.
      const projectId = getActiveProjectId();
      if (projectId) {
        try {
          const remoteStudents = await fetchStudentsRemote(projectId);
          if (remoteStudents.length) {
            setAllStudents(remoteStudents);
            return;
          }
        } catch {
          // fallback abaixo
        }
      }

      setAllStudents(readGlobalStudents<StudentRegistration[]>([]));
    };

    void run();

  }, [id, navigate, base]);

  const saveClass = (updatedClass: SchoolClass) => {
    const run = async () => {
      const classes = readScoped<SchoolClass[]>('classes', []);
      const newClasses = classes.map((c: any) => (c.id === id ? updatedClass : c));
      writeScoped('classes', newClasses);
      setSchoolClass(updatedClass);

      try {
        await setClassTeacherIdsRemote(updatedClass.id, updatedClass.teacherIds || []);
      } catch (e: any) {
        showError(e?.message || "Não foi possível salvar o vínculo do professor nesta turma.");
      }
    };

    void run();
  };

  const addTeacher = (teacherId: string) => {
    if (isTeacherArea) return;
    if (!schoolClass) return;
    const currentIds = schoolClass.teacherIds || [];
    if (currentIds.includes(teacherId)) return;

    const updated = { ...schoolClass, teacherIds: [...currentIds, teacherId] };
    saveClass(updated);
    showSuccess("Professor vinculado!");
  };

  const removeTeacher = (teacherId: string) => {
    if (isTeacherArea) return;
    if (!schoolClass) return;
    const updated = {
      ...schoolClass,
      teacherIds: (schoolClass.teacherIds || []).filter(tid => tid !== teacherId)
    };
    saveClass(updated);
  };

  const addStudent = (studentId: string) => {
    const run = async () => {
      if (!schoolClass) return;

      try {
        await enrollStudentRemote(schoolClass.id, studentId);
      } catch (e: any) {
        showError(e?.message || "Não foi possível sincronizar a matrícula no servidor. Ela ficará salva só neste dispositivo.");
      }

      const updated = enrollStudent(schoolClass, studentId);
      saveClass(updated);
      showSuccess("Aluno matriculado!");
    };

    void run();
  };

  const removeStudent = (studentId: string) => {
    const run = async () => {
      if (!schoolClass) return;

      try {
        await removeStudentEnrollmentRemote(schoolClass.id, studentId);
      } catch (e: any) {
        showError(e?.message || "Não foi possível sincronizar a remoção no servidor. Ela ficará salva só neste dispositivo.");
      }

      const updated = removeStudentEnrollment(schoolClass, studentId);
      saveClass(updated);
    };

    void run();
  };

  const openStudentDetails = (student: StudentRegistration) => {
    setSelectedStudent(student);
    setIsStudentDetailsOpen(true);
  };

  const saveInfo = () => {
    if (!schoolClass) return;
    saveClass({ ...schoolClass, complementaryInfo: info });
    showSuccess("Informações salvas!");
  };

  if (!schoolClass) return null;

  const classTeachers = allTeachers.filter(t => schoolClass.teacherIds?.includes(t.id));
  const classStudents = allStudents.filter(s => schoolClass.studentIds?.includes(s.id));

  // LÓGICA DE FILTRAGEM DINÂMICA (Executada a cada renderização)
  const enrolledIds = schoolClass.studentIds || [];
  const searchNormalized = studentSearch.toLowerCase().trim();

  const filteredAvailableStudents = allStudents.filter(student => {
    // 1. Remove quem já está na turma
    const isNotEnrolled = !enrolledIds.includes(student.id);
    if (!isNotEnrolled) return false;

    // 2. Se não houver busca, mostra todos os disponíveis
    if (!searchNormalized) return true;

    // 3. Filtra por nome ou matrícula
    const nameMatch = student.fullName.toLowerCase().includes(searchNormalized);
    const regMatch = student.registration?.toLowerCase().includes(searchNormalized);

    return nameMatch || regMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl bg-white shadow-sm border border-slate-100"
            onClick={() => navigate(`${base}/turmas`) }
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight">{schoolClass.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-secondary text-primary font-black border-none">{schoolClass.period}</Badge>
              <span className="text-slate-400 text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> {schoolClass.startTime} - {schoolClass.endTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start gap-2 rounded-[1.5rem] bg-white p-2 border border-slate-100 overflow-x-auto">
          <TabsTrigger value="geral" className="rounded-xl font-black">Geral</TabsTrigger>
          <TabsTrigger value="chamada" className="rounded-xl font-black">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Chamada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Gestão de Professores */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                  <Users className="h-5 w-5" /> Professores
                </CardTitle>

                {isTeacherArea ? (
                  <Badge className="rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-black">
                    Somente admin
                  </Badge>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" /> Vincular
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                      <DialogHeader><DialogTitle>Vincular Professor</DialogTitle></DialogHeader>
                      <div className="space-y-2 mt-4">
                        {allTeachers.filter(t => !schoolClass.teacherIds?.includes(t.id)).map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="font-bold text-sm">{t.fullName}</span>
                            <Button size="sm" variant="ghost" onClick={() => addTeacher(t.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="space-y-3">
                  {classTeachers.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Nenhum professor vinculado.</p>
                  ) : (
                    classTeachers.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {t.fullName.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-700">{t.fullName}</span>
                        </div>

                        {!isTeacherArea && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeTeacher(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isTeacherArea && (
                  <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white p-4 text-xs font-bold text-slate-600">
                    Para vincular/remover professores nesta turma, solicite ao administrador.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gestão de Alunos */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" /> Alunos ({classStudents.length})
                </CardTitle>
                <Dialog onOpenChange={(open) => {
                  if (!open) setStudentSearch("");
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl gap-2"><UserPlus className="h-4 w-4" /> Matricular</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2rem] max-h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-4">
                      <DialogTitle className="text-xl font-black text-primary">Matricular Aluno</DialogTitle>
                      <div className="relative mt-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          placeholder="Digite nome ou matrícula (ex: 2026-0001)..." 
                          className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-base font-medium"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          autoFocus
                        />
                        {studentSearch && (
                          <button 
                            onClick={() => setStudentSearch("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-3">
                      {filteredAvailableStudents.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                          <Search className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-bold">
                            {studentSearch ? "Nenhum aluno encontrado para esta busca." : "Todos os alunos já estão matriculados."}
                          </p>
                        </div>
                      ) : (
                        filteredAvailableStudents.map(student => (
                          <div key={student.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center font-black text-primary shrink-0 overflow-hidden">
                                {student.photo ? (
                                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{student.fullName.charAt(0)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-slate-800 truncate">{student.fullName}</p>
                                <p className="text-xs font-bold text-slate-500">Matrícula: {student.registration}</p>
                              </div>
                            </div>
                            <Button size="sm" className="rounded-xl" onClick={() => addStudent(student.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="space-y-4">
                  {classStudents.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Nenhum aluno matriculado.</p>
                  ) : (
                    classStudents.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 overflow-hidden">
                            {s.photo ? (
                              <img src={s.photo} alt={s.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{s.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-700 truncate">{s.fullName}</p>
                            <p className="text-xs font-bold text-slate-500">{s.registration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl hover:bg-primary/10 hover:text-primary"
                            onClick={() => openStudentDetails(s)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeStudent(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Card className="mt-6 border-none shadow-sm rounded-[2rem] bg-white">
                  <CardHeader className="p-6 pb-3">
                    <CardTitle className="text-sm font-black text-primary flex items-center gap-2">
                      <Info className="h-4 w-4" /> Informações Complementares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-3">
                    <Textarea value={info} onChange={(e) => setInfo(e.target.value)} className="rounded-2xl" placeholder="Observações sobre a turma..." />
                    <Button onClick={saveInfo} className="rounded-2xl font-black">
                      <Save className="h-4 w-4 mr-2" /> Salvar Informações
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chamada" className="mt-8">
          <ClassAttendance classId={schoolClass.id} students={classStudents} />
        </TabsContent>
      </Tabs>

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isStudentDetailsOpen}
        onClose={() => setIsStudentDetailsOpen(false)}
      />
    </div>
  );
};

export default ClassDetails;