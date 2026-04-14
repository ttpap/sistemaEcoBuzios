import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSpeechTranscriptionReturn {
  transcript: string;
  isListening: boolean;
  isFinal: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useWebSpeechTranscription(): UseWebSpeechTranscriptionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Web Speech API não suportada neste navegador");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      interimTranscriptRef.current = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => {
            const newText = prev + (prev ? " " : "") + transcriptSegment;
            return newText;
          });
          setIsFinal(true);
        } else {
          interimTranscriptRef.current += transcriptSegment;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        setError("Nenhuma fala detectada. Tente novamente.");
      } else if (event.error === "network") {
        setError("Erro de conexão.");
      } else {
        setError(`Erro: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      interimTranscriptRef.current = "";
      setError(null);
      setIsFinal(false);
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      // Aguarda um pouco para garantir que o último resultado seja processado
      setTimeout(() => {
        recognitionRef.current?.stop();
      }, 100);
    }
  }, [isListening]);

  const reset = useCallback(() => {
    setTranscript("");
    interimTranscriptRef.current = "";
    setError(null);
    setIsFinal(false);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Retorna transcrição final + interim (para visualização em tempo real)
  const displayTranscript = transcript + (interimTranscriptRef.current ? " " + interimTranscriptRef.current : "");

  return {
    transcript: displayTranscript,
    isListening,
    isFinal,
    error,
    start,
    stop,
    reset,
  };
}
