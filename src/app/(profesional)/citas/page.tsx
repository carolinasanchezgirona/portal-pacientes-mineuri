"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./citas.module.css";

type Booking = {
  id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  patient_type: string | null;
  status: string;
  starts_at: string;
  duration_minutes: number;
  portal_patient_id: string | null;
};

type Patient = { name: string; email: string | null; phone: string | null };
type Slot = { starts_at: string; ends_at: string };
type View = "today" | "upcoming" | "manage";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  completed: "Realizada",
  no_show: "No asistió",
  rescheduled: "Reprogramada",
};

function toLocalDateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function isCancelled(status: string): boolean {
  return status === "cancelled" || status === "canceled";
}

export default function CitasDememoriaPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [view, setView] = useState<View>("today");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState("__new__");
  const [newName, setNewName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState(14);
  const [recurCount, setRecurCount] = useState(6);

  const [blockReason, setBlockReason] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockSelectedStart, setBlockSelectedStart] = useState("");

  async function cargar() {
    setLoading(true);
    try {
      const [resCitas, resHoras] = await Promise.all([
        fetch("/api/citas-dememoria", { cache: "no-store" }),
        fetch("/api/citas-dememoria/horas-disponibles", { cache: "no-store" }),
      ]);
      if (!resCitas.ok) throw new Error("No se pudo cargar la agenda");
      const citas = await resCitas.json();
      setBookings(citas.bookings || []);
      setCounts(citas.counts || {});
      setPatients(citas.patients || []);
      if (resHoras.ok) {
        const horas = await resHoras.json();
        setSlots(horas.slots || []);
      }
    } catch {
      showFeedback("No se pudo cargar la agenda. Inténtalo de nuevo.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  const realBookings = useMemo(
    () => bookings.filter((booking) => booking.patient_email !== "bloqueo@agenda.interno"),
    [bookings]
  );
  const todayBookings = useMemo(
    () => realBookings.filter((booking) => toLocalDateKey(booking.starts_at) === todayKey()),
    [realBookings]
  );
  const activeUpcoming = useMemo(
    () => realBookings.filter((booking) => !isCancelled(booking.status)),
    [realBookings]
  );
  const availableDates = useMemo(
    () => Array.from(new Set(slots.map((slot) => toLocalDateKey(slot.starts_at)))).sort(),
    [slots]
  );
  const startsForDate = useMemo(
    () =>
      slots
        .filter((slot) => toLocalDateKey(slot.starts_at) === date)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [slots, date]
  );
  const blockStartsForDate = useMemo(
    () =>
      slots
        .filter((slot) => toLocalDateKey(slot.starts_at) === blockDate)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [slots, blockDate]
  );

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    window.setTimeout(() => setFeedback(null), 4500);
  }

  function onSelectPatient(name: string) {
    setSelectedPatient(name);
    if (name === "__new__") {
      setContact("");
      return;
    }
    const known = patients.find((patient) => patient.name === name);
    setContact((known?.email || known?.phone) ?? "");
  }

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/citas-dememoria/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_status", status }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      showFeedback(data.error || "No se pudo actualizar la cita.", false);
      return;
    }
    showFeedback("Cita actualizada.", true);
    await cargar();
  }

  async function cancelBooking(booking: Booking) {
    if (!window.confirm(`¿Cancelar la cita de ${booking.patient_name}?`)) return;
    await updateStatus(booking.id, "cancelled");
  }

  async function handleAddBooking() {
    const patientName = selectedPatient === "__new__" ? newName.trim() : selectedPatient;
    if (!patientName || !contact.trim() || !selectedStart) {
      showFeedback("Rellena paciente, contacto, fecha y hora.", false);
      return;
    }

    const res = await fetch("/api/citas-dememoria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName,
        contact: contact.trim(),
        startsAtIso: selectedStart,
        durationMinutes: 60,
        recurring: recurring ? { intervalDays, count: recurCount } : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || "Error al añadir la cita.", false);
      return;
    }

    showFeedback(
      data.skipped
        ? `${data.created} cita(s) creada(s); ${data.skipped} hueco(s) ocupado(s).`
        : `${data.created} cita(s) creada(s) correctamente.`,
      data.created > 0
    );
    setSelectedPatient("__new__");
    setNewName("");
    setContact("");
    setDate("");
    setSelectedStart("");
    setRecurring(false);
    await cargar();
  }

  async function handleAddBlock() {
    if (!blockSelectedStart) {
      showFeedback("Indica fecha y hora para bloquear.", false);
      return;
    }
    const res = await fetch("/api/citas-dememoria/bloqueo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: blockReason,
        startsAtIso: blockSelectedStart,
        durationMinutes: 60,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || "No se pudo bloquear el hueco.", false);
      return;
    }
    showFeedback("Hueco bloqueado.", true);
    setBlockReason("");
    setBlockDate("");
    setBlockSelectedStart("");
    await cargar();
  }

  function BookingCard({ booking }: { booking: Booking }) {
    const appointmentNumber = counts[booking.patient_name.trim().toLocaleLowerCase("es")] || 0;
    return (
      <article className={styles.bookingCard}>
        <div className={styles.timeBlock}>
          <strong>{formatTime(booking.starts_at)}</strong>
          <span>{booking.duration_minutes} min</span>
        </div>
        <div className={styles.bookingBody}>
          <div className={styles.bookingHeading}>
            <div>
              <h3>{booking.patient_name}</h3>
              <p>
                {formatDate(booking.starts_at)}
                {appointmentNumber > 0 ? ` · ${appointmentNumber}ª cita` : ""}
              </p>
            </div>
            <span className={`${styles.status} ${styles[`status_${booking.status}`] || ""}`}>
              {STATUS_LABEL[booking.status] || booking.status}
            </span>
          </div>
          <div className={styles.actions}>
            {booking.portal_patient_id ? (
              <>
                <Link className={styles.primaryAction} href={`/pacientes/${booking.portal_patient_id}`}>
                  Abrir ficha
                </Link>
                <Link
                  className={styles.secondaryAction}
                  href={`/pacientes/${booking.portal_patient_id}?modo=preparar&cita=${booking.id}`}
                >
                  Preparar sesión
                </Link>
              </>
            ) : (
              <span className={styles.unlinked}>Sin ficha clínica vinculada</span>
            )}
            {!isCancelled(booking.status) && (
              <>
                <select
                  className={styles.statusSelect}
                  aria-label={`Cambiar estado de la cita de ${booking.patient_name}`}
                  value={booking.status}
                  disabled={busyId === booking.id}
                  onChange={(event) => void updateStatus(booking.id, event.target.value)}
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Realizada</option>
                  <option value="no_show">No asistió</option>
                </select>
                <button
                  className={styles.cancelAction}
                  type="button"
                  disabled={busyId === booking.id}
                  onClick={() => void cancelBooking(booking)}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  const shownBookings = view === "today" ? todayBookings : activeUpcoming;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Trabajo clínico</p>
          <h1>Agenda</h1>
          <p className={styles.subtitle}>
            Las reservas de carolinasanchezgirona.com y las fichas del portal, en un mismo flujo.
          </p>
        </div>
        <button className="btn-primary" type="button" onClick={() => setView("manage")}>
          Nueva cita
        </button>
      </header>

      <section className={styles.summary} aria-label="Resumen de agenda">
        <article><strong>{todayBookings.length}</strong><span>Citas hoy</span></article>
        <article><strong>{todayBookings.filter((b) => b.status === "confirmed").length}</strong><span>Confirmadas</span></article>
        <article><strong>{activeUpcoming.filter((b) => b.status === "pending").length}</strong><span>Pendientes</span></article>
        <article><strong>{activeUpcoming.filter((b) => b.portal_patient_id).length}</strong><span>Con ficha vinculada</span></article>
      </section>

      <nav className={styles.tabs} aria-label="Vistas de la agenda">
        <button className={view === "today" ? styles.activeTab : ""} onClick={() => setView("today")}>Hoy</button>
        <button className={view === "upcoming" ? styles.activeTab : ""} onClick={() => setView("upcoming")}>Próximas</button>
        <button className={view === "manage" ? styles.activeTab : ""} onClick={() => setView("manage")}>Gestionar</button>
      </nav>

      {feedback && (
        <p className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackError}`} role="status">
          {feedback.msg}
        </p>
      )}

      {view !== "manage" && (
        <section className={styles.listSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{view === "today" ? "Vista rápida" : "Continuidad"}</p>
              <h2>{view === "today" ? "Consultas de hoy" : "Próximas consultas"}</h2>
            </div>
            <button className={styles.refresh} type="button" onClick={() => void cargar()}>Actualizar</button>
          </div>
          {loading && <p className={styles.emptyState}>Cargando agenda…</p>}
          {!loading && shownBookings.length === 0 && (
            <p className={styles.emptyState}>No hay citas en esta vista.</p>
          )}
          {!loading && shownBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
        </section>
      )}

      {view === "manage" && (
        <div className={styles.managementGrid}>
          <section className={styles.formCard}>
            <p className={styles.eyebrow}>Agenda</p>
            <h2>Añadir cita manual</h2>
            <p className={styles.help}>Se crea como pendiente hasta la confirmación del paciente.</p>
            <div className={styles.grid2}>
              <label className={styles.full}>
                Paciente
                <select value={selectedPatient} onChange={(event) => onSelectPatient(event.target.value)}>
                  <option value="__new__">+ Nuevo paciente</option>
                  {[...patients].sort((a, b) => a.name.localeCompare(b.name)).map((patient) => (
                    <option key={patient.name} value={patient.name}>{patient.name}</option>
                  ))}
                </select>
              </label>
              {selectedPatient === "__new__" && (
                <label>
                  Nombre del paciente
                  <input value={newName} onChange={(event) => setNewName(event.target.value)} />
                </label>
              )}
              <label>
                Correo o teléfono
                <input value={contact} onChange={(event) => setContact(event.target.value)} />
              </label>
              <label>
                Fecha
                <select value={date} onChange={(event) => { setDate(event.target.value); setSelectedStart(""); }}>
                  <option value="">Selecciona un día</option>
                  {availableDates.map((day) => <option key={day} value={day}>{new Date(day + "T00:00:00").toLocaleDateString("es-ES")}</option>)}
                </select>
              </label>
              <label>
                Hora
                <select value={selectedStart} disabled={!date} onChange={(event) => setSelectedStart(event.target.value)}>
                  <option value="">Selecciona una hora</option>
                  {startsForDate.map((slot) => <option key={slot.starts_at} value={slot.starts_at}>{formatTime(slot.starts_at)}</option>)}
                </select>
              </label>
              <label className={`${styles.full} ${styles.checkboxRow}`}>
                <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
                Repetir periódicamente
              </label>
              {recurring && (
                <>
                  <label>
                    Intervalo
                    <select value={intervalDays} onChange={(event) => setIntervalDays(Number(event.target.value))}>
                      <option value={7}>Semanal</option><option value={14}>Quincenal</option><option value={21}>Cada 21 días</option><option value={30}>Mensual aprox.</option>
                    </select>
                  </label>
                  <label>
                    Número de citas
                    <input type="number" min={2} max={26} value={recurCount} onChange={(event) => setRecurCount(Number(event.target.value))} />
                  </label>
                </>
              )}
            </div>
            <button className="btn-primary" type="button" onClick={() => void handleAddBooking()}>Añadir cita</button>
          </section>

          <section className={styles.formCard}>
            <p className={styles.eyebrow}>Disponibilidad</p>
            <h2>Bloquear un hueco</h2>
            <p className={styles.help}>El horario dejará de mostrarse en la reserva pública.</p>
            <div className={styles.grid2}>
              <label className={styles.full}>
                Motivo opcional
                <input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Vacaciones, reunión…" />
              </label>
              <label>
                Fecha
                <select value={blockDate} onChange={(event) => { setBlockDate(event.target.value); setBlockSelectedStart(""); }}>
                  <option value="">Selecciona un día</option>
                  {availableDates.map((day) => <option key={day} value={day}>{new Date(day + "T00:00:00").toLocaleDateString("es-ES")}</option>)}
                </select>
              </label>
              <label>
                Hora
                <select value={blockSelectedStart} disabled={!blockDate} onChange={(event) => setBlockSelectedStart(event.target.value)}>
                  <option value="">Selecciona una hora</option>
                  {blockStartsForDate.map((slot) => <option key={slot.starts_at} value={slot.starts_at}>{formatTime(slot.starts_at)}</option>)}
                </select>
              </label>
            </div>
            <button className={styles.darkAction} type="button" onClick={() => void handleAddBlock()}>Bloquear hueco</button>
          </section>
        </div>
      )}
    </div>
  );
}
