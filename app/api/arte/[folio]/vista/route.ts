import { connection } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ folio: string }> }) {
  await connection();
  const { folio } = await context.params;
  const art = await prisma.requestArt.findFirst({
    where: { request: { folio: folio.toUpperCase() } },
    select: { preview: true },
  });
  if (!art) return new Response("No está la vista.", { status: 404 });

  return new Response(Buffer.from(art.preview), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}
