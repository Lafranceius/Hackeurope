import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

const uploadRoot = path.join(process.cwd(), "uploads");

const contentTypeByExtension: Record<string, string> = {
  ".csv": "text/csv",
  ".json": "application/json",
  ".parquet": "application/octet-stream",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export const GET = async (_request: Request, { params }: { params: Promise<{ file: string }> }) => {
  const { file } = await params;
  const safeName = path.basename(file);
  const fullPath = path.join(uploadRoot, safeName);

  try {
    const data = await readFile(fullPath);
    const contentType = contentTypeByExtension[path.extname(safeName).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
};
