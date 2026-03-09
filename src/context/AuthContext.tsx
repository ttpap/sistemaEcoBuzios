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
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const requestIdRef = React.useRef(0);

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role, full_name, teacher_id, coordinator_id, student_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile | null) ?? null;
  }, []);

  const refreshAuthState = React.useCallback(
    async ({ preferRefresh }: { preferRefresh?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      try {
        if (preferRefresh) {
          // Se o navegador ficou "parado" por muito tempo, o auto-refresh pode ter sido pausado.
          // Tentamos renovar silenciosamente antes de revalidar a sessão.
          try {
            await withTimeout(supabase.auth.refreshSession(), 8000);
          } catch {
            // ignore
          }
        }

        const { data } = await withTimeout(supabase.auth.getSession(), 8000);
        if (requestIdRef.current !== requestId) return;

        setSession(data.session);

        if (data.session?.user?.id) {
          try {
            const p = await withTimeout(loadProfile(data.session.user.id), 8000);
            if (requestIdRef.current !== requestId) return;
            setProfile(p);
          } catch {
            if (requestIdRef.current !== requestId) return;
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch {
        if (requestIdRef.current !== requestId) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [loadProfile],
  );

  React.useEffect(() => {
    let active = true;

    refreshAuthState().catch(() => {
      // ignore
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setSession(nextSession);

      if (nextSession?.user?.id) {
        try {
          const p = await withTimeout(loadProfile(nextSession.user.id), 8000);
          if (!active || requestIdRef.current !== requestId) return;
          setProfile(p);
        } catch {
          if (!active || requestIdRef.current !== requestId) return;
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (active && requestIdRef.current === requestId) setLoading(false);
    });

    const onFocus = () => {
      if (!active) return;
      refreshAuthState({ preferRefresh: true }).catch(() => {
        // ignore
      });
    };

    const onVisibility = () => {
      if (!active) return;
      if (document.visibilityState === "visible") {
        refreshAuthState({ preferRefresh: true }).catch(() => {
          // ignore
        });
      }
    };

    // Mantém a sessão viva mesmo sem interação (garante >5 min sem mexer).
    const keepAlive = window.setInterval(() => {
      if (!active) return;
      if (document.visibilityState !== "visible") return;
      refreshAuthState({ preferRefresh: true }).catch(() => {
        // ignore
      });
    }, 4 * 60 * 1000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(keepAlive);
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
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