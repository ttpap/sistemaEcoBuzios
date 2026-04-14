import { supabase } from "@/integrations/supabase/client";

export interface MeetingMinute {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  location?: string;
  participants?: string;
  agenda?: string;
  raw_notes?: string;
  organized_content?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  duration_hours: number;
}

export interface CreateMeetingMinuteInput {
  project_id: string;
  title: string;
  meeting_date: string;
  location?: string;
  participants?: string;
  agenda?: string;
  raw_notes?: string;
  organized_content?: string;
  created_by?: string;
}

export async function fetchMeetingMinutes(projectId: string): Promise<MeetingMinute[]> {
  const { data, error } = await (supabase as any)
    .from("meeting_minutes")
    .select("*")
    .eq("project_id", projectId)
    .order("meeting_date", { ascending: false });

  if (error) throw new Error(error.message || JSON.stringify(error));
  return data ?? [];
}

export async function createMeetingMinute(input: CreateMeetingMinuteInput): Promise<MeetingMinute> {
  const { data, error } = await (supabase as any)
    .from("meeting_minutes")
    .insert({ ...input, duration_hours: 1 })
    .select()
    .single();

  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function deleteMeetingMinute(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("meeting_minutes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message || JSON.stringify(error));
}

// Limite da Groq Whisper: 25 MB. Usamos 22 MB como gatilho para dividir (margem de segurança)
const GROQ_WHISPER_SIZE_LIMIT = 22 * 1024 * 1024;

// Transcreve áudio usando Groq Whisper
// Aceita Blob (usa "recording.webm") ou File (detecta extensão, converte .opus → .ogg)
// Se o arquivo passar de 22MB, divide em pedaços automaticamente e transcreve cada um
export async function transcribeAudio(audio: Blob | File): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY não configurada");

  // Se o arquivo é grande demais, divide em pedaços
  if (audio.size > GROQ_WHISPER_SIZE_LIMIT) {
    console.log(`Áudio grande (${(audio.size / 1024 / 1024).toFixed(1)} MB). Dividindo em pedaços...`);
    return await transcribeAudioInChunks(audio, apiKey);
  }

  // Determina o nome do arquivo a enviar
  const filename = getAudioFilename(audio);

  return await sendAudioToGroq(audio, filename, apiKey);
}

// Envia um blob de áudio para a Groq Whisper e retorna o texto transcrito
async function sendAudioToGroq(audio: Blob, filename: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", audio, filename);
  formData.append("model", "whisper-large-v3");
  formData.append("language", "pt");
  formData.append("response_format", "text");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na transcrição: ${err}`);
  }

  return response.text();
}

// Determina o nome do arquivo a enviar para a Groq (trata .opus → .ogg)
function getAudioFilename(audio: Blob | File): string {
  if (audio instanceof File) {
    const originalName = audio.name.toLowerCase();
    if (originalName.endsWith(".opus")) {
      return audio.name.replace(/\.opus$/i, ".ogg");
    }
    return audio.name;
  }
  return "recording.webm";
}

// Divide um áudio em pedaços menores e transcreve cada um.
// Usa Web Audio API para decodificar e re-codificar em WAV 16kHz mono (formato pequeno e aceito pela Whisper).
async function transcribeAudioInChunks(audio: Blob | File, apiKey: string): Promise<string> {
  // 1. Decodificar o áudio completo
  const arrayBuffer = await audio.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    audioContext.close();
    throw new Error(
      `Não foi possível decodificar o áudio para dividir. Tente converter para MP3 ou WAV primeiro. Detalhe: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const totalDurationSec = audioBuffer.duration;

  // 2. Calcular tamanho do chunk.
  // WAV 16kHz mono 16-bit = 32 KB/s = ~1.92 MB/min → 8 min ≈ 15 MB (dentro do limite 22 MB com margem)
  const CHUNK_DURATION_SEC = 8 * 60; // 8 minutos
  const numChunks = Math.ceil(totalDurationSec / CHUNK_DURATION_SEC);

  console.log(`Dividindo em ${numChunks} pedaço(s) de até 8 minutos cada (duração total: ${(totalDurationSec / 60).toFixed(1)} min)`);

  // 3. Processar cada chunk
  const transcriptions: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const startSec = i * CHUNK_DURATION_SEC;
    const endSec = Math.min(startSec + CHUNK_DURATION_SEC, totalDurationSec);

    console.log(`Transcrevendo pedaço ${i + 1}/${numChunks} (${startSec.toFixed(0)}s → ${endSec.toFixed(0)}s)...`);

    // Extrai o intervalo do AudioBuffer
    const chunkBuffer = extractAudioBufferSlice(audioBuffer, startSec, endSec);

    // Converte para WAV 16kHz mono
    const wavBlob = audioBufferToWav16kMono(chunkBuffer);

    // Envia para Groq
    const text = await sendAudioToGroq(wavBlob, `chunk_${i + 1}.wav`, apiKey);
    transcriptions.push(text.trim());
  }

  audioContext.close();

  // 4. Junta os textos dos chunks
  return transcriptions.filter((t) => t.length > 0).join("\n\n");
}

// Extrai um intervalo de tempo de um AudioBuffer e retorna um novo AudioBuffer
function extractAudioBufferSlice(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.floor(endSec * sampleRate);
  const frameCount = endSample - startSample;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = newBuffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      dst[i] = src[startSample + i] ?? 0;
    }
  }

  ctx.close();
  return newBuffer;
}

