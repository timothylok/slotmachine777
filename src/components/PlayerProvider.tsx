"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { UNCONFIGURED, type SupabaseConfig } from "@/lib/supabase/config";
import {
  DEFAULT_STATE,
  GUEST_FLAG_KEY,
  mergeStates,
  type GameState,
} from "@/lib/gameState";
import { guestStore, loadProfile, saveProfile } from "@/lib/profileStore";
import { friendlyAuthError } from "@/lib/authErrors";

export type AuthMode = "loading" | "signed-out" | "guest" | "user";

interface PlayerContextValue {
  mode: AuthMode;
  user: User | null;
  state: GameState;
  /** Immediate in-memory update; the save to the backend is debounced. */
  update: (updater: (state: GameState) => GameState) => void;
  supabaseEnabled: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ ok: boolean; needsConfirmation: boolean }>;
  sendMagicLink: (email: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 1200;

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

export default function PlayerProvider({
  children,
  supabaseConfig = UNCONFIGURED,
}: {
  children: React.ReactNode;
  /** Supplied by the server component; the browser never reads process.env. */
  supabaseConfig?: SupabaseConfig;
}) {
  const { url, anonKey, configured: isSupabaseConfigured } = supabaseConfig;
  const supabase = useMemo(
    () => getSupabaseBrowserClient({ url, anonKey, configured: isSupabaseConfigured }),
    [url, anonKey, isSupabaseConfigured],
  );
  const [mode, setMode] = useState<AuthMode>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<number | null>(null);
  const latestState = useRef(state);
  const activeUserId = useRef<string | null>(null);

  // --- session bootstrap -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function applySession(session: Session | null) {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      activeUserId.current = nextUser?.id ?? null;

      if (!nextUser) {
        const guest = guestStore.load();
        const wasGuest =
          typeof localStorage !== "undefined" &&
          localStorage.getItem(GUEST_FLAG_KEY) === "1";
        setUser(null);
        setState(guest);
        latestState.current = guest;
        setMode(wasGuest || !isSupabaseConfigured ? "guest" : "signed-out");
        return;
      }

      setUser(nextUser);
      const local = guestStore.load();
      const remote = supabase
        ? await loadProfile(supabase, nextUser.id)
        : { ...DEFAULT_STATE };
      if (cancelled) return;

      const merged = mergeStates(local, remote);
      setState(merged);
      latestState.current = merged;
      setMode("user");
      if (supabase) void saveProfile(supabase, nextUser.id, merged);
    }

    if (!supabase) {
      void applySession(null);
      return () => {
        cancelled = true;
      };
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, isSupabaseConfigured]);

  // --- persistence -------------------------------------------------------
  const flush = useCallback(() => {
    const snapshot = latestState.current;
    const userId = activeUserId.current;
    if (userId && supabase) {
      void saveProfile(supabase, userId, snapshot);
    } else {
      guestStore.save(snapshot);
    }
  }, [supabase]);

  const update = useCallback(
    (updater: (current: GameState) => GameState) => {
      setState((current) => {
        const next = updater(current);
        latestState.current = next;
        return next;
      });
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Don't lose the last few spins when the tab goes away.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [flush]);

  // --- auth actions ------------------------------------------------------
  const guard = useCallback(async <T,>(fn: () => Promise<T>, fallback: T) => {
    if (!supabase) {
      setError("Accounts are not configured on this deployment.");
      return fallback;
    }
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (thrown) {
      setError(
        friendlyAuthError(
          thrown instanceof Error ? thrown.message : String(thrown),
        ),
      );
      return fallback;
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  const signIn = useCallback(
    (email: string, password: string) =>
      guard(async () => {
        const { error: err } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(friendlyAuthError(err.message));
          return false;
        }
        localStorage.removeItem(GUEST_FLAG_KEY);
        return true;
      }, false),
    [guard, supabase],
  );

  const signUp = useCallback(
    (email: string, password: string, displayName: string) =>
      guard(
        async () => {
          const { data, error: err } = await supabase!.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName || email.split("@")[0] },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          if (err) {
            setError(friendlyAuthError(err.message));
            return { ok: false, needsConfirmation: false };
          }
          localStorage.removeItem(GUEST_FLAG_KEY);
          return { ok: true, needsConfirmation: !data.session };
        },
        { ok: false, needsConfirmation: false },
      ),
    [guard, supabase],
  );

  const sendMagicLink = useCallback(
    (email: string) =>
      guard(async () => {
        const { error: err } = await supabase!.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) {
          setError(friendlyAuthError(err.message));
          return false;
        }
        return true;
      }, false),
    [guard, supabase],
  );

  const resetPassword = useCallback(
    (email: string) =>
      guard(async () => {
        const { error: err } = await supabase!.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/auth/callback?next=/` },
        );
        if (err) {
          setError(friendlyAuthError(err.message));
          return false;
        }
        return true;
      }, false),
    [guard, supabase],
  );

  const signOut = useCallback(async () => {
    flush();
    if (supabase) await supabase.auth.signOut();
    try {
      localStorage.removeItem(GUEST_FLAG_KEY);
    } catch {
      // ignore
    }
    activeUserId.current = null;
    setUser(null);
    setMode(isSupabaseConfigured ? "signed-out" : "guest");
    const guest = guestStore.load();
    setState(guest);
    latestState.current = guest;
  }, [flush, supabase, isSupabaseConfigured]);

  const continueAsGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_FLAG_KEY, "1");
    } catch {
      // ignore
    }
    setMode("guest");
  }, []);

  const value: PlayerContextValue = {
    mode,
    user,
    state,
    update,
    supabaseEnabled: isSupabaseConfigured,
    busy,
    error,
    clearError: () => setError(null),
    signIn,
    signUp,
    sendMagicLink,
    resetPassword,
    signOut,
    continueAsGuest,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
