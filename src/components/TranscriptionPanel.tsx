"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface TranscriptionPanelProps {
  transcript: string;
  onTranscriptChange?: (text: string) => void;
  isListening: boolean;
  error: string | null;
  isTranscribingGroq?: boolean;
  onUseWebSpeech: () => void;
  onUseGroq: () => void;
  groqTranscript?: string | null;
}

export function TranscriptionPanel({
  transcript,
  onTranscriptChange,
  isListening,
  error,
  isTranscribingGroq = false,
  onUseWebSpeech,
  onUseGroq,
  groqTranscript = null,
}: TranscriptionPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editableText, setEditableText] = useState(transcript);

  // Atualizar texto editável quando o transcript mudar
  useEffect(() => {
    setEditableText(transcript);
  }, [transcript]);

  // Auto-scroll para o final quando novo texto é adicionado
  useEffect(() => {
    if (textareaRef.current && isListening) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, isListening]);

  function handleCopyToClipboard() {
    navigator.clipboard.writeText(editableText);
    toast.success("Copiado para a área de transferência!");
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-800">Transcrição em Tempo Real</h3>
          {isListening && (
            <div className="flex items-center gap-1 text-xs text-red-500 font-bold">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Ouvindo...
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {isListening ? "Edite a transcrição conforme ela aparece" : "Transcrição finalizada"}
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor de transcrição */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <Textarea
          ref={textareaRef}
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
          placeholder="A transcrição aparecerá aqui em tempo real..."
          className="rounded-xl resize-none flex-1 font-mono text-sm"
          disabled={isListening}
        />
      </div>

      {/* Versão do Groq (se disponível) */}
      {groqTranscript && (
        <div className="space-y-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-700">Transcrição pela IA (mais precisa)</p>
          </div>
          <p className="text-xs text-emerald-800 max-h-20 overflow-y-auto bg-white p-2 rounded border border-emerald-100">
            {groqTranscript}
          </p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-2 w-full text-xs"
          onClick={handleCopyToClipboard}
          disabled={!editableText.trim()}
        >
          <Copy className="h-3 w-3" />
          Copiar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1 text-xs"
            onClick={onUseWebSpeech}
            disabled={isListening || isTranscribingGroq || !editableText.trim()}
          >
            ✓ Web Speech
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-1 text-xs"
            onClick={onUseGroq}
            disabled={isListening || isTranscribingGroq || !editableText.trim()}
          >
            {isTranscribingGroq ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
              </>
            ) : (
              <>✨ IA</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
