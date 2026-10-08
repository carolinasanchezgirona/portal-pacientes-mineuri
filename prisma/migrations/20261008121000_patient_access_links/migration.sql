-- Enlaces de acceso de un solo uso para pacientes
CREATE TABLE "enlaces_acceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "enlaces_acceso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enlaces_acceso_tokenHash_key" ON "enlaces_acceso"("tokenHash");
CREATE INDEX "enlaces_acceso_usuarioId_creadoEn_idx" ON "enlaces_acceso"("usuarioId", "creadoEn");
ALTER TABLE "enlaces_acceso" ADD CONSTRAINT "enlaces_acceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
