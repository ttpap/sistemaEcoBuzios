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
  Upload,
  AlertCircle,
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
  refineTranscriptionText,
  type MeetingMinute,
} from "@/services/meetingMinutesService";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import { fetchCoordinators } from "@/integrations/supabase/coordinators";
import { fetchTeacherAssignments } from "@/integrations/supabase/teacher-assignments";
import { fetchCoordinatorAssignments } from "@/integrations/supabase/coordinator-assignments";
import { useWebSpeechTranscription } from "@/hooks/useWebSpeechTranscription";

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

  // Web Speech Transcription
  const webSpeech = useWebSpeechTranscription();
  const [transcriberGroq, setTranscriberGroq] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Sincroniza transcrição do Web Speech com o campo editável em tempo real
  useEffect(() => {
    if (webSpeech.isListening) {
      setLiveTranscript(webSpeech.transcript);
    }
  }, [webSpeech.transcript, webSpeech.isListening]);

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
    setLiveTranscript("");
    setAudioBlob(null);
    webSpeech.reset();
  }

  function togglePerson(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Gravação ──────────────────────────────────────────────
  function startRecording() {
    setLiveTranscript("");
    setAudioBlob(null);
    webSpeech.reset();
    webSpeech.start();
  }

  async function stopRecording() {
    const blob = await webSpeech.stop();
    setAudioBlob(blob);
    // Copia a transcrição para o rawNotes para editar/usar
    if (webSpeech.transcript.trim()) {
      setRawNotes(webSpeech.transcript);
    }
  }

  // ── Upload de arquivo de áudio ────────────────────────────
  async function handleAudioUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > 22) {
        toast.info(
          `Áudio grande (${sizeMB.toFixed(1)} MB). Dividindo em pedaços e transcrevendo — pode levar alguns minutos.`,
          { duration: 8000 }
        );
      }
      const text = await transcribeAudio(file);
      setRawNotes((prev) => (prev ? prev + "\n\n" + text : text));
      setLiveTranscript(text);
      toast.success("Áudio transcrito com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao transcrever áudio");
    } finally {
      setUploadingAudio(false);
      // Limpa o input para permitir re-upload do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Refinar com IA (Groq Whisper + Llama) ────────────────
  async function handleRefineWithAI() {
    const textToRefine = liveTranscript || rawNotes;

    if (!textToRefine.trim() && !audioBlob) {
      toast.error("Nenhuma transcrição ou áudio para processar");
      return;
    }

    setTranscriberGroq(true);
    try {
      let transcribedText: string;

      // Se tem áudio gravado, transcreve com Groq Whisper (mais preciso)
      if (audioBlob) {
        transcribedText = await transcribeAudio(audioBlob);
      } else {
        transcribedText = textToRefine;
      }

      // Refinar texto com retry automático em caso de rate limit
      const refined = await refineTranscriptionText(transcribedText);
      setLiveTranscript(refined);
      setRawNotes(refined);
      toast.success("Transcrição refinada pela IA!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar transcrição";
      if (msg.includes("rate_limit")) {
        toast.error("Limite de requisições atingido. Aguarde alguns segundos e tente de novo.");
      } else {
        toast.error(msg);
      }
    } finally {
      setTranscriberGroq(false);
    }
  }

  // Formatar duração em MM:SS
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // ── IA ───────────────────────────────────────────────────
  async function handleGenerateAI() {
    if (!rawNotes.trim()) {
      toast.error("Adicione anotações ou grave a reunião antes de gerar o relatório");
      return;
    }
    setGeneratingAI(true);
    toast.info("Gerando relatório detalhado... pode levar alguns segundos", { duration: 5000 });
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
      toast.success("Relatório gerado pela IA!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar relatório";
      if (msg.includes("rate_limit")) {
        toast.error("Limite de requisições atingido. Aguarde 1 minuto e tente de novo.");
      } else {
        toast.error(msg);
      }
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

      {/* Gravação e Transcrição - Caixa Única Unificada */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Gravação da Reunião
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões de ação principais */}
          <div className="flex flex-wrap items-center gap-3">
            {webSpeech.isListening ? (
              <Button variant="destructive" className="rounded-xl gap-2 animate-pulse" onClick={stopRecording}>
                <MicOff className="h-4 w-4" />
                Parar Gravação
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl gap-2 border-primary text-primary hover:bg-primary/10"
                onClick={startRecording}
                disabled={uploadingAudio || transcriberGroq}
              >
                <Mic className="h-4 w-4" />
                Iniciar Gravação
              </Button>
            )}

            {/* Upload de arquivo de áudio - aceita mp3, wav, m4a, ogg, opus (iPhone), webm, flac */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.opus,.m4a,.mp3,.wav,.ogg,.webm,.flac,.mp4,.mpeg,.mpga"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={webSpeech.isListening || uploadingAudio || transcriberGroq}
            >
              {uploadingAudio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcrevendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload de Áudio
                </>
              )}
            </Button>

            {/* Refinar com IA */}
            <Button
              variant="outline"
              className="rounded-xl gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
              onClick={handleRefineWithAI}
              disabled={webSpeech.isListening || uploadingAudio || transcriberGroq || (!liveTranscript.trim() && !audioBlob && !rawNotes.trim())}
            >
              {transcriberGroq ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refinando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Refinar com IA
                </>
              )}
            </Button>
          </div>

          {/* Status da gravação */}
          {webSpeech.isListening && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-600">Gravando e ouvindo...</p>
                <p className="text-xs text-red-500">Captura o som ambiente (celular em viva voz, várias pessoas falando, etc)</p>
              </div>
              <div className="text-sm font-mono font-bold text-red-600">
                {formatDuration(webSpeech.recordingDuration)}
              </div>
            </div>
          )}

          {/* Indicador de áudio gravado disponível */}
          {audioBlob && !webSpeech.isListening && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Áudio gravado disponível — clique "Refinar com IA" para transcrição mais precisa
            </div>
          )}

          {/* Erro da Web Speech */}
          {webSpeech.error && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{webSpeech.error}</span>
            </div>
          )}

          {/* Campo de transcrição/anotações - UNIFICADO e EDITÁVEL */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center justify-between">
              <span>Transcrição / Anotações</span>
              {webSpeech.isListening && (
                <span className="text-red-500 normal-case font-normal">● em tempo real</span>
              )}
            </label>
            <Textarea
              placeholder="Clique em 'Iniciar Gravação' para transcrever em tempo real, faça upload de um arquivo de áudio, ou digite manualmente aqui..."
              value={webSpeech.isListening ? liveTranscript : rawNotes}
              onChange={(e) => {
                if (webSpeech.isListening) {
                  setLiveTranscript(e.target.value);
                } else {
                  setRawNotes(e.target.value);
                }
              }}
              className="rounded-xl resize-none font-mono text-sm"
              rows={14}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gerar relatório detalhado com IA */}
      <Card className="rounded-3xl border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Relatório Detalhado pela IA
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Gera um relatório completo com contexto, citações, pontos altos e decisões
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateAI} disabled={generatingAI || !rawNotes.trim()} className="rounded-xl gap-2">
            {generatingAI ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando relatório...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Gerar Relatório com IA</>
            )}
          </Button>

          {organizedContent && (
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                Relatório gerado — você pode editar
              </label>
              <Textarea
                value={organizedContent}
                onChange={(e) => setOrganizedContent(e.target.value)}
                className="rounded-xl resize-none font-mono text-sm"
                rows={20}
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
