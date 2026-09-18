"use client";

import { useState } from "react";
import { usePlayer } from "./PlayerProvider";

type Tab = "signin" | "signup" | "magic";

export default function AuthGate() {
  const {
    mode,
    busy,
    error,
    clearError,
    signIn,
    signUp,
    sendMagicLink,
    resetPassword,
    continueAsGuest,
    supabaseEnabled,
  } = usePlayer();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (mode !== "signed-out") return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    clearError();

    if (tab === "signin") {
      await signIn(email.trim(), password);
      return;
    }
    if (tab === "magic") {
      const ok = await sendMagicLink(email.trim());
      if (ok) setNotice("Check your inbox for the sign-in link.");
      return;
    }
    const { ok, needsConfirmation } = await signUp(
      email.trim(),
      password,
      displayName.trim(),
    );
    if (ok && needsConfirmation) {
      setNotice("Account created — confirm your email to finish signing in.");
    }
  }

  async function onForgotPassword() {
    setNotice(null);
    clearError();
    if (!email.trim()) {
      setNotice("Enter your email address first.");
      return;
    }
    const ok = await resetPassword(email.trim());
    if (ok) setNotice("Password reset link sent.");
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="modal-card auth-card">
        <h2 className="auth-title">
          <span className="logo-7">7</span> Welcome to Lucky Sevens
        </h2>
        <p className="modal-note">
          Sign in to keep your credits across devices, or jump straight in as a
          guest — guest progress is saved in this browser only.
        </p>

        {supabaseEnabled ? (
          <>
            <div className="tabs" role="tablist">
              {(
                [
                  ["signin", "Sign in"],
                  ["signup", "Create account"],
                  ["magic", "Email link"],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  className={`tab${tab === id ? " tab-on" : ""}`}
                  onClick={() => {
                    setTab(id);
                    setNotice(null);
                    clearError();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              {tab === "signup" && (
                <label className="field">
                  <span>Display name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="High Roller"
                    autoComplete="nickname"
                  />
                </label>
              )}

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              {tab !== "magic" && (
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={
                      tab === "signup" ? "new-password" : "current-password"
                    }
                  />
                </label>
              )}

              {error && <p className="form-error">{error}</p>}
              {notice && <p className="form-notice">{notice}</p>}

              <button className="btn btn-spin" type="submit" disabled={busy}>
                {busy
                  ? "Working…"
                  : tab === "signin"
                    ? "Sign in"
                    : tab === "signup"
                      ? "Create account"
                      : "Send link"}
              </button>

              {tab === "signin" && (
                <button
                  type="button"
                  className="btn btn-ghost btn-link"
                  onClick={onForgotPassword}
                  disabled={busy}
                >
                  Forgot password?
                </button>
              )}
            </form>
          </>
        ) : (
          <p className="form-notice">
            Accounts are not configured on this deployment yet. Add your
            Supabase keys to <code>.env.local</code> to enable sign-in.
          </p>
        )}

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button className="btn btn-guest" onClick={continueAsGuest}>
          🎲 Play as guest
        </button>
      </div>
    </div>
  );
}
