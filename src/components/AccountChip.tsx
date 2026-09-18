"use client";

import { usePlayer } from "./PlayerProvider";

/** Shows who is playing, and how to leave or upgrade a guest session. */
export default function AccountChip() {
  const { mode, user, signOut, supabaseEnabled, state } = usePlayer();

  if (mode === "loading") return null;

  if (mode === "user") {
    const name =
      (user?.user_metadata?.display_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      "Player";
    return (
      <div className="account">
        <span className="account-name" title={user?.email ?? undefined}>
          👤 {name}
        </span>
        <span className="account-sync">☁ synced · {state.spins} spins</span>
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      <span className="account-name">🎲 Guest</span>
      {supabaseEnabled && (
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          Sign in to save
        </button>
      )}
    </div>
  );
}
