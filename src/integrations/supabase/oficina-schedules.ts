// src/integrations/supabase/oficina-schedules.ts

import { supabase } from "@/integrations/supabase/client";
import type {
  OficinaActivityTemplate,
  OficinaSchedule,
  OficinaScheduleAssignment,
  OficinaScheduleFull,
  OficinaScheduleSession,
} from "@/types/oficina-schedule";

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapTemplate(row: any): OficinaActivityTemplate {
  return {
    id: row.id,
    turmaId: row.turma_id,
    name: row.name,
    durationMinutes: row.duration_minutes ?? null,
    orderIndex: row.order_index,
  };
}

function mapSchedule(row: any): OficinaSchedule {
  return {
    id: row.id,
    projectId: row.project_id,
    weekNumber: row.week_number,
    weekStartDate: row.week_start_date,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

function mapSession(row: any): OficinaScheduleSession {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    turmaId: row.turma_id,
    date: row.date,
    isHoliday: row.is_holiday,
  };
}

function mapAssignment(row: any): OficinaScheduleAssignment {
  return {
    id: row.id,
    sessionId: row.session_id,
    activityTemplateId: row.activity_template_id,
    teacherId: row.teacher_id ?? null,
  };
}

// ── Activity Templates ────────────────────────────────────────────────────────

export async function fetchTemplatesByTurma(
  turmaId: string
): Promise<OficinaActivityTemplate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("oficina_activity_templates")
    .select("*")
    .eq("turma_id", turmaId)
    .order("order_index");
  if (error || !data) return [];
  return data.map(mapTemplate);
}

export async function upsertTemplates(
  turmaId: string,
  templates: Omit<OficinaActivityTemplate, "id" | "turmaId">[]
): Promise<void> {
  if (!supabase) return;
  // Delete existing and re-insert to handle reordering
  await supabase
    .from("oficina_activity_templates")
    .delete()
    .eq("turma_id", turmaId);
  if (templates.length === 0) return;
  const rows = templates.map((t, i) => ({
    turma_id: turmaId,
    name: t.name,
    duration_minutes: t.durationMinutes,
    order_index: i,
  }));
  await supabase.from("oficina_activity_templates").insert(rows);
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export async function fetchSchedulesByProject(
  projectId: string
): Promise<OficinaSchedule[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("oficina_schedules")
    .select("*")
    .eq("project_id", projectId)
    .order("week_number", { ascending: false });
  if (error || !data) return [];
  return data.map(mapSchedule);
}

export async function createSchedule(
  projectId: string,
  weekNumber: number,
  weekStartDate: string,
  createdBy: string | null
): Promise<OficinaSchedule | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("oficina_schedules")
    .insert({
      project_id: projectId,
      week_number: weekNumber,
      week_start_date: weekStartDate,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapSchedule(data);
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("oficina_schedules").delete().eq("id", scheduleId);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function fetchSessionsBySchedule(
  scheduleId: string
): Promise<OficinaScheduleSession[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("oficina_schedule_sessions")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("date");
  if (error || !data) return [];
  return data.map(mapSession);
}

export async function createSession(
  session: Omit<OficinaScheduleSession, "id">
): Promise<OficinaScheduleSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("oficina_schedule_sessions")
    .insert({
      schedule_id: session.scheduleId,
      turma_id: session.turmaId,
      date: session.date,
      is_holiday: session.isHoliday,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapSession(data);
}

export async function updateSessionHoliday(
  sessionId: string,
  isHoliday: boolean
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("oficina_schedule_sessions")
    .update({ is_holiday: isHoliday })
    .eq("id", sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("oficina_schedule_sessions")
    .delete()
    .eq("id", sessionId);
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function fetchAssignmentsBySchedule(
  scheduleId: string
): Promise<OficinaScheduleAssignment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("oficina_schedule_assignments")
    .select("*, oficina_schedule_sessions!inner(schedule_id)")
    .eq("oficina_schedule_sessions.schedule_id", scheduleId);
  if (error || !data) return [];
  return data.map(mapAssignment);
}

export async function upsertAssignments(
  assignments: Omit<OficinaScheduleAssignment, "id">[]
): Promise<void> {
  if (!supabase || assignments.length === 0) return;
  const rows = assignments.map((a) => ({
    session_id: a.sessionId,
    activity_template_id: a.activityTemplateId,
    teacher_id: a.teacherId,
  }));
  await supabase.from("oficina_schedule_assignments").upsert(rows, {
    onConflict: "session_id,activity_template_id",
  });
}

// ── Full fetch ─────────────────────────────────────────────────────────────────

export async function fetchScheduleFull(
  scheduleId: string
): Promise<OficinaScheduleFull | null> {
  if (!supabase) return null;
  const [scheduleRes, sessionsRes] = await Promise.all([
    supabase
      .from("oficina_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single(),
    supabase
      .from("oficina_schedule_sessions")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("date"),
  ]);
  if (scheduleRes.error || !scheduleRes.data) return null;

  const sessions = (sessionsRes.data ?? []).map(mapSession);
  const turmaIds = [...new Set(sessions.map((s) => s.turmaId))];

  const [assignmentsRes, templatesRes] = await Promise.all([
    supabase
      .from("oficina_schedule_assignments")
      .select("*, oficina_schedule_sessions!inner(schedule_id)")
      .eq("oficina_schedule_sessions.schedule_id", scheduleId),
    turmaIds.length > 0
      ? supabase
          .from("oficina_activity_templates")
          .select("*")
          .in("turma_id", turmaIds)
          .order("order_index")
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    schedule: mapSchedule(scheduleRes.data),
    sessions,
    assignments: (assignmentsRes.data ?? []).map(mapAssignment),
    templates: (templatesRes.data ?? []).map(mapTemplate),
  };
}
