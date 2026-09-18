import { describe, expect, it } from "vitest";
import { looksLikeRealCredentials } from "./config";

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
