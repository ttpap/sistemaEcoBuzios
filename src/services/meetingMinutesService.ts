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
    .insert(input)
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

  const prompt = `Você é um assistente especializado em elaborar atas de reunião formais em português brasileiro.

Com base nas informações abaixo, elabore uma ata de reunião completa, organizada e formal.

**Dados da reunião:**
- Título: ${params.title}
- Data: ${params.meeting_date}
- Local: ${params.location || "Não informado"}
- Participantes: ${params.participants || "Não informado"}
- Pauta: ${params.agenda || "Não informada"}

**Anotações/Transcrição:**
${params.raw_notes}

**Instruções:**
- Organize a ata com os seguintes campos: Cabeçalho, Participantes, Pauta, Desenvolvimento (o que foi discutido), Deliberações e Encaminhamentos, Encerramento
- Use linguagem formal
- Destaque as metas e compromissos assumidos
- Formate de forma clara e estruturada
- Use markdown para formatação`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na IA: ${err}`);
  }

  const json = await response.json();
  return json.choices[0].message.content as string;
}
