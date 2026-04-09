"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Users, GraduationCap, ClipboardCheck,
  ChevronLeft, Layers, UserPlus, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassAttendance from "@/components/ClassAttendance";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import type { StudentRegistration } from "@/types/student";
import { showError, showSuccess } from "@/utils/toast";
import {
  upsertClassRemote,
  deleteClassRemote,
  fetchNucleosRemote,
  fetchClassTeacherIdsRemote,
  setClassTeacherIdsRemote,
  fetchEnrollmentsRemoteWithMeta,
  enrollStudentRemote,
  removeStudentEnrollmentRemote,
} from "@/services/classesService";

type Props = {
  parentClass: SchoolClass;
  projectId: string;
  allTeachers: TeacherRegistration[];
  parentStudents: StudentRegistration[]; // alunos já matriculados na turma-mãe
  projectStudents?: StudentRegistration[]; // todos os alunos do projeto (para matrícula no núcleo)
  isTeacherArea: boolean;
};

function makeId() {
  try {
    // @ts-ignore
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const NucleosTab: React.FC<Props> = ({
  parentClass, projectId, allTeachers, parentStudents, projectStudents, isTeacherArea,
}) => {
  const [nucleos, setNucleos] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const selected = useMemo(
    () => nucleos.find((n) => n.id === selectedId) || null,
    [nucleos, selectedId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNucleosRemote(parentClass.id);
      setNucleos(list);
    } finally {
      setLoading(false);
    }
  }, [parentClass.id]);

  useEffect(() => { void reload(); }, [reload]);

  // Carrega professores/alunos do núcleo selecionado
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const run = async () => {
      setDetailLoading(true);
      try {
        const [tids, enr] = await Promise.all([
          fetchClassTeacherIdsRemote(selectedId),
          fetchEnrollmentsRemoteWithMeta(selectedId),
        ]);
        if (cancelled) return;
        setTeacherIds(tids);
        setStudentIds(enr.enrollments.filter((e) => !e.removed_at).map((e) => e.student_id));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [selectedId]);

  const createNucleo = async () => {
    const name = newName.trim();
    if (!name) {
      showError("Informe um nome/tema para o núcleo.");
      return;
    }
    setSaving(true);
    try {
      const novo: SchoolClass = {
        id: makeId(),
        name,
        period: parentClass.period,
        startTime: parentClass.startTime,
        endTime: parentClass.endTime,
        capacity: parentClass.capacity,
        absenceLimit: parentClass.absenceLimit,
        registrationDate: new Date().toISOString(),
        status: "Ativo",
        complementaryInfo: "",
        parentClassId: parentClass.id,
      };
      await upsertClassRemote(projectId, novo);
      // Herda automaticamente os professores da turma-mãe
      try {
        const inherited = parentClass.teacherIds || [];
        if (inherited.length > 0) {
          await setClassTeacherIdsRemote(novo.id, inherited);
        }
      } catch {
        // silencioso — núcleo já foi criado
      }
      showSuccess("Núcleo criado!");
      setCreateOpen(false);
      setNewName("");
      await reload();
    } catch (e: any) {
      showError(e?.message || "Não foi possível criar o núcleo.");
    } finally {
      setSaving(false);
    }
  };

  const removeNucleo = async (n: SchoolClass) => {
    if (!window.confirm(`Excluir o núcleo "${n.name}"?`)) return;
    try {
      await deleteClassRemote(n.id);
      showSuccess("Núcleo excluído.");
      if (selectedId === n.id) setSelectedId(null);
      await reload();
    } catch (e: any) {
      showError(e?.message || "Não foi possível excluir o núcleo.");
    }
  };

  const addStudentToNucleo = async (studentId: string) => {
    if (!selected) return;
    try {
      await enrollStudentRemote(selected.id, studentId);
      setStudentIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
      showSuccess("Aluno adicionado ao núcleo!");
    } catch (e: any) {
      showError(e?.message || "Não foi possível matricular o aluno no núcleo.");
    }
  };

  const removeStudentFromNucleo = async (studentId: string) => {
    if (!selected) return;
    try {
      await removeStudentEnrollmentRemote(selected.id, studentId);
      setStudentIds((prev) => prev.filter((x) => x !== studentId));
    } catch (e: any) {
      showError(e?.message || "Não foi possível remover o aluno do núcleo.");
    }
  };

  // Base de alunos: projeto inteiro (fallback para parentStudents se não vier a prop)
  const projectPool = projectStudents && projectStudents.length > 0 ? projectStudents : parentStudents;

  const nucleoStudents = useMemo(() => {
    const set = new Set(studentIds);
    return projectPool
      .filter((s) => set.has(s.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [projectPool, studentIds]);

  const availableStudents = useMemo(() => {
    const enrolled = new Set(studentIds);
    const q = studentSearch.toLowerCase();
    return projectPool
      .filter((s) => !enrolled.has(s.id))
      .filter((s) =>
        !q
        || (s.fullName || "").toLowerCase().includes(q)
        || (s.registration || "").includes(studentSearch),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [projectPool, studentIds, studentSearch]);

  // ---------- UI ----------

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
              className="rounded-xl bg-white shadow-sm border border-slate-100"
              onClick={() => setSelectedId(null)}
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <Badge className="bg-secondary text-primary font-black border-none">Núcleo</Badge>
              </div>
              <h2 className="text-2xl font-black text-primary tracking-tight">{selected.name}</h2>
              <p className="text-slate-500 text-sm font-medium">
                Capacidade herdada: {selected.capacity > 0 ? `${selected.capacity} vagas` : "ilimitada"}
              </p>
            </div>
          </div>
          {!isTeacherArea && (
            <Button
              variant="ghost" size="icon"
              className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 bg-white shadow-sm"
              onClick={() => removeNucleo(selected)}
              title="Excluir núcleo"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full justify-start gap-2 rounded-[1.5rem] bg-white p-2 border border-slate-100 overflow-x-auto">
            <TabsTrigger value="geral" className="rounded-xl font-black">Geral</TabsTrigger>
            <TabsTrigger value="chamada" className="rounded-xl font-black">
              <ClipboardCheck className="h-4 w-4 mr-2" /> Chamada
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Professores (herdados da turma-mãe, somente leitura) */}
              <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                    <Users className="h-5 w-5" /> Professores
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Herdados da turma-mãe — gerencie pela turma principal.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {detailLoading ? (
                    <p className="text-slate-400 text-sm italic">Carregando...</p>
                  ) : teacherIds.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Nenhum professor vinculado à turma-mãe.</p>
                  ) : (
                    allTeachers
                      .filter((t) => teacherIds.includes(t.id))
                      .map((t) => (
                        <div key={t.id} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="font-bold text-slate-700">{t.fullName}</span>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* Alunos */}
              <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
                <CardHeader className="flex flex-row items-center justify-between p-6 pb-3">
                  <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" /> Alunos ({nucleoStudents.length})
                  </CardTitle>
                  <Dialog onOpenChange={(o) => { if (!o) setStudentSearch(""); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl gap-2">
                        <UserPlus className="h-4 w-4" /> Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] max-h-[85vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="p-6 pb-3">
                        <DialogTitle className="text-lg font-black text-primary">
                          Adicionar aluno ao núcleo
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Todos os alunos do projeto — inclusive de outras turmas.
                        </p>
                        <div className="relative mt-4">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input
                            placeholder="Nome ou matrícula..."
                            className="pl-12 h-12 rounded-2xl bg-slate-50"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            autoFocus
                          />
                          {studentSearch && (
                            <button
                              onClick={() => setStudentSearch("")}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2">
                        {availableStudents.length === 0 ? (
                          <p className="text-slate-400 text-sm italic text-center py-8">
                            Nenhum aluno disponível.
                          </p>
                        ) : (
                          availableStudents.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                                  {s.photo ? (
                                    <img src={s.photo} alt={s.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-black text-slate-500">
                                      {s.fullName.trim().charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-800 truncate">{s.fullName}</p>
                                  <p className="text-xs font-bold text-slate-500">{s.registration}</p>
                                </div>
                              </div>
                              <Button size="sm" className="rounded-xl" onClick={() => addStudentToNucleo(s.id)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {detailLoading ? (
                    <p className="text-slate-400 text-sm italic">Carregando...</p>
                  ) : nucleoStudents.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Nenhum aluno no núcleo.</p>
                  ) : (
                    nucleoStudents.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                            {s.photo ? (
                              <img src={s.photo} alt={s.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-slate-500">
                                {s.fullName.trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-700 truncate">{s.fullName}</p>
                            <p className="text-xs font-bold text-slate-500">{s.registration}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeStudentFromNucleo(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chamada" className="mt-6">
            <ClassAttendance classId={selected.id} students={nucleoStudents} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ---------- Lista de núcleos ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-primary flex items-center gap-2">
            <Layers className="h-5 w-5" /> Núcleos
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Subturmas temáticas de <strong>{parentClass.name}</strong>. Capacidade herdada:{" "}
            {parentClass.capacity > 0 ? `${parentClass.capacity}` : "ilimitada"}.
          </p>
        </div>
        {!isTeacherArea && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Novo núcleo
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem]">
              <DialogHeader><DialogTitle>Novo núcleo</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <label className="text-sm font-black text-slate-700">Tema do núcleo</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Percussão, Coral, Robótica..."
                  className="rounded-2xl"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  A capacidade ({parentClass.capacity > 0 ? parentClass.capacity : "ilimitada"}) e
                  o horário serão herdados da turma-mãe.
                </p>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={createNucleo} disabled={saving} className="rounded-xl">
                  {saving ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm italic">Carregando núcleos...</p>
      ) : nucleos.length === 0 ? (
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
          <CardContent className="p-10 text-center">
            <Layers className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">Nenhum núcleo criado ainda.</p>
            <p className="text-slate-400 text-sm mt-1">
              Crie subturmas temáticas para agrupar alunos dentro desta turma.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {nucleos.map((n) => (
            <Card
              key={n.id}
              className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] cursor-pointer hover:-translate-y-0.5 transition-transform"
              onClick={() => setSelectedId(n.id)}
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-secondary text-primary font-black border-none">Núcleo</Badge>
                  {!isTeacherArea && (
                    <Button
                      variant="ghost" size="icon"
                      className="text-red-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); void removeNucleo(n); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <h3 className="text-lg font-black text-primary">{n.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Capacidade: {n.capacity > 0 ? `${n.capacity}` : "ilimitada"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NucleosTab;
