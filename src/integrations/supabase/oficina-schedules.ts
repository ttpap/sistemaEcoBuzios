// src/integrations/supabase/oficina-schedules.ts

import { supabase } from "@/integrations/supabase/client";
import type {
  OficinaScheduleActivity,
  OficinaSchedule,
  OficinaScheduleFull,
  OficinaScheduleSession,
} from "@/types/oficina-schedule";

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapActivity(row: any): OficinaScheduleActivity {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    durationMinutes: row.duration_minutes ?? null,
    orderIndex: row.order_index,
    teacherId: row.teacher_id ?? null,
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

// ── Activities (per session) ──────────────────────────────────────────────────

/**
 * Save activities for a session.
 * Preserves IDs of existing activities.
 * Returns saved activities with their IDs.
 */
export async function saveSessionActivities(
  sessionId: string,
  drafts: {
    id: string | null;
    name: string;
    durationMinutes: number | null;
    orderIndex: number;
    teacherId: string | null;
  }[]
): Promise<OficinaScheduleActivity[]> {
  if (!supabase) return [];

  const { data: existing } = await supabase
    .from("oficina_schedule_activities")
    .select("id")
    .eq("session_id", sessionId);

  const existingIds = new Set((existing ?? []).map((r: any) => r.id));
  const draftIds = new Set(drafts.filter((d) => d.id).map((d) => d.id as string));

  // Delete removed activities
  const toDelete = [...existingIds].filter((id) => !draftIds.has(id));
  if (toDelete.length > 0) {
    await supabase
      .from("oficina_schedule_activities")
      .delete()
      .in("id", toDelete);
  }

  const saved: OficinaScheduleActivity[] = [];

  for (const draft of drafts) {
    if (draft.id) {
      const { data } = await supabase
        .from("oficina_schedule_activities")
        .update({
          name: draft.name,
          duration_minutes: draft.durationMinutes,
          order_index: draft.orderIndex,
          teacher_id: draft.teacherId,
        })
        .eq("id", draft.id)
        .select()
        .single();
      if (data) saved.push(mapActivity(data));
    } else {
      const { data } = await supabase
        .from("oficina_schedule_activities")
        .insert({
          session_id: sessionId,
          name: draft.name,
          duration_minutes: draft.durationMinutes,
          order_index: draft.orderIndex,
          teacher_id: draft.teacherId,
        })
        .select()
        .single();
      if (data) saved.push(mapActivity(data));
    }
  }

  return saved;
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

// ── Full fetch ─────────────────────────────────────────────────────────────────

export async function fetchScheduleFull(
  scheduleId: string
): Promise<OficinaScheduleFull | null> {
  if (!supabase) return null;

  const [scheduleRes, sessionsRes] = await Promise.all([
    supabase.from("oficina_schedules").select("*").eq("id", scheduleId).single(),
    supabase
      .from("oficina_schedule_sessions")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("date"),
  ]);

  if (scheduleRes.error || !scheduleRes.data) return null;

  const sessionIds = (sessionsRes.data ?? []).map((s: any) => s.id);
  const activitiesRes =
    sessionIds.length > 0
      ? await supabase
          .from("oficina_schedule_activities")
          .select("*")
          .in("session_id", sessionIds)
          .order("order_index")
      : { data: [], error: null };

  return {
    schedule: mapSchedule(scheduleRes.data),
    sessions: (sessionsRes.data ?? []).map(mapSession),
    activities: (activitiesRes.data ?? []).map(mapActivity),
  };
}
