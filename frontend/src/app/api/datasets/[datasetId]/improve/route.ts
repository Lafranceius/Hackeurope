import { spawn } from "child_process";
import path from "path";

import { AttachmentOwnerType, OrgRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";

// ---------------------------------------------------------------------------
// Helper — fire-and-forget Python runner
// ---------------------------------------------------------------------------

function spawnAgentRunner(opts: {
  jobId: string;
  absoluteFilePath: string;
  callbackUrl: string;
  callbackSecret: string;
}): void {
  // Resolve the runner path relative to the repo root (two levels above frontend/src)
  const repoRoot = path.resolve(process.cwd(), "..");
  const runnerPath = path.join(repoRoot, "api", "runner.py");

  const python = process.env.PYTHON_EXECUTABLE ?? "python3";

  const child = spawn(
    python,
    [
      runnerPath,
      "--job-id", opts.jobId,
      "--file-path", opts.absoluteFilePath,
      "--callback-url", opts.callbackUrl,
      "--callback-secret", opts.callbackSecret,
    ],
    {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        // Ensure the Python process inherits the OpenAI key if set
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      },
    }
  );

  child.on("error", (err) => {
    console.error(`[improve] Failed to spawn Python runner for job ${opts.jobId}:`, err.message);
    // Mark job as FAILED so the UI doesn't hang
    void prisma.datasetAgentJob
      .update({
        where: { id: opts.jobId },
        data: {
          status: "FAILED",
          errorMessage: `Could not start Python runner: ${err.message}`,
        },
      })
      .catch(() => undefined);
  });

  child.unref();
}

// ---------------------------------------------------------------------------
// POST /api/datasets/:datasetId/improve
// ---------------------------------------------------------------------------

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const { datasetId } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true, orgId: true },
    });

    if (!dataset) throw new Error("Dataset not found");

    await requireOrgAccess(user.id, dataset.orgId, OrgRole.ADMIN);

    const fileAttachment = await prisma.attachment.findFirst({
      where: {
        ownerType: AttachmentOwnerType.DATASET,
        ownerId: datasetId,
      },
      select: { id: true, fileUrl: true, name: true },
    });

    if (!fileAttachment) throw new Error("Upload a file to improve this dataset.");

    // Resolve absolute path — Next.js cwd is frontend/, uploads live in frontend/uploads/
    const absoluteFilePath = path.join(
      process.cwd(),
      fileAttachment.fileUrl.startsWith("/") ? fileAttachment.fileUrl.slice(1) : fileAttachment.fileUrl
    );

    // Create the job record
    const job = await prisma.datasetAgentJob.create({
      data: {
        datasetId,
        attachmentId: fileAttachment.id,
        status: "QUEUED",
        inputJson: {
          fileUrl: fileAttachment.fileUrl,
          fileName: fileAttachment.name,
        },
      },
    });

    // Build callback URL
    const appUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
      `http://localhost:${process.env.PORT ?? 3000}`;
    const callbackUrl = `${appUrl}/api/jobs/${job.id}/complete`;
    const callbackSecret = process.env.AGENT_CALLBACK_SECRET ?? "dev-callback-secret";

    // Fire and forget — don't await
    spawnAgentRunner({
      jobId: job.id,
      absoluteFilePath,
      callbackUrl,
      callbackSecret,
    });

    return {
      jobId: job.id,
      datasetId,
      attachmentId: fileAttachment.id,
      message: "Agent job queued",
    };
  });
