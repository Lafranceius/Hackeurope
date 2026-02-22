import { NextResponse } from "next/server";

export const GET = async (_request: Request, { params }: { params: Promise<{ file: string }> }) => {
  const { file } = await params;
  return new NextResponse(`Placeholder dataset archive for ${file}`, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${file}"`
    }
  });
};
