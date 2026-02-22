import { assessDatasetFile } from "@/server/services/dataset-assessment";
import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";
import { assessDatasetSchema } from "@/server/validation";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    await requireUser();
    const payload = assessDatasetSchema.parse(await request.json());

    return assessDatasetFile({
      fileUrl: payload.fileUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize
    });
  });
