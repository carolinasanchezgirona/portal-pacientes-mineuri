import { NextRequest, NextResponse } from "next/server";
import { requierePropioPaciente, registrarAcceso, obtenerSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Plantilla de referencia para el resto de rutas /api/*.
 * Todas deben seguir este patrón:
 *   1. Obtener sesión real
 *   2. Comprobar permisos (requiereProfesional / requierePropioPaciente)
 *   3. Registrar el acceso si es dato sensible
 *   4. Ejecutar la query SIEMPRE filtrada por pacienteId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await obtenerSesion();
  const { id } = await params;

  try {
    requierePropioPaciente(sesion, id);
  } catch (err) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await registrarAcceso({
    usuarioId: sesion?.id ?? "desconocido",
    accion: "VER_FICHA_PACIENTE",
    entidad: `Paciente:${id}`,
  });

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: {
      notasSesion: { orderBy: { fecha: "desc" } },
      consentimientosFirmados: true,
      testsRespuestas: { include: { test: true } },
      tecnicasAsignadas: { include: { tecnica: true } },
    },
  });

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  return NextResponse.json(paciente);
}