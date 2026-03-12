import {
  fetchCoordinators,
  deleteCoordinator,
  upsertCoordinator,
} from "@/integrations/supabase/coordinators";

export const coordinatorsService = {
  fetchCoordinators,
  deleteCoordinator,
  upsertCoordinator,
};
