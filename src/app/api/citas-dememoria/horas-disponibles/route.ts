import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";

// GET /api/citas-dememoria/horas-disponibles
// Devuelve los huecos reales de 60 min según tu disponibilidad configurada,
// sin el límite de 24h que sí aplica a la reserva pública.
export async function GET() {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await citasSupabase.rpc("get_professional_appointment_starts", {
    p_days: 30,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data });
}