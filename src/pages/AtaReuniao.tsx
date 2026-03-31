"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mic,
  MicOff,
  Sparkles,
  Save,
  FileText,
  Trash2,
  Plus,
  Eye,
  Loader2,
  CalendarDays,
  MapPin,
  Users,
  ClipboardList,
  UserCheck,
  FileDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import { generateMeetingMinutesPdf, printMeetingMinute } from "@/utils/meeting-minutes-pdf";
import {
  fetchMeetingMinutes,
  createMeetingMinute,
  deleteMeetingMinute,
  transcribeAudio,
  organizeMinutesWithAI,
  type MeetingMinute,
} from "@/services/meetingMinutesService";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import { fetchCoordinators } from "@/integrations/supabase/coordinators";
import { fetchTeacherAssignments } from "@/integrations/supabase/teacher-assignments";
import { fetchCoordinatorAssignments } from "@/integrations/supabase/coordinator-assignments";

type Step = "list" | "form";

interface Person {
  id: string;
  name: string;
  role: "Coordenador" | "Professor";
}

export default function AtaReuniao() {
  const projectId = getActiveProjectId();

  const [step, setStep] = useState<Step>("list");
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Pessoas do projeto
  const [projectPeople, setProjectPeople] = useState<Person[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [othersText, setOthersText] = useState("");

  // Formulário
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [organizedContent, setOrganizedContent] = useState("");

  // Gravação
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // IA
  const [generatingAI, setGeneratingAI] = useState(false);

  // Salvar
  const [saving, setSaving] = useState(false);

  // Visualizar ata
  const [viewingMinute, setViewingMinute] = useState<MeetingMinute | null>(null);

  // Deletar
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadMinutes();
    loadProjectPeople();
  }, [projectId]);

  async function loadMinutes() {
    setLoadingList(true);
    try {
      const data = await fetchMeetingMinutes(projectId!);
      setMinutes(data);
    } catch {
      toast.error("Erro ao carregar atas");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadProjectPeople() {
    try {
      const [teachers, coordinators, teacherAssignments, coordinatorAssignments] = await Promise.all([
        fetchTeachers(),
        fetchCoordinators(),
        fetchTeacherAssignments(),
        fetchCoordinatorAssignments(),
      ]);

      const assignedTeacherIds = new Set(
        teacherAssignments.filter((a) => a.project_id === projectId).map((a) => a.teacher_id)
      );
      const assignedCoordinatorIds = new Set(
        coordinatorAssignments.filter((a) => a.project_id === projectId).map((a) => a.coordinator_id)
      );

      const people: Person[] = [
        ...coordinators
          .filter((c) => assignedCoordinatorIds.has(c.id))
          .map((c) => ({ id: c.id, name: c.fullName, role: "Coordenador" as const })),
        ...teachers
          .filter((t) => assignedTeacherIds.has(t.id))
          .map((t) => ({ id: t.id, name: t.fullName, role: "Professor" as const })),
      ];

      setProjectPeople(people);
    } catch {
      // silently fail — checkboxes ficam vazios
    }
  }

  function buildParticipantsString(): string {
    const selected = projectPeople
      .filter((p) => selectedIds.has(p.id))
      .map((p) => `${p.name} (${p.role})`);
    if (othersText.trim()) selected.push(othersText.trim());
    return selected.join(", ");
  }

  function resetForm() {
    setTitle("");
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setLocation("");
    setSelectedIds(new Set());
    setOthersText("");
    setAgenda("");
    setRawNotes("");
    setOrganizedContent("");
  }

  function togglePerson(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Gravação ──────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleTranscribe(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleTranscribe(blob: Blob) {
    setTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      setRawNotes((prev) => (prev ? prev + "\n\n" + text : text));
      toast.success("Transcrição concluída!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na transcrição");
    } finally {
      setTranscribing(false);
    }
  }

  // ── IA ───────────────────────────────────────────────────
  async function handleGenerateAI() {
    if (!rawNotes.trim()) {
      toast.error("Adicione anotações ou grave a reunião antes de gerar a ata");
      return;
    }
    setGeneratingAI(true);
    try {
      const result = await organizeMinutesWithAI({
        title: title || "Reunião",
        meeting_date: meetingDate,
        location,
        participants: buildParticipantsString(),
        agenda,
        raw_notes: rawNotes,
      });
      setOrganizedContent(result);
      toast.success("Ata gerada pela IA!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar ata");
    } finally {
      setGeneratingAI(false);
    }
  }

  // ── Salvar ───────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) {
      toast.error("Informe o título da reunião");
      return;
    }
    if (!projectId) {
      toast.error("Nenhum projeto ativo");
      return;
    }
    setSaving(true);
    try {
      await createMeetingMinute({
        project_id: projectId,
        title,
        meeting_date: meetingDate,
        location,
        participants: buildParticipantsString(),
        agenda,
        raw_notes: rawNotes,
        organized_content: organizedContent,
      });
      toast.success("Ata salva com sucesso!");
      resetForm();
      setStep("list");
      await loadMinutes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar ata");
    } finally {
      setSaving(false);
    }
  }

  // ── PDF / Imprimir ───────────────────────────────────────
  async function handleGeneratePdf(minute: MeetingMinute) {
    setGeneratingPdf(true);
    try {
      const project = getActiveProject();
      await generateMeetingMinutesPdf(minute, project?.name ?? "Projeto", project?.imageUrl);
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handlePrint(minute: MeetingMinute) {
    const project = getActiveProject();
    printMeetingMinute(minute, project?.name ?? "Projeto", project?.imageUrl);
  }

  // ── Deletar ──────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteMeetingMinute(deletingId);
      toast.success("Ata removida");
      setMinutes((prev) => prev.filter((m) => m.id !== deletingId));
    } catch {
      toast.error("Erro ao remover ata");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render lista ─────────────────────────────────────────
  if (step === "list") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Atas de Reunião</h1>
            <p className="text-sm text-slate-500 mt-1">Grave, transcreva e organize suas reuniões com IA</p>
          </div>
          <Button onClick={() => { resetForm(); setStep("form"); }} className="gap-2 rounded-2xl">
            <Plus className="h-4 w-4" />
            Nova Ata
          </Button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : minutes.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Nenhuma ata registrada</p>
              <p className="text-slate-400 text-sm mt-1">Clique em "Nova Ata" para começar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {minutes.map((m) => (
              <Card key={m.id} className="rounded-3xl hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 truncate">{m.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(m.meeting_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        {m.location && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.organized_content && (
                      <Badge variant="secondary" className="text-xs rounded-xl bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Organizada
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setViewingMinute(m)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeletingId(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal visualizar ata */}
        <Dialog open={!!viewingMinute} onOpenChange={() => setViewingMinute(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{viewingMinute?.title}</DialogTitle>
            </DialogHeader>
            {viewingMinute && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => handleGeneratePdf(viewingMinute)}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Baixar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => handlePrint(viewingMinute)}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            )}
            {viewingMinute && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-bold">Data:</span>
                    {new Date(viewingMinute.meeting_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  {viewingMinute.location && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-bold">Local:</span>
                      {viewingMinute.location}
                    </div>
                  )}
                  {viewingMinute.participants && (
                    <div className="flex items-start gap-2 text-slate-600 col-span-2">
                      <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Participantes: </span>
                        {viewingMinute.participants}
                      </div>
                    </div>
                  )}
                </div>

                {viewingMinute.organized_content ? (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Ata organizada pela IA
                    </p>
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                      {viewingMinute.organized_content}
                    </div>
                  </div>
                ) : viewingMinute.raw_notes ? (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Anotações</p>
                    <p className="text-slate-700 whitespace-pre-wrap text-sm">{viewingMinute.raw_notes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm delete */}
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover ata?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-red-500 hover:bg-red-600">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Formulário nova ata ──────────────────────────────────
  const coordinators = projectPeople.filter((p) => p.role === "Coordenador");
  const teachers = projectPeople.filter((p) => p.role === "Professor");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-xl" onClick={() => setStep("list")}>
          ← Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Nova Ata de Reunião</h1>
          <p className="text-sm text-slate-500">Preencha os dados, grave o áudio e deixe a IA organizar</p>
        </div>
      </div>

      {/* Dados básicos */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Informações da Reunião
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Título *</label>
              <Input
                placeholder="Ex: Reunião de planejamento mensal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Data
              </label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Local
              </label>
              <Input
                placeholder="Ex: Sede do projeto"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Participantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {projectPeople.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum professor ou coordenador vinculado a este projeto.</p>
          ) : (
            <>
              {coordinators.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Coordenadores</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {coordinators.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => togglePerson(p.id)}
                        />
                        <span className="text-sm font-bold text-slate-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {teachers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Professores</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teachers.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => togglePerson(p.id)}
                        />
                        <span className="text-sm font-bold text-slate-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
              Outros participantes
            </label>
            <Input
              placeholder="Ex: Fulano de Tal (convidado), Secretária Municipal..."
              value={othersText}
              onChange={(e) => setOthersText(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pauta */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Pauta / Objetivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva os tópicos e metas da reunião..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="rounded-xl resize-none"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Gravação e anotações */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Gravação e Anotações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {recording ? (
              <Button variant="destructive" className="rounded-xl gap-2 animate-pulse" onClick={stopRecording}>
                <MicOff className="h-4 w-4" />
                Parar Gravação
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl gap-2 border-primary text-primary hover:bg-primary/10"
                onClick={startRecording}
                disabled={transcribing}
              >
                <Mic className="h-4 w-4" />
                Gravar Reunião
              </Button>
            )}
            {transcribing && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcrevendo áudio...
              </div>
            )}
            {recording && (
              <div className="flex items-center gap-2 text-sm text-red-500 font-bold">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Gravando...
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
              Anotações / Transcrição
            </label>
            <Textarea
              placeholder="As anotações da reunião aparecerão aqui após a transcrição, ou você pode digitar diretamente..."
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              className="rounded-xl resize-none"
              rows={8}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gerar ata com IA */}
      <Card className="rounded-3xl border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ata Organizada pela IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateAI} disabled={generatingAI || !rawNotes.trim()} className="rounded-xl gap-2">
            {generatingAI ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando ata...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Gerar Ata com IA</>
            )}
          </Button>

          {organizedContent && (
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                Ata gerada — você pode editar
              </label>
              <Textarea
                value={organizedContent}
                onChange={(e) => setOrganizedContent(e.target.value)}
                className="rounded-xl resize-none font-mono text-sm"
                rows={16}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" className="rounded-xl" onClick={() => setStep("list")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="h-4 w-4" /> Salvar Ata</>
          )}
        </Button>
      </div>
    </div>
  );
}
