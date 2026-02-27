"use client";

import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "coordinator" | "student";

export type Profile = {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  teacher_id: string | null;
  coordinator_id: string | null;
  student_id: string | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const loadProfile = React.useCallback(async (userId: string) => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role, full_name, teacher_id, coordinator_id, student_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile | null) ?? null;
  }, []);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      if (!supabase) {
        if (!active) return;
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSession(data.session);
      if (data.session?.user?.id) {
        try {
          const p = await loadProfile(data.session.user.id);
          if (!active) return;
          setProfile(p);
        } catch {
          if (!active) return;
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setLoading(true);
        if (nextSession?.user?.id) {
          try {
            const p = await loadProfile(nextSession.user.id);
            if (!active) return;
            setProfile(p);
          } catch {
            if (!active) return;
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        sub.subscription.unsubscribe();
      };
    };

    let cleanup: void | (() => void);
    run().then((c) => {
      cleanup = c;
    });

    return () => {
      active = false;
      if (cleanup) cleanup();
    };
  }, [loadProfile]);

  const signOut = React.useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
