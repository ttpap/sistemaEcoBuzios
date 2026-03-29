// src/types/oficina-schedule.ts

export interface OficinaActivityTemplate {
  id: string;
  turmaId: string;
  name: string;
  durationMinutes: number | null;
  orderIndex: number;
}

export interface OficinaSchedule {
  id: string;
  projectId: string;
  weekNumber: number;
  weekStartDate: string; // ISO date "YYYY-MM-DD"
  createdBy: string | null;
  createdAt: string;
}

export interface OficinaScheduleSession {
  id: string;
  scheduleId: string;
  turmaId: string;
  date: string; // ISO date "YYYY-MM-DD"
  isHoliday: boolean;
}

export interface OficinaScheduleAssignment {
  id: string;
  sessionId: string;
  activityTemplateId: string;
  teacherId: string | null; // null = "Todos"
}

/** Shape returned by fetchScheduleWithDetails — all data for one schedule */
export interface OficinaScheduleFull {
  schedule: OficinaSchedule;
  sessions: OficinaScheduleSession[];
  assignments: OficinaScheduleAssignment[];
  templates: OficinaActivityTemplate[];
}
