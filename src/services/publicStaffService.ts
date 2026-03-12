import { insertTeacherPublic, insertCoordinatorPublic } from "@/integrations/supabase/public-staff";

export const publicStaffService = {
  insertTeacherPublic,
  insertCoordinatorPublic,
};
