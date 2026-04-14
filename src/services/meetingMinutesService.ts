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

// Transcreve áudio usando Groq Whisper
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY não configurada");

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
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
