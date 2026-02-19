"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Users, GraduationCap, Info, Plus, Trash2, 
  Save, Search, UserPlus, BookOpen, Clock
} from 'lucide-react';
import { SchoolClass } from '@/types/class';
import { TeacherRegistration } from '@/types/teacher';
import { StudentRegistration } from '@/types/student';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [allTeachers, setAllTeachers] = useState<TeacherRegistration[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRegistration[]>([]);
  const [info, setInfo] = useState("");

  useEffect(() => {
    const classes = JSON.parse(localStorage.getItem('ecobuzios_classes') || '[]');
    const found = classes.find((c: any) => c.id === id);
    if (found) {
      setSchoolClass(found);
      setInfo(found.complementaryInfo || "");
    } else {
      navigate('/turmas');
    }

    setAllTeachers(JSON.parse(localStorage.getItem('ecobuzios_teachers') || '[]'));
    setAllStudents(JSON.parse(localStorage.getItem('ecobuzios_students') || '[]'));
  }, [id, navigate]);

  const saveClass = (updatedClass: SchoolClass) => {
    const classes = JSON.parse(localStorage.getItem('ecobuzios_classes') || '[]');
    const newClasses = classes.map((c: any) => c.id === id ? updatedClass : c);
    localStorage.setItem('ecobuzios_classes', JSON.stringify(newClasses));
    setSchoolClass(updatedClass);
  };

  const addTeacher = (teacherId: string) => {
    if (!schoolClass) return;
    const currentIds = schoolClass.teacherIds || [];
    if (currentIds.includes(teacherId)) return;
    
    const updated = { ...schoolClass, teacherIds: [...currentIds, teacherId] };
    saveClass(updated);
    showSuccess("Professor vinculado!");
  };

  const removeTeacher = (teacherId: string) => {
    if (!schoolClass) return;
    const updated = { 
      ...schoolClass, 
      teacherIds: (schoolClass.teacherIds || []).filter(tid => tid !== teacherId) 
    };
    saveClass(updated);
  };

  const addStudent = (studentId: string) => {
    if (!schoolClass) return;
    const currentIds = schoolClass.studentIds || [];
    if (currentIds.includes(studentId)) return;
    
    const updated = { ...schoolClass, studentIds: [...currentIds, studentId] };
    saveClass(updated);
    showSuccess("Aluno matriculado!");
  };

  const removeStudent = (studentId: string) => {
    if (!schoolClass) return;
    const updated = { 
      ...schoolClass, 
      studentIds: (schoolClass.studentIds || []).filter(sid => sid !== studentId) 
    };
    saveClass(updated);
  };

  const saveInfo = () => {
    if (!schoolClass) return;
    saveClass({ ...schoolClass, complementaryInfo: info });
    showSuccess("Informações salvas!");
  };

  if (!schoolClass) return null;

  const classTeachers = allTeachers.filter(t => schoolClass.teacherIds?.includes(t.id));
  const classStudents = allStudents.filter(s => schoolClass.studentIds?.includes(s.id));

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl bg-white shadow-sm border border-slate-100"
            onClick={() => navigate('/turmas')}
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

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gestão de Professores */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
              <Users className="h-5 w-5" /> Professores
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Vincular</Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem]">
                <DialogHeader><DialogTitle>Vincular Professor</DialogTitle></DialogHeader>
                <div className="space-y-2 mt-4">
                  {allTeachers.filter(t => !schoolClass.teacherIds?.includes(t.id)).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-sm">{t.fullName}</span>
                      <Button size="sm" variant="ghost" onClick={() => addTeacher(t.id)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeTeacher(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gestão de Alunos */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Alunos ({classStudents.length})
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gap-2"><UserPlus className="h-4 w-4" /> Matricular</Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Matricular Aluno</DialogTitle></DialogHeader>
                <div className="space-y-2 mt-4">
                  {allStudents.filter(s => !schoolClass.studentIds?.includes(s.id)).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{s.fullName}</span>
                        <span className="text-[10px] text-slate-400">Matrícula: {s.registration}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => addStudent(s.id)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="space-y-3">
              {classStudents.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Nenhum aluno matriculado.</p>
              ) : (
                classStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {s.fullName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{s.fullName}</span>
                        <span className="text-[10px] text-slate-400">Matrícula: {s.registration}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeStudent(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações Complementares */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] lg:col-span-2">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
              <Info className="h-5 w-5" /> Informações Complementares
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <Textarea 
              placeholder="Digite aqui observações, avisos ou detalhes específicos desta turma..."
              className="min-h-[150px] rounded-[1.5rem] bg-slate-50 border-slate-100 focus:bg-white transition-all"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
            />
            <div className="flex justify-end">
              <Button className="rounded-xl gap-2 font-bold" onClick={saveInfo}>
                <Save className="h-4 w-4" /> Salvar Informações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassDetails;