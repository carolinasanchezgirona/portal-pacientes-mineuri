import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";

const ESTADOS_PERMITIDOS = new Set([
  "confirmed",
  "pending",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled",
]);

type ActualizacionCita = {
  action?: "cancel" | "set_status";
  status?: string;
};

// PATCH /api/citas-dememoria/[id] — actualiza el estado administrativo de una cita
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  let body: ActualizacionCita = {};

  try {
    body = await request.json();
  } catch {
    // Compatibilidad con la interfaz anterior, que cancelaba sin cuerpo.
    body = { action: "cancel" };
  }

  const nextStatus = body.action === "cancel" ? "cancelled" : body.status;

  if (!nextStatus || !ESTADOS_PERMITIDOS.has(nextStatus)) {
    return NextResponse.json({ error: "Estado de cita no válido" }, { status: 400 });
  }

  const { data, error } = await citasSupabase
    .from("appointment_bookings")
    .update({ status: nextStatus })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, booking: data });
}
