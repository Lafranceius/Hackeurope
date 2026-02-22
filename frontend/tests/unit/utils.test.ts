import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats usd values", () => {
    expect(formatCurrency(5000)).toBe("$5,000");
  });
});
