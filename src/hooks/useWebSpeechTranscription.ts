import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSpeechTranscriptionReturn {
  transcript: string;
  isListening: boolean;
  isFinal: boolean;
  error: string | null;
  isRecording: boolean;
  recordingDuration: number;
  start: () => void;
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export function useWebSpeechTranscription(): UseWebSpeechTranscriptionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const interimTranscriptRef = useRef("");
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const start = useCallback(async () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      interimTranscriptRef.current = "";
      setError(null);
      setIsFinal(false);
      setRecordingDuration(0);

      try {
        // Inicia gravação de áudio - SEM filtros para captar som ambiente (celular em viva voz, etc)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, {
          mimeType: preferredMime,
          audioBitsPerSecond: 16000,
        });

        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        // Iniciar contador de duração
        let duration = 0;
        durationIntervalRef.current = setInterval(() => {
          duration += 1;
          setRecordingDuration(duration);
        }, 1000);

        // Iniciar reconhecimento de voz
        recognitionRef.current!.start();
      } catch {
        setError("Não foi possível acessar o microfone");
      }
    }
  }, [isListening]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (recognitionRef.current && isListening) {
        setTimeout(() => {
          recognitionRef.current?.stop();
        }, 100);
      }

      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          setIsRecording(false);

          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }

          if (chunksRef.current.length > 0) {
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
              ? "audio/webm;codecs=opus"
              : "audio/webm";
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            resolve(audioBlob);
          } else {
            resolve(null);
          }
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, [isListening, isRecording]);

  const reset = useCallback(() => {
    setTranscript("");
    interimTranscriptRef.current = "";
    setError(null);
    setIsFinal(false);
    setRecordingDuration(0);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  }, [isListening, isRecording]);

  // Retorna transcrição final + interim (para visualização em tempo real)
  const displayTranscript = transcript + (interimTranscriptRef.current ? " " + interimTranscriptRef.current : "");

  return {
    transcript: displayTranscript,
    isListening,
    isFinal,
    error,
    isRecording,
    recordingDuration,
    start,
    stop,
    reset,
  };
}
