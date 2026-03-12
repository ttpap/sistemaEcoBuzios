import {
  fetchTeacherAssignmentsWithMeta,
  assignTeacherToProjectRemote,
  removeTeacherFromProjectRemote,
} from "@/integrations/supabase/teacher-assignments";

export const teacherAssignmentsService = {
  fetchTeacherAssignmentsWithMeta,
  assignTeacherToProjectRemote,
  removeTeacherFromProjectRemote,
};
