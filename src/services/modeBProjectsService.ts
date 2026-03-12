import { fetchModeBStaffProjects, fetchModeBStudentProjects } from "@/integrations/supabase/mode-b-projects";

export const modeBProjectsService = {
  fetchModeBStaffProjects,
  fetchModeBStudentProjects,
};
