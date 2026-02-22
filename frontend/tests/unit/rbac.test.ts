import { describe, expect, it } from "vitest";

import { hasAtLeastRole, roleRank } from "@/server/rbac";

describe("rbac role ranking", () => {
  it("keeps OWNER above ADMIN and MEMBER", () => {
    expect(roleRank.OWNER).toBeGreaterThan(roleRank.ADMIN);
    expect(roleRank.ADMIN).toBeGreaterThan(roleRank.MEMBER);
  });

  it("checks minimum role correctly", () => {
    expect(hasAtLeastRole("ADMIN", "MEMBER")).toBe(true);
    expect(hasAtLeastRole("VIEWER", "ADMIN")).toBe(false);
  });
});
