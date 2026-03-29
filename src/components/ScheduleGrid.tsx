// src/components/ScheduleGrid.tsx (STUB — Task 9 will replace this)
import React from "react";
import type { OficinaScheduleFull, OficinaScheduleAssignment } from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";

interface ScheduleGridProps {
  full: OficinaScheduleFull;
  allClasses: SchoolClass[];
  allTeachers: TeacherRegistration[];
  saving: boolean;
  onSave: (assignments: Omit<OficinaScheduleAssignment, "id">[]) => Promise<void>;
}

export default function ScheduleGrid(_props: ScheduleGridProps) {
  return <div className="text-slate-400 text-sm p-4">Grade de atribuições (em desenvolvimento)</div>;
}
