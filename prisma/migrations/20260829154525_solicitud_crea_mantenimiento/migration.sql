-- CreateEnum
CREATE TYPE "AutorCancelacion" AS ENUM ('CLIENTE', 'TECNICO', 'ADMIN');

-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "mantenimientos" ADD COLUMN     "canceladoEn" TIMESTAMP(3),
ADD COLUMN     "canceladoPorId" TEXT,
ADD COLUMN     "canceladoPorRol" "AutorCancelacion",
ADD COLUMN     "motivoCancelacion" TEXT,
ADD COLUMN     "solicitudId" TEXT,
ALTER COLUMN "tecnicoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "solicitudes_servicio" ADD COLUMN     "canceladoEn" TIMESTAMP(3),
ADD COLUMN     "canceladoPorId" TEXT,
ADD COLUMN     "canceladoPorRol" "AutorCancelacion",
ADD COLUMN     "motivoCancelacion" TEXT;

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL DEFAULT 'unica',
    "diasProgramacion" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mantenimientos_solicitudId_key" ON "mantenimientos"("solicitudId");

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_servicio" ADD CONSTRAINT "solicitudes_servicio_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

