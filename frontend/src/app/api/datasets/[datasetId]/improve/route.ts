import { AttachmentOwnerType, OrgRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { assessDatasetFile } from "@/server/services/dataset-assessment";

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const { datasetId } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true, orgId: true }
    });

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    await requireOrgAccess(user.id, dataset.orgId, OrgRole.ADMIN);

    const fileAttachment = await prisma.attachment.findFirst({
      where: {
        ownerType: AttachmentOwnerType.DATASET,
        ownerId: datasetId
      },
      select: { id: true, fileUrl: true, name: true }
    });

    if (!fileAttachment) {
      throw new Error("Upload a file to improve this dataset.");
    }

    const assessment = await assessDatasetFile({
      fileUrl: fileAttachment.fileUrl,
      fileName: fileAttachment.name
    });

    return {
      datasetId,
      attachmentId: fileAttachment.id,
      message: "Dataset improvement triggered",
      cleanedFile: {
        fileUrl: fileAttachment.fileUrl,
        fileName: fileAttachment.name
      },
      assessment
    };
  });
