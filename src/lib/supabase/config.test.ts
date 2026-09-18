import { afterEach, describe, expect, it } from "vitest";
import {
  firstLine,
  isPublishableKey,
  jwtRole,
  looksLikeRealCredentials,
  readSupabaseEnv,
} from "./config";

/**
 * Builds a Supabase-shaped JWT with the given role. The signature is
 * irrelevant here — nothing verifies it locally, only the role claim is read.
 */
function jwt(role: string): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    iss: "supabase",
    ref: "abcdefgh",
    role,
    iat: 1773707450,
    exp: 2089283450,
  })}.c2lnbmF0dXJl`;
}

const ANON = jwt("anon");
const SERVICE_ROLE = jwt("service_role");
const PUBLISHABLE = "sb_publishable_abcdefghijklmnop";
const URL_OK = "https://abcdefgh.supabase.co";

describe("jwtRole", () => {
  it("reads the role claim", () => {
    expect(jwtRole(ANON)).toBe("anon");
    expect(jwtRole(SERVICE_ROLE)).toBe("service_role");
  });

  it("returns null for anything that is not a JWT", () => {
    expect(jwtRole("sb_publishable_abc")).toBeNull();
    expect(jwtRole("77fa1f5d-db52-4c7e-9f11-8ac63a35530a")).toBeNull();
    expect(jwtRole("a.b.c")).toBeNull();
    expect(jwtRole("")).toBeNull();
  });
});

describe("isPublishableKey", () => {
  it("accepts a legacy anon JWT and a publishable key", () => {
    expect(isPublishableKey(ANON)).toBe(true);
    expect(isPublishableKey(PUBLISHABLE)).toBe(true);
  });

  it("refuses a service_role JWT — it must never reach the browser", () => {
    expect(isPublishableKey(SERVICE_ROLE)).toBe(false);
  });

  it("refuses an sb_secret_ key", () => {
    expect(isPublishableKey("sb_secret_abcdefghijklmnop")).toBe(false);
  });

  it("refuses a UUID, which is an ID rather than a key", () => {
    expect(isPublishableKey("77fa1f5d-db52-4c7e-9f11-8ac63a35530a")).toBe(false);
  });

  it("refuses empty values and anything containing whitespace", () => {
    expect(isPublishableKey("")).toBe(false);
    expect(isPublishableKey(`${ANON} ${SERVICE_ROLE}`)).toBe(false);
  });
});

describe("looksLikeRealCredentials", () => {
  it("accepts a real-looking project URL and key", () => {
    expect(looksLikeRealCredentials(URL_OK, ANON)).toBe(true);
    expect(looksLikeRealCredentials(URL_OK, PUBLISHABLE)).toBe(true);
  });

  it("rejects missing values so the app falls back to guest mode", () => {
    expect(looksLikeRealCredentials("", ANON)).toBe(false);
    expect(looksLikeRealCredentials(URL_OK, "")).toBe(false);
  });

  it("rejects the .env.example placeholders", () => {
    expect(
      looksLikeRealCredentials("https://your-project.supabase.co", ANON),
    ).toBe(false);
    expect(looksLikeRealCredentials(URL_OK, "your-anon-key")).toBe(false);
  });

  it("rejects a malformed or insecure URL", () => {
    expect(looksLikeRealCredentials("not-a-url", ANON)).toBe(false);
    expect(looksLikeRealCredentials("http://abcdefgh.supabase.co", ANON)).toBe(
      false,
    );
  });

  it("rejects a key of the wrong shape, however long", () => {
    expect(looksLikeRealCredentials(URL_OK, "short")).toBe(false);
    expect(
      looksLikeRealCredentials(
        URL_OK,
        "a-very-long-string-that-is-not-a-key-at-all",
      ),
    ).toBe(false);
  });
});

describe("firstLine", () => {
  it("keeps the first line and trims it", () => {
    expect(firstLine("  value  \nsecond")).toBe("value");
    expect(firstLine("value\r\nsecond")).toBe("value");
    expect(firstLine("")).toBe("");
  });
});

describe("readSupabaseEnv", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reads the private (unprefixed) variable names", () => {
    process.env.SUPABASE_URL = URL_OK;
    process.env.SUPABASE_ANON_KEY = ANON;
    expect(readSupabaseEnv()).toEqual({
      url: URL_OK,
      anonKey: ANON,
      configured: true,
    });
  });

  it("ignores NEXT_PUBLIC_ variants, which must no longer be used", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_OK;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON;
    expect(readSupabaseEnv().configured).toBe(false);
  });

  it("reports unconfigured when the variables are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    expect(readSupabaseEnv()).toEqual({
      url: "",
      anonKey: "",
      configured: false,
    });
  });

  it("keeps only the first line, so a second variable cannot be published", () => {
    process.env.SUPABASE_URL = URL_OK;
    process.env.SUPABASE_ANON_KEY = `${ANON}\nSUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE}`;

    const config = readSupabaseEnv();
    expect(config.anonKey).toBe(ANON);
    expect(JSON.stringify(config)).not.toContain(SERVICE_ROLE);
    expect(config.configured).toBe(true);
  });

  it("stays unconfigured when a service_role key is pasted into the anon slot", () => {
    process.env.SUPABASE_URL = URL_OK;
    process.env.SUPABASE_ANON_KEY = SERVICE_ROLE;
    expect(readSupabaseEnv().configured).toBe(false);
  });

  it("handles CRLF and surrounding whitespace", () => {
    process.env.SUPABASE_URL = `  ${URL_OK}  \r\njunk`;
    process.env.SUPABASE_ANON_KEY = `  ${ANON}\r\nmore junk`;
    expect(readSupabaseEnv()).toEqual({
      url: URL_OK,
      anonKey: ANON,
      configured: true,
    });
  });
});
