import { NextResponse } from "next/server";
import { obtenerSesion, requiereProfesional } from "@/lib/auth";
import { citasSupabase } from "@/lib/citasSupabase";
import { prisma } from "@/lib/prisma";

type PacienteVinculado = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

function normalizar(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("es");
}

async function obtenerPacientesVinculados(): Promise<PacienteVinculado[]> {
  try {
    const pacientes = await prisma.paciente.findMany({
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        usuario: { select: { email: true } },
      },
    });

    return pacientes.map((paciente) => ({
      id: paciente.id,
      name: `${paciente.nombre} ${paciente.apellidos}`.trim(),
      email: paciente.usuario.email,
      phone: paciente.telefono,
    }));
  } catch {
    // La agenda debe seguir operativa aunque la base clínica esté temporalmente inaccesible.
    return [];
  }
}

// GET /api/citas-dememoria — agenda real + vínculo seguro con las fichas del portal
export async function GET() {
  const sesion = await obtenerSesion();
  try {
    requiereProfesional(sesion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [{ data: allBookings, error: countError }, pacientesVinculados] = await Promise.all([
    citasSupabase
      .from("appointment_bookings")
      .select("patient_name, patient_email, patient_phone, status"),
    obtenerPacientesVinculados(),
  ]);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const countsByName = new Map<string, number>();
  const patientsIndex = new Map<string, { email: string | null; phone: string | null }>();

  allBookings?.forEach((booking) => {
    if (booking.patient_email === "bloqueo@agenda.interno") return;
    const name = booking.patient_name.trim();
    patientsIndex.set(name, { email: booking.patient_email, phone: booking.patient_phone });
    if (booking.status === "cancelled" || booking.status === "canceled") return;
    const key = normalizar(name);
    countsByName.set(key, (countsByName.get(key) || 0) + 1);
  });

  const { data: upcoming, error } = await citasSupabase
    .from("appointment_bookings")
    .select("*")
    .gte("starts_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const linkedByEmail = new Map(
    pacientesVinculados.map((patient) => [normalizar(patient.email), patient.id])
  );
  const linkedByPhone = new Map(
    pacientesVinculados
      .filter((patient) => patient.phone)
      .map((patient) => [normalizar(patient.phone), patient.id])
  );

  const bookings = (upcoming ?? []).map((booking) => ({
    ...booking,
    portal_patient_id:
      linkedByEmail.get(normalizar(booking.patient_email)) ??
      linkedByPhone.get(normalizar(booking.patient_phone)) ??
      null,
  }));

  return NextResponse.json({
    bookings,
    counts: Object.fromEntries(countsByName),
    patients: Array.from(patientsIndex.entries()).map(([name, contact]) => ({
      name,
      ...contact,
    })),
  });
}

type NuevaCitaInput = {
  patientName: string;
  contact: string;
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
  if (Number.isNaN(baseStart.getTime())) {
    return NextResponse.json({ error: "Fecha u hora no válida" }, { status: 400 });
  }

  const intervalDays = body.recurring?.intervalDays ?? 0;
  const count = Math.min(Math.max(body.recurring?.count ?? 1, 1), 26);

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
