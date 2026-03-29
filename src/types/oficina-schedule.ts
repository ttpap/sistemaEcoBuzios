// src/types/oficina-schedule.ts

export interface OficinaScheduleActivity {
  id: string;
  sessionId: string;
  name: string;
  durationMinutes: number | null;
  orderIndex: number;
  teacherId: string | null; // null = "Todos"
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

/** All data for one schedule */
export interface OficinaScheduleFull {
  schedule: OficinaSchedule;
  sessions: OficinaScheduleSession[];
  activities: OficinaScheduleActivity[];
}
