import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json({ ok: true, data }, init);

export const fail = (status: number, message: string) => NextResponse.json({ ok: false, error: message }, { status });

export const withRouteError = async <T>(fn: () => Promise<T>) => {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.status, error.message);
    }

    if (error instanceof Error) {
      if (error.message.startsWith("Forbidden")) {
        return fail(403, error.message);
      }
      if (error.message === "Unauthorized") {
        return fail(401, error.message);
      }
      return fail(400, error.message);
    }

    return fail(500, "Unexpected server error");
  }
};
