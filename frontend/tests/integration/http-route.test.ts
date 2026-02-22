import { describe, expect, it } from "vitest";

import { HttpError, withRouteError } from "@/server/http";

describe("withRouteError", () => {
  it("maps HttpError status", async () => {
    const response = await withRouteError(async () => {
      throw new HttpError(418, "teapot");
    });

    const body = await response.json();
    expect(response.status).toBe(418);
    expect(body.error).toBe("teapot");
  });
});
