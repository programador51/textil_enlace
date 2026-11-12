-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkshopSize" AS ENUM ('CHICO', 'MEDIANO');

-- CreateEnum
CREATE TYPE "DesignClass" AS ENUM ('POCOS_COLORES', 'FOTO', 'NOMBRE_NUMERO', 'SIN_ARCHIVO');

-- CreateEnum
CREATE TYPE "FabricTone" AS ENUM ('CLARA', 'OSCURA', 'SIN_DATO');

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" "WorkshopSize" NOT NULL,
    "zone" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopProcess" (
    "workshopId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,

    CONSTRAINT "WorkshopProcess_pkey" PRIMARY KEY ("workshopId","processId")
);

-- CreateTable
CREATE TABLE "Garment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Garment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopGarment" (
    "workshopId" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,

    CONSTRAINT "WorkshopGarment_pkey" PRIMARY KEY ("workshopId","garmentId")
);

-- CreateTable
CREATE TABLE "OrientationRule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "OrientationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrientationRuleProcess" (
    "ruleId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,

    CONSTRAINT "OrientationRuleProcess_pkey" PRIMARY KEY ("ruleId","processId")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "garmentSlug" TEXT NOT NULL,
    "garmentLabel" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "designClass" "DesignClass" NOT NULL,
    "fabric" "FabricTone" NOT NULL,
    "neededBy" DATE NOT NULL,
    "zone" TEXT NOT NULL,
    "note" TEXT,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestOrientation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "RequestOrientation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_email_key" ON "Workshop"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Process_slug_key" ON "Process"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Garment_slug_key" ON "Garment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrientationRule_slug_key" ON "OrientationRule"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Request_folio_key" ON "Request"("folio");

-- CreateIndex
CREATE INDEX "Delivery_workshopId_idx" ON "Delivery"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_requestId_workshopId_key" ON "Delivery"("requestId", "workshopId");

-- AddForeignKey
ALTER TABLE "WorkshopProcess" ADD CONSTRAINT "WorkshopProcess_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcess" ADD CONSTRAINT "WorkshopProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopGarment" ADD CONSTRAINT "WorkshopGarment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopGarment" ADD CONSTRAINT "WorkshopGarment_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "Garment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrientationRuleProcess" ADD CONSTRAINT "OrientationRuleProcess_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "OrientationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrientationRuleProcess" ADD CONSTRAINT "OrientationRuleProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestOrientation" ADD CONSTRAINT "RequestOrientation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
