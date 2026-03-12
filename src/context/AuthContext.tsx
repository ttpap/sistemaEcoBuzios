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
  if (!e) return false;
  if (e.name === "AbortError") return true;
  const msg = String(e.message || e || "");
  return msg.includes("AbortError") || msg.includes("Lock broken") || msg.includes("steal");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // loading = apenas bootstrap inicial.
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Refs para evitar dependências que recriam listeners.
  const sessionRef = React.useRef<Session | null>(null);
  const profileRef = React.useRef<Profile | null>(null);
  const profileErrorRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  React.useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  React.useEffect(() => {
    profileErrorRef.current = profileError;
  }, [profileError]);

  // Dedup de loadProfile: 1 request por userId por vez.
  const inflightProfileRef = React.useRef<{ userId: string; promise: Promise<Profile | null> } | null>(null);
  const abortRetriedForUserRef = React.useRef<Set<string>>(new Set());

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
    (userId: string) => {
      const inflight = inflightProfileRef.current;
      if (inflight?.userId === userId) return inflight.promise;

      const promise = loadProfile(userId);
      inflightProfileRef.current = { userId, promise };

      promise.finally(() => {
        if (inflightProfileRef.current?.userId === userId) inflightProfileRef.current = null;
      });

      return promise;
    },
    [loadProfile],
  );

  const ensureProfile = React.useCallback(
    async (userId: string) => {
      // Evita re-fetch quando já está OK.
      if (profileRef.current?.user_id === userId && !profileErrorRef.current) return;

      try {
        const p = await withTimeout(loadProfileDedup(userId), 20000);

        // Só seta se ainda estamos no mesmo usuário.
        const currentUserId = sessionRef.current?.user?.id;
        if (currentUserId !== userId) return;

        setProfile(p);
        setProfileError(null);
      } catch (e: any) {
        if (isAbortError(e)) {
          // AbortError é esperado em concorrência do SDK. Nunca derruba profile/profileError.
          // Se ainda não temos profile, tenta uma única vez (controlada) depois.
          if (!profileRef.current && !abortRetriedForUserRef.current.has(userId)) {
            abortRetriedForUserRef.current.add(userId);
            window.setTimeout(() => {
              const stillUser = sessionRef.current?.user?.id;
              if (stillUser === userId) {
                void ensureProfile(userId);
              }
            }, 180);
          }
          return;
        }

        // Erro real.
        setProfile(null);
        setProfileError(formatSupabaseError(e));
        console.warn("[AuthContext] loadProfile_failed", e);
      }
    },
    [loadProfileDedup],
  );

  React.useEffect(() => {
    let active = true;

    // ÚNICA assinatura global do app.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      // Mantém session em memória.
      setSession(nextSession);

      const userId = nextSession?.user?.id || null;

      if (!userId) {
        abortRetriedForUserRef.current.clear();
        setProfile(null);
        setProfileError(null);
        if (!active) return;
        setLoading(false);
        return;
      }

      // Evita refazer profile em token refresh.
      if (event === "TOKEN_REFRESHED") {
        if (!active) return;
        setLoading(false);
        return;
      }

      // Para eventos que indicam sessão válida (inclui INITIAL_SESSION, SIGNED_IN, USER_UPDATED, etc.)
      await ensureProfile(userId);
      if (!active) return;
      setLoading(false);
    });

    // Safety net de bootstrap: caso o INITIAL_SESSION demore/trave, libera UI.
    const safety = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 25000);

    return () => {
      active = false;
      window.clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [ensureProfile]);

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
