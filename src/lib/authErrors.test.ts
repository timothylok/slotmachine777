import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./authErrors";

describe("friendlyAuthError", () => {
  it("explains a network failure in plain language", () => {
    expect(friendlyAuthError("Failed to fetch")).toMatch(
      /could not reach the accounts server/i,
    );
    expect(friendlyAuthError("NetworkError when attempting to fetch")).toMatch(
      /could not reach/i,
    );
  });

  it("rewrites the common credential errors", () => {
    expect(friendlyAuthError("Invalid login credentials")).toMatch(
      /don't match an account/i,
    );
    expect(friendlyAuthError("Email not confirmed")).toMatch(/confirm your email/i);
    expect(friendlyAuthError("User already registered")).toMatch(
      /already has an account/i,
    );
  });

  it("falls back to a generic message when there is nothing to show", () => {
    expect(friendlyAuthError("")).toMatch(/something went wrong/i);
    expect(friendlyAuthError(null)).toMatch(/something went wrong/i);
    expect(friendlyAuthError(undefined)).toMatch(/something went wrong/i);
  });

  it("passes unknown messages through unchanged", () => {
    expect(friendlyAuthError("Signups not allowed for this instance")).toBe(
      "Signups not allowed for this instance",
    );
  });
});
