-- CreateEnum
CREATE TYPE "ArtKind" AS ENUM ('PLANAS', 'SIMPLIFICA', 'NO_ENTRA');

-- CreateTable
CREATE TABLE "WorkshopPrintRule" (
    "workshopId" TEXT NOT NULL,
    "baseMesh" TEXT NOT NULL DEFAULT '43–48 hilos/cm',
    "basePasses" INTEGER NOT NULL DEFAULT 2,
    "colorMesh" TEXT NOT NULL DEFAULT '62–77 hilos/cm',
    "colorPasses" INTEGER NOT NULL DEFAULT 1,
    "fineMesh" TEXT NOT NULL DEFAULT '90 hilos/cm',
    "fineThresholdMm" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "inkNames" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopPrintRule_pkey" PRIMARY KEY ("workshopId")
);

-- CreateTable
CREATE TABLE "RequestArt" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "source" BYTEA NOT NULL,
    "preview" BYTEA NOT NULL,
    "kind" "ArtKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "fabric" "FabricTone" NOT NULL,
    "inkCount" INTEGER NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "dpi" INTEGER NOT NULL,
    "chokeMm" DOUBLE PRECISION NOT NULL,
    "colors" JSONB NOT NULL,
    "recipe" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestArt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestArt_requestId_key" ON "RequestArt"("requestId");

-- AddForeignKey
ALTER TABLE "WorkshopPrintRule" ADD CONSTRAINT "WorkshopPrintRule_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestArt" ADD CONSTRAINT "RequestArt_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
