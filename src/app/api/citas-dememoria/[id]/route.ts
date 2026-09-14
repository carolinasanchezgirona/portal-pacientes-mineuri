import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";

// PATCH /api/citas-dememoria/[id] — cancela una cita
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

  const { error } = await citasSupabase
    .from("appointment_bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}