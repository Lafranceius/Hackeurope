import { AgentJobStatus } from "@prisma/client";
import { timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";

// POST /api/jobs/:jobId/complete — internal callback from Python runner.
// Not protected by session auth; protected by shared secret instead.
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) => {
  try {
    const { jobId } = await params;

    // Validate callback secret (timing-safe)
    const expected = process.env.AGENT_CALLBACK_SECRET ?? "dev-callback-secret";
    const provided = request.headers.get("X-Callback-Secret") ?? "";
    let secretOk = false;
    try {
      secretOk = timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    } catch {
      secretOk = false;
    }
    if (!secretOk) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      status: "SUCCEEDED" | "FAILED";
      resultJson?: unknown;
      errorMessage?: string;
    };

    if (!["SUCCEEDED", "FAILED"].includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const job = await prisma.datasetAgentJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    await prisma.datasetAgentJob.update({
      where: { id: jobId },
      data: {
        status: body.status as AgentJobStatus,
        resultJson: body.resultJson ?? undefined,
        errorMessage: body.errorMessage ?? null,
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[jobs/complete] Error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
};
