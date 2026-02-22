import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";

// GET /api/jobs/:jobId — poll job status
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) =>
  withRouteError(async () => {
    await requireUser();
    const { jobId } = await params;

    const job = await prisma.datasetAgentJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        datasetId: true,
        status: true,
        resultJson: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) throw new Error("Job not found");

    return job;
  });
