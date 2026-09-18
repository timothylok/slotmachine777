// Reports whether the current environment yields a usable Supabase config.
import { readSupabaseEnv, jwtRole, isPublishableKey } from "../src/lib/supabase/config";

const raw = process.env.SUPABASE_ANON_KEY ?? "";
const config = readSupabaseEnv();

console.log("url        :", config.url || "(unset)");
console.log("key length :", raw.length);
console.log("key shape  :", raw.startsWith("sb_publishable_")
  ? "publishable"
  : raw.startsWith("sb_secret_")
    ? "SECRET (must never be used here)"
    : (jwtRole(raw) ? `JWT role=${jwtRole(raw)}` : "unrecognised"));
console.log("publishable:", isPublishableKey(raw));
console.log("configured :", config.configured);
console.log(config.configured
  ? "=> app will enable accounts"
  : "=> app falls back to GUEST-ONLY mode");
