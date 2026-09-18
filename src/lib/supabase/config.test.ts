import { afterEach, describe, expect, it } from "vitest";
import { looksLikeRealCredentials, readSupabaseEnv } from "./config";

const KEY = "sb-anon-key-that-is-long-enough-to-be-real";

describe("looksLikeRealCredentials", () => {
  it("accepts a real-looking project URL and key", () => {
    expect(looksLikeRealCredentials("https://abcdefgh.supabase.co", KEY)).toBe(
      true,
    );
  });

  it("rejects missing values so the app falls back to guest mode", () => {
    expect(looksLikeRealCredentials("", KEY)).toBe(false);
    expect(looksLikeRealCredentials("https://abcdefgh.supabase.co", "")).toBe(
      false,
    );
  });

  it("rejects the .env.example placeholders", () => {
    expect(
      looksLikeRealCredentials("https://your-project.supabase.co", KEY),
    ).toBe(false);
    expect(
      looksLikeRealCredentials("https://abcdefgh.supabase.co", "your-anon-key"),
    ).toBe(false);
  });

  it("rejects a malformed or insecure URL", () => {
    expect(looksLikeRealCredentials("not-a-url", KEY)).toBe(false);
    expect(looksLikeRealCredentials("http://abcdefgh.supabase.co", KEY)).toBe(
      false,
    );
  });

  it("rejects an implausibly short key", () => {
    expect(looksLikeRealCredentials("https://abcdefgh.supabase.co", "short")).toBe(
      false,
    );
  });
});

describe("readSupabaseEnv", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reads the private (unprefixed) variable names", () => {
    process.env.SUPABASE_URL = "https://abcdefgh.supabase.co";
    process.env.SUPABASE_ANON_KEY = KEY;
    expect(readSupabaseEnv()).toEqual({
      url: "https://abcdefgh.supabase.co",
      anonKey: KEY,
      configured: true,
    });
  });

  it("ignores NEXT_PUBLIC_ variants, which must no longer be used", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefgh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = KEY;
    expect(readSupabaseEnv().configured).toBe(false);
  });

  it("reports unconfigured when the variables are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    expect(readSupabaseEnv()).toEqual({ url: "", anonKey: "", configured: false });
  });
});
