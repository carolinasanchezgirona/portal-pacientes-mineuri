-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PROFESIONAL', 'PACIENTE');

-- CreateEnum
CREATE TYPE "ModalidadCita" AS ENUM ('PRESENCIAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "TipoTest" AS ENUM ('PROPIO_DIGITAL', 'COMERCIAL_EXTERNO');

-- CreateEnum
CREATE TYPE "TipoCorreccion" AS ENUM ('AUTOMATICA', 'MANUAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcceso" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "invitacionToken" TEXT,
    "invitacionEnviada" TIMESTAMP(3),
    "invitacionAceptada" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_recurrente" (
    "id" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "modalidades" "ModalidadCita"[],
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "disponibilidad_recurrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos_agenda" (
    "id" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "bloqueos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 45,
    "modalidad" "ModalidadCita" NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'CONFIRMADA',
    "enlaceVideollamada" TEXT,
    "direccion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladaEn" TIMESTAMP(3),

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_sesion" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "visibleParaPaciente" BOOLEAN NOT NULL DEFAULT false,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos_plantillas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "bloqueante" BOOLEAN NOT NULL DEFAULT false,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "consentimientos_plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos_firmados" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "firmaImagenUrl" TEXT NOT NULL,
    "textoFirmado" TEXT NOT NULL,
    "versionFirmada" TEXT NOT NULL,
    "firmadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipFirma" TEXT NOT NULL,
    "documentoPdfUrl" TEXT,
    "revocadoEn" TIMESTAMP(3),
    "motivoRevocacion" TEXT,

    CONSTRAINT "consentimientos_firmados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests_biblioteca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoTest" "TipoTest" NOT NULL,
    "tipoCorreccion" "TipoCorreccion" NOT NULL,
    "itemsJson" JSONB,
    "baremoJson" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tests_biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests_respuestas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEn" TIMESTAMP(3),
    "respuestasJson" JSONB,
    "puntuacionAutomatica" JSONB,
    "resultadoManual" JSONB,
    "informeAdjuntoUrl" TEXT,
    "interpretacionClinica" TEXT,
    "interpretadoEn" TIMESTAMP(3),

    CONSTRAINT "tests_respuestas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicas_biblioteca" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "contenidoUrl" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tecnicas_biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicas_asignadas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tecnicaId" TEXT NOT NULL,
    "asignadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadaEn" TIMESTAMP(3),
    "notaProfesional" TEXT,

    CONSTRAINT "tecnicas_asignadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_acceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_usuarioId_key" ON "pacientes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_invitacionToken_key" ON "pacientes"("invitacionToken");

-- CreateIndex
CREATE UNIQUE INDEX "notas_sesion_citaId_key" ON "notas_sesion"("citaId");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_sesion" ADD CONSTRAINT "notas_sesion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_sesion" ADD CONSTRAINT "notas_sesion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_firmados" ADD CONSTRAINT "consentimientos_firmados_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_firmados" ADD CONSTRAINT "consentimientos_firmados_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "consentimientos_plantillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests_respuestas" ADD CONSTRAINT "tests_respuestas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests_respuestas" ADD CONSTRAINT "tests_respuestas_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests_biblioteca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicas_asignadas" ADD CONSTRAINT "tecnicas_asignadas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicas_asignadas" ADD CONSTRAINT "tecnicas_asignadas_tecnicaId_fkey" FOREIGN KEY ("tecnicaId") REFERENCES "tecnicas_biblioteca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_acceso" ADD CONSTRAINT "logs_acceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
