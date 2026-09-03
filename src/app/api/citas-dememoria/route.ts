import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";

// GET /api/citas-dememoria — lista de próximas citas + índice de pacientes
export async function GET() {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Recuento total de citas por paciente (todas, no canceladas)
  const { data: allBookings, error: countError } = await citasSupabase
    .from("appointment_bookings")
    .select("patient_name, patient_email, patient_phone, status");

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const countsByName = new Map<string, number>();
  const patientsIndex = new Map<string, { email: string | null; phone: string | null }>();

  allBookings?.forEach((b) => {
    if (b.patient_email === "bloqueo@agenda.interno") return;
    const key = b.patient_name.trim();
    patientsIndex.set(key, { email: b.patient_email, phone: b.patient_phone });
    if (b.status === "cancelled" || b.status === "canceled") return;
    countsByName.set(key.toLowerCase(), (countsByName.get(key.toLowerCase()) || 0) + 1);
  });

  const { data: upcoming, error } = await citasSupabase
    .from("appointment_bookings")
    .select("*")
    .gte("starts_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bookings: upcoming,
    counts: Object.fromEntries(countsByName),
    patients: Array.from(patientsIndex.entries()).map(([name, contact]) => ({
      name,
      ...contact,
    })),
  });
}

type NuevaCitaInput = {
  patientName: string;
  contact: string; // email o teléfono
  startsAtIso: string; // ya combinado fecha+hora, en ISO
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

function generarToken(): string {
  return crypto.randomUUID();
}

// POST /api/citas-dememoria — crea una cita manual (con recurrencia opcional)
export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: NuevaCitaInput = await request.json();
  const { patientName, contact, startsAtIso, durationMinutes } = body;

  if (!patientName || !contact || !startsAtIso || !durationMinutes) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const isEmail = contact.includes("@");
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
      patient_name: patientName,
      patient_email: isEmail ? contact : null,
      patient_phone: isEmail ? null : contact,
      patient_type: "existing",
      status: "pending",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: durationMinutes,
      privacy_accepted: true,
      cancellation_accepted: true,
      informed_consent_accepted: true,
      confirmation_token: generarToken(),
      needs_patient_confirmation: true,
    });

    if (!error) created++;
  }

  return NextResponse.json({ created, skipped });
}
