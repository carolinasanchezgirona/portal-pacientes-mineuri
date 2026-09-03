import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";

type BloqueoInput = {
  reason: string;
  startsAtIso: string;
  durationMinutes: number;
  recurring?: { intervalDays: number; count: number };
};

async function hayChoque(startsAt: Date, endsAt: Date): Promise<boolean> {
  const { data } = await citasSupabase
    .from("appointment_bookings")
    .select("id")
    .in("status", ["confirmed", "pending"])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .limit(1);
  return !!data && data.length > 0;
}

// POST /api/citas-dememoria/bloqueo — bloquea un hueco (con recurrencia opcional)
export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: BloqueoInput = await request.json();
  const reason = body.reason?.trim() || "Bloqueado";
  const { startsAtIso, durationMinutes } = body;

  if (!startsAtIso || !durationMinutes) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const baseStart = new Date(startsAtIso);
  const intervalDays = body.recurring?.intervalDays ?? 0;
  const count = body.recurring?.count ?? 1;

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const startsAt = new Date(baseStart.getTime() + i * intervalDays * 24 * 3600 * 1000);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

    if (await hayChoque(startsAt, endsAt)) {
      skipped++;
      continue;
    }

    const { error } = await citasSupabase.from("appointment_bookings").insert({
      patient_name: reason,
      patient_email: "bloqueo@agenda.interno",
      patient_type: "existing",
      status: "confirmed",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: durationMinutes,
      privacy_accepted: true,
      cancellation_accepted: true,
      informed_consent_accepted: true,
    });

    if (!error) created++;
  }

  return NextResponse.json({ created, skipped });
}
