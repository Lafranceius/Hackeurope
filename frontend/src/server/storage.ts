import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import { env } from "@/server/env";

const uploadRoot = path.join(process.cwd(), "uploads");

export const putBuffer = async (fileName: string, buffer: Buffer) => {
  if (env.enableS3 && env.s3Endpoint && env.s3Bucket) {
    return `${env.s3Endpoint.replace(/\/$/, "")}/${env.s3Bucket}/${fileName}`;
  }

  await mkdir(uploadRoot, { recursive: true });
  const scopedName = `${randomUUID()}-${fileName}`;
  const fullPath = path.join(uploadRoot, scopedName);
  await writeFile(fullPath, buffer);
  return `/uploads/${scopedName}`;
};

export const makeDownloadUrl = (datasetId: string) => {
  if (env.enableS3 && env.s3Endpoint && env.s3Bucket) {
    return `${env.s3Endpoint.replace(/\/$/, "")}/${env.s3Bucket}/datasets/${datasetId}.zip`;
  }

  return `/downloads/${datasetId}.zip`;
};
