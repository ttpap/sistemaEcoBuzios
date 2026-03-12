import {
  fetchCoordinatorAssignments,
  assignCoordinatorToProjectRemote,
  removeCoordinatorFromProjectRemote,
} from "@/integrations/supabase/coordinator-assignments";

export const coordinatorAssignmentsService = {
  fetchCoordinatorAssignments,
  assignCoordinatorToProjectRemote,
  removeCoordinatorFromProjectRemote,
};
