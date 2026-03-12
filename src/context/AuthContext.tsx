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

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // "loading" é apenas da inicialização. Evita travar navegação em revalidações de background.
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const requestIdRef = React.useRef(0);
  const initializedRef = React.useRef(false);

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role, full_name, teacher_id, coordinator_id, student_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile | null) ?? null;
  }, []);

  const refreshAuthState = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!initializedRef.current) setLoading(true);

    const safety = window.setTimeout(() => {
      if (requestIdRef.current === requestId) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 25000);

    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 20000);
      if (requestIdRef.current !== requestId) return;

      setSession(data.session);

      if (data.session?.user?.id) {
        try {
          const p = await withTimeout(loadProfile(data.session.user.id), 20000);
          if (requestIdRef.current !== requestId) return;
          setProfile(p);
        } catch {
          if (requestIdRef.current !== requestId) return;
        }
      } else {
        setProfile(null);
      }
    } catch {
      if (requestIdRef.current !== requestId) return;
    } finally {
      window.clearTimeout(safety);
      initializedRef.current = true;
      setLoading(false);
    }
  }, [loadProfile]);

  React.useEffect(() => {
    let active = true;

    void refreshAuthState();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      // TOKEN_REFRESHED pode acontecer com frequência — nunca deve bloquear a UI.
      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (!initializedRef.current) setLoading(true);

      const safety = window.setTimeout(() => {
        if (active && requestIdRef.current === requestId) {
          initializedRef.current = true;
          setLoading(false);
        }
      }, 25000);

      try {
        setSession(nextSession);

        if (nextSession?.user?.id) {
          try {
            const p = await withTimeout(loadProfile(nextSession.user.id), 20000);
            if (!active || requestIdRef.current !== requestId) return;
            setProfile(p);
          } catch {
            if (!active || requestIdRef.current !== requestId) return;
          }
        } else {
          setProfile(null);
        }
      } finally {
        window.clearTimeout(safety);
        initializedRef.current = true;
        if (active && requestIdRef.current === requestId) setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, refreshAuthState]);

  const signOut = React.useCallback(async () => {
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