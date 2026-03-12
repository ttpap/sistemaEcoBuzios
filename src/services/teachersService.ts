import {
  fetchTeachers,
  fetchTeachersWithMeta,
  deleteTeacher,
  fetchTeacherById,
} from "@/integrations/supabase/teachers";

export const teachersService = {
  fetchTeachers,
  fetchTeachersWithMeta,
  deleteTeacher,
  fetchTeacherById,
};
