"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Loader2,
  CalendarDays,
  MapPin,
  Users,
  Sparkles,
  FileDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { getActiveProject, getActiveProjectId } from "@/utils/projects";
import {
  fetchMeetingMinutes,
  type MeetingMinute,
} from "@/services/meetingMinutesService";
import { generateMeetingMinutesPdf, printMeetingMinute } from "@/utils/meeting-minutes-pdf";

export default function AtaReuniaoViewer() {
  const projectId = getActiveProjectId();

  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [viewingMinute, setViewingMinute] = useState<MeetingMinute | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadMinutes();
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Atas de Reunião</h1>
        <p className="text-sm text-slate-500 mt-1">Visualize as atas das reuniões do seu projeto</p>
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
            <p className="text-slate-400 text-sm mt-1">As atas criadas pelo coordenador aparecerão aqui</p>
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
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
