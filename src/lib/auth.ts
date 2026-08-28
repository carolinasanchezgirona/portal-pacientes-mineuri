/**
 * Autenticación y control de acceso por rol.
 *
 * Reglas clave de seguridad para este proyecto:
 * - Rol PROFESIONAL: puede ver todos los pacientes.
 * - Rol PACIENTE: SOLO puede ver/modificar datos donde pacienteId === su propio id.
 *   Esto debe comprobarse en CADA query, nunca confiar solo en la UI.
 * - Toda acción sensible (ver ficha, descargar consentimiento, ver test)
 *   debe registrar una entrada en LogAcceso.
 */

import type { Rol } from "@prisma/client";
import { auth } from "@/lib/next-auth";

export type SesionUsuario = {
  id: string;
  email: string;
  rol: Rol;
  pacienteId?: string; // solo presente si rol === "PACIENTE"
};

/**
 * Obtiene la sesión real (next-auth) ya tipada. Usar en server components,
 * route handlers y server actions en lugar de leer `auth()` directamente,
 * para mantener un único punto de tipado.
 */
export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const sesion = await auth();
  if (!sesion?.user) return null;

  const user = sesion.user as any;
  return {
    id: user.id,
    email: user.email,
    rol: user.rol,
    pacienteId: user.pacienteId,
  };
}

/**
 * Lanza si el usuario no es profesional. Usar al inicio de
 * cualquier route handler o server action de zona profesional.
 */
export function requiereProfesional(sesion: SesionUsuario | null) {
  if (!sesion || sesion.rol !== "PROFESIONAL") {
    throw new Error("No autorizado: se requiere rol profesional");
  }
}

/**
 * Lanza si el paciente autenticado intenta acceder a datos que no son suyos.
 * Usar en TODAS las rutas /api/* y server actions de la zona paciente.
 */
export function requierePropioPaciente(
  sesion: SesionUsuario | null,
  pacienteIdSolicitado: string
) {
  if (!sesion) throw new Error("No autenticado");

  if (sesion.rol === "PROFESIONAL") return; // la profesional ve todo

  if (sesion.rol === "PACIENTE" && sesion.pacienteId !== pacienteIdSolicitado) {
    throw new Error("No autorizado: no puedes acceder a datos de otro paciente");
  }
}

/**
 * TODO: implementar registro real en tabla LogAcceso.
 * Llamar tras cada acceso a datos sensibles (ficha, test, consentimiento).
 */
export async function registrarAcceso(params: {
  usuarioId: string;
  accion: string;
  entidad?: string;
  ip?: string;
}) {
  // await prisma.logAcceso.create({ data: params })
  console.log("[log_acceso]", params);
}
