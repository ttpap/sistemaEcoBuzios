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
  profileError: string | null;
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

function formatSupabaseError(e: any) {
  const code = e?.code ? ` (${String(e.code)})` : "";
  const msg = e?.message ? String(e.message) : String(e || "erro");
  return `${msg}${code}`;
}

function isAbortError(e: any) {
  return e?.name === "AbortError";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // "loading" é apenas da inicialização. Evita travar navegação em revalidações.
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const requestIdRef = React.useRef(0);
  const initializedRef = React.useRef(false);
  const initialGetSessionDoneRef = React.useRef(false);

  // Dedup de loadProfile: garante 1 request por userId por vez.
  const inflightProfileRef = React.useRef<{ userId: string; promise: Promise<Profile | null> } | null>(null);

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role, full_name, teacher_id, coordinator_id, student_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile | null) ?? null;
  }, []);

  const loadProfileDedup = React.useCallback(
    async (userId: string) => {
      const inflight = inflightProfileRef.current;
      if (inflight?.userId === userId) return inflight.promise;

      const promise = loadProfile(userId);
      inflightProfileRef.current = { userId, promise };

      try {
        return await promise;
      } finally {
        if (inflightProfileRef.current?.userId === userId) inflightProfileRef.current = null;
      }
    },
    [loadProfile],
  );

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

      const userId = data.session?.user?.id;
      if (userId) {
        // Se já temos profile carregado para esse usuário e não há erro, evita refetch.
        if (profile?.user_id === userId && !profileError) return;

        try {
          const p = await withTimeout(loadProfileDedup(userId), 20000);
          if (requestIdRef.current !== requestId) return;

          // Só seta profile quando a request finaliza com sucesso.
          setProfile(p);
          setProfileError(null);
        } catch (e: any) {
          if (requestIdRef.current !== requestId) return;

          // AbortError (race/lock) é esperado em concorrência do SDK — não deve derrubar profile.
          if (isAbortError(e)) {
            console.info("[AuthContext] loadProfile_aborted_ignored");
            return;
          }

          setProfile(null);
          setProfileError(formatSupabaseError(e));
          console.warn("[AuthContext] loadProfile_failed", e);
        }
      } else {
        setProfile(null);
        setProfileError(null);
      }
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      console.warn("[AuthContext] getSession_failed", e);
    } finally {
      window.clearTimeout(safety);
      initializedRef.current = true;
      initialGetSessionDoneRef.current = true;
      setLoading(false);
    }
  }, [loadProfileDedup, profile?.user_id, profileError]);

  React.useEffect(() => {
    let active = true;

    void refreshAuthState();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      // Evita corrida entre getSession() inicial e o callback inicial do SDK.
      if (event === "INITIAL_SESSION" && !initialGetSessionDoneRef.current) return;

      // TOKEN_REFRESHED pode acontecer com frequência — não deve disparar loadProfile concorrente.
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

        const userId = nextSession?.user?.id;
        if (!userId) {
          setProfile(null);
          setProfileError(null);
          return;
        }

        // Se já temos profile desse user e não há erro, não refaz.
        if (profile?.user_id === userId && !profileError) return;

        try {
          const p = await withTimeout(loadProfileDedup(userId), 20000);
          if (!active || requestIdRef.current !== requestId) return;
          setProfile(p);
          setProfileError(null);
        } catch (e: any) {
          if (!active || requestIdRef.current !== requestId) return;

          if (isAbortError(e)) {
            console.info("[AuthContext] loadProfile_aborted_ignored");
            return;
          }

          setProfile(null);
          setProfileError(formatSupabaseError(e));
          console.warn("[AuthContext] loadProfile_failed", e);
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
  }, [loadProfileDedup, profile?.user_id, profileError, refreshAuthState]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    profileError,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}