// Converte um AudioBuffer para um Blob WAV mono 16kHz 16-bit
// Formato pequeno que a Whisper aceita bem e deixa o arquivo leve
function audioBufferToWav16kMono(buffer: AudioBuffer): Blob {
  const TARGET_RATE = 16000;

  // 1. Mixa todos os canais para mono
  const monoData = mixToMono(buffer);

  // 2. Resample para 16kHz (linear simples — suficiente para fala)
  const resampled = resampleLinear(monoData, buffer.sampleRate, TARGET_RATE);

  // 3. Converte para PCM 16-bit e empacota como WAV
  return encodeWav16Bit(resampled, TARGET_RATE);
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const len = buffer.length;
  const out = new Float32Array(len);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      out[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return out;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcIdx - idx0;
    out[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
  }
  return out;
}

function encodeWav16Bit(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Organiza a ata usando Groq Llama
export async function organizeMinutesWithAI(params: {
  title: string;
  meeting_date: string;
  location?: string;
  participants?: string;
  agenda?: string;
  raw_notes: string;
}): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY não configurada");

  const prompt = `Você é um assistente especializado em elaborar RELATÓRIOS DETALHADOS de reunião em português brasileiro.

IMPORTANTE: Este NÃO é um resumo curto. É um RELATÓRIO COMPLETO que conta como foi a reunião, com detalhes, citações e análise.

Com base nas informações abaixo, elabore um relatório completo, detalhado e analítico da reunião.

**Dados da reunião:**
- Título: ${params.title}
- Data: ${params.meeting_date}
- Local: ${params.location || "Não informado"}
- Participantes: ${params.participants || "Não informado"}
- Pauta: ${params.agenda || "Não informada"}

**Anotações/Transcrição:**
${params.raw_notes}

**Instruções para o relatório — use EXATAMENTE estas seções:**

## 📅 Cabeçalho
- Título, data, local e lista completa de participantes

## 🎯 Contexto e Objetivo
- Parágrafo explicando o cenário da reunião e o objetivo geral
- Contexto do que motivou o encontro

## 💬 Desenvolvimento Detalhado
- Narrativa COMPLETA e detalhada do que foi discutido
- Inclua CITAÇÕES DIRETAS relevantes: "Conforme mencionado por [Nome]: '...'"
- Apresente as diferentes perspectivas e argumentos levantados
- Detalhe os tópicos debatidos, não apenas liste
- Use trechos do que foi dito para embasar

## ⭐ Pontos Altos
- Principais destaques e decisões importantes
- Momentos-chave da reunião
- Acordos firmados

## 🤔 Pontos de Reflexão
- Questões abertas, dúvidas que ficaram
- Pontos que merecem ser pensados
- Desafios identificados

## ✅ Decisões Tomadas
- Lista clara e objetiva das decisões
- Contexto de cada decisão

## 📋 Tarefas e Responsáveis
- Tabela ou lista com: Ação | Responsável | Prazo (quando informado)

**Diretrizes de estilo:**
- Use linguagem formal mas acessível, em português brasileiro
- Seja DETALHADO, não resumido — prefira MAIS detalhe a menos
- Use citações diretas sempre que possível
- Use markdown para formatação (títulos, listas, negrito)
- O relatório deve fazer com que quem não participou da reunião entenda TUDO que aconteceu`;

  const json = await callGroqWithRetry(apiKey, {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 6000,
  });

  return json.choices[0].message.content as string;
}

// Refina uma transcrição usando Llama com retry automático
export async function refineTranscriptionText(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY não configurada");

  const prompt = `Você é um assistente especializado em revisão de transcrições em português brasileiro.

A transcrição abaixo foi feita por reconhecimento de voz. Revise-a corrigindo erros ortográficos, gramaticais e melhorando a clareza, mantendo o significado original:

---
${text}
---

Retorne apenas a transcrição revisada, sem explicações adicionais.`;

  const json = await callGroqWithRetry(apiKey, {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 4096,
  });

  return json.choices[0].message.content as string;
}

// Helper: chama a Groq com retry automático quando der rate limit
async function callGroqWithRetry(
  apiKey: string,
  body: Record<string, unknown>,
  maxRetries = 3
): Promise<any> {
  let lastError: string = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return await response.json();
    }

    const errText = await response.text();
    lastError = errText;

    // Rate limit (429): extrai tempo de espera e tenta de novo
    if (response.status === 429 && attempt < maxRetries) {
      let waitSeconds = 5; // default

      // Tenta extrair o tempo sugerido da mensagem de erro
      // Ex: "Please try again in 3.115s"
      const match = errText.match(/try again in ([\d.]+)s/);
      if (match) {
        waitSeconds = parseFloat(match[1]) + 1; // adiciona 1s de buffer
      }

      // Exponential backoff: aumenta o tempo a cada tentativa
      const waitMs = Math.max(waitSeconds * 1000, (attempt + 1) * 2000);

      console.warn(`Rate limit atingido. Aguardando ${waitMs / 1000}s antes de tentar de novo (tentativa ${attempt + 1}/${maxRetries})...`);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    // Outros erros: não retry
    throw new Error(`Erro na IA: ${errText}`);
  }

  throw new Error(`Erro na IA após ${maxRetries} tentativas: ${lastError}`);
}
