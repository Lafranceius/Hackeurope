import { NextResponse } from "next/server";

export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return new NextResponse(`Invoice placeholder for contract ${id}`, {
    headers: {
      "Content-Type": "application/pdf"
    }
  });
};
