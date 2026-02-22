import path from "path";

import { HttpError, withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";
import { putBuffer } from "@/server/storage";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".csv", ".parquet", ".json", ".xlsx"]);

const getExtension = (fileName: string) => path.extname(fileName).toLowerCase();

export const POST = async (request: Request) =>
  withRouteError(async () => {
    await requireUser();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "Dataset file is required");
    }

    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new HttpError(400, "Unsupported file type. Use .csv, .parquet, .json, or .xlsx");
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      throw new HttpError(400, "File size must be between 1B and 50MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await putBuffer(file.name, buffer);

    return {
      fileUrl,
      fileName: file.name,
      fileSize: file.size
    };
  });
