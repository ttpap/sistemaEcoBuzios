import {
  deleteClassRemote,
  fetchClassesRemoteWithMeta,
  fetchEnrollmentsRemoteWithMeta,
  fetchProjectEnrollmentsRemoteWithMeta,
  upsertClassRemote,
  fetchClassByIdRemote,
} from "@/integrations/supabase/classes";

export const classesService = {
  deleteClassRemote,
  fetchClassesRemoteWithMeta,
  fetchEnrollmentsRemoteWithMeta,
  fetchProjectEnrollmentsRemoteWithMeta,
  upsertClassRemote,
  fetchClassByIdRemote,
};
