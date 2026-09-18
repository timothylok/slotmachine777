// Supabase error strings are developer-facing. Translate the ones a player can
// actually hit into something readable, and pass anything else through.

const RULES: [RegExp, string][] = [
  [
    /failed to fetch|network ?error|load failed/i,
    "Could not reach the accounts server. Check your connection and try again.",
  ],
  [
    /invalid login credentials/i,
    "That email and password don't match an account.",
  ],
  [
    /email not confirmed/i,
    "Confirm your email address first — check your inbox for the link.",
  ],
  [
    /user already registered|already been registered/i,
    "That email already has an account. Try signing in instead.",
  ],
  [
    /password should be at least/i,
    "Pick a password with at least 8 characters.",
  ],
  [
    /rate limit|too many requests/i,
    "Too many attempts. Wait a minute and try again.",
  ],
  [/unable to validate email|invalid format/i, "That email address looks wrong."],
];

export function friendlyAuthError(message: string | null | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Something went wrong. Please try again.";
  for (const [pattern, friendly] of RULES) {
    if (pattern.test(raw)) return friendly;
  }
  return raw;
}
