import { connection } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ folio: string }> }) {
  await connection();
  const { folio } = await context.params;
  const art = await prisma.requestArt.findFirst({
    where: { request: { folio: folio.toUpperCase() } },
    select: { source: true, mimeType: true, fileName: true },
  });
  if (!art) return new Response("No está el archivo.", { status: 404 });

  return new Response(Buffer.from(art.source), {
    headers: {
      "Content-Type": art.mimeType,
      "Content-Disposition": `inline; filename="${art.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
