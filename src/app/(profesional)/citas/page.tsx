"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./citas.module.css";

type Booking = {
  id: string;
  patient_name: string;
  patient_email: string | null;
  status: string;
  starts_at: string;
  duration_minutes: number;
};

type Patient = { name: string; email: string | null; phone: string | null };
type Slot = { starts_at: string; ends_at: string };

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
  rescheduled: "Reprogramada",
};

function formatMeta(b: Booking): string {
  const start = new Date(b.starts_at);
  const dateStr = start.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr}, ${timeStr} · ${b.duration_minutes} min`;
}

// Convierte un ISO a la fecha local (YYYY-MM-DD) tal como la ve el navegador
function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function CitasDememoriaPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Formulario: nueva cita
  const [selectedPatient, setSelectedPatient] = useState("__new__");
  const [newName, setNewName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState(14);
  const [recurCount, setRecurCount] = useState(6);

  // Formulario: bloqueo
  const [blockReason, setBlockReason] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockSelectedStart, setBlockSelectedStart] = useState("");
  const [blockRecurring, setBlockRecurring] = useState(false);
  const [blockInterval, setBlockInterval] = useState(14);
  const [blockCount, setBlockCount] = useState(6);

  async function cargar() {
    setLoading(true);
    const [resCitas, resHoras] = await Promise.all([
      fetch("/api/citas-dememoria"),
      fetch("/api/citas-dememoria/horas-disponibles"),
    ]);
    if (resCitas.ok) {
      const data = await resCitas.json();
      setBookings(data.bookings || []);
      setCounts(data.counts || {});
      setPatients(data.patients || []);
    }
    if (resHoras.ok) {
      const data = await resHoras.json();
      setSlots(data.slots || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  // Fechas que tienen al menos un hueco libre (para los selectores de fecha)
  const availableDates = useMemo(() => {
    const set = new Set(slots.map((s) => toLocalDateKey(s.starts_at)));
    return Array.from(set).sort();
  }, [slots]);

  // Horas disponibles para la fecha elegida en el formulario de cita
  const startsForDate = useMemo(() => {
    if (!date) return [];
    return slots
      .filter((s) => toLocalDateKey(s.starts_at) === date)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [slots, date]);

  // Horas disponibles para la fecha elegida en el formulario de bloqueo
  const blockStartsForDate = useMemo(() => {
    if (!blockDate) return [];
    return slots
      .filter((s) => toLocalDateKey(s.starts_at) === blockDate)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [slots, blockDate]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function onSelectPatient(name: string) {
    setSelectedPatient(name);
    if (name === "__new__") {
      setContact("");
    } else {
      const known = patients.find((p) => p.name === name);
      setContact((known?.email || known?.phone) ?? "");
    }
  }

  function onChangeDate(value: string) {
    setDate(value);
    setSelectedStart(""); // al cambiar de día, resetea la hora elegida
  }

  function onChangeBlockDate(value: string) {
    setBlockDate(value);
    setBlockSelectedStart("");
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

    if (data.created === 0) {
      showFeedback("No se pudo crear ninguna cita (huecos ocupados).", false);
    } else if (data.skipped > 0) {
      showFeedback(`${data.created} cita(s) creada(s). ${data.skipped} saltada(s) por choque.`, true);
    } else {
      showFeedback(`${data.created} cita(s) creada(s) correctamente.`, true);
    }

    setSelectedPatient("__new__");
    setNewName("");
    setContact("");
    setSelectedStart("");
    setRecurring(false);
    cargar();
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
        recurring: blockRecurring ? { intervalDays: blockInterval, count: blockCount } : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || "Error al bloquear.", false);
      return;
    }

    if (data.created === 0) {
      showFeedback("No se pudo bloquear ningún hueco (ya estaban ocupados).", false);
    } else if (data.skipped > 0) {
      showFeedback(`${data.created} bloqueado(s). ${data.skipped} saltado(s) por choque.`, true);
    } else {
      showFeedback(`${data.created} hueco(s) bloqueado(s).`, true);
    }

    setBlockReason("");
    setBlockSelectedStart("");
    setBlockRecurring(false);
    cargar();
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/citas-dememoria/${id}`, { method: "PATCH" });
    if (res.ok) {
      cargar();
    } else {
      showFeedback("No se pudo cancelar.", false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Agenda</h1>
      </div>
      <p className={styles.subtitle}>
        Sección personal de Carolina — gestiona las citas de carolinasanchezgirona.com desde aquí.
        Los pacientes siguen reservando en la web pública.
      </p>

      <div className="card" style={{ padding: 22, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 6 }}>Añadir cita manual</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 16 }}>
          El paciente recibirá un email con un enlace para confirmar su asistencia. Todas las citas
          duran 60 minutos, en las franjas realmente disponibles según tu agenda.
        </p>
        <div className={styles.grid2}>
          <div className="field full">
            <label>Paciente</label>
            <select value={selectedPatient} onChange={(e) => onSelectPatient(e.target.value)}>
              <option value="__new__">+ Nuevo paciente</option>
              {patients
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          {selectedPatient === "__new__" && (
            <div className="field">
              <label>Nombre del nuevo paciente</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Email o teléfono</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email@ejemplo.com o teléfono" />
          </div>
          <div className="field">
            <label>Fecha</label>
            <select value={date} onChange={(e) => onChangeDate(e.target.value)}>
              <option value="">Elige un día con huecos libres</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Hora</label>
            <select
              value={selectedStart}
              onChange={(e) => setSelectedStart(e.target.value)}
              disabled={!date}
            >
              <option value="">
                {date ? "Elige una hora" : "Elige antes una fecha"}
              </option>
              {startsForDate.map((s) => (
                <option key={s.starts_at} value={s.starts_at}>
                  {toLocalTimeLabel(s.starts_at)}
                </option>
              ))}
            </select>
          </div>
          <div className={`field ${styles.full} ${styles.section}`}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
              />
              Repetir esta cita periódicamente
            </label>
          </div>
          {recurring && (
            <>
              <div className="field">
                <label>Repetir cada</label>
                <select value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))}>
                  <option value={7}>7 días (semanal)</option>
                  <option value={14}>14 días (quincenal)</option>
                  <option value={21}>21 días</option>
                  <option value={30}>30 días (mensual aprox.)</option>
                </select>
              </div>
              <div className="field">
                <label>Número de citas a crear (incluida esta)</label>
                <input
                  type="number"
                  min={2}
                  max={26}
                  value={recurCount}
                  onChange={(e) => setRecurCount(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
        <button className="btn-primary" style={{ width: "auto", marginTop: 12 }} onClick={handleAddBooking}>
          Añadir cita
        </button>
        {feedback && (
          <div className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackError}`}>
            {feedback.msg}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 6 }}>Bloquear un hueco</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 16 }}>
          Marca una franja como ocupada (vacaciones, imprevistos) para que no aparezca disponible en la web pública.
        </p>
        <div className={styles.grid2}>
          <div className="field">
            <label>Motivo (opcional, solo para ti)</label>
            <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ej. Vacaciones" />
          </div>
          <div className="field" />
          <div className="field">
            <label>Fecha</label>
            <select value={blockDate} onChange={(e) => onChangeBlockDate(e.target.value)}>
              <option value="">Elige un día con huecos libres</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Hora</label>
            <select
              value={blockSelectedStart}
              onChange={(e) => setBlockSelectedStart(e.target.value)}
              disabled={!blockDate}
            >
              <option value="">
                {blockDate ? "Elige una hora" : "Elige antes una fecha"}
              </option>
              {blockStartsForDate.map((s) => (
                <option key={s.starts_at} value={s.starts_at}>
                  {toLocalTimeLabel(s.starts_at)}
                </option>
              ))}
            </select>
          </div>
          <div className={`field ${styles.full} ${styles.section}`}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={blockRecurring}
                onChange={(e) => setBlockRecurring(e.target.checked)}
              />
              Repetir este bloqueo periódicamente
            </label>
          </div>
          {blockRecurring && (
            <>
              <div className="field">
                <label>Repetir cada</label>
                <select value={blockInterval} onChange={(e) => setBlockInterval(Number(e.target.value))}>
                  <option value={7}>7 días (semanal)</option>
                  <option value={14}>14 días (quincenal)</option>
                  <option value={21}>21 días</option>
                  <option value={30}>30 días (mensual aprox.)</option>
                </select>
              </div>
              <div className="field">
                <label>Número de bloqueos a crear (incluido este)</label>
                <input
                  type="number"
                  min={2}
                  max={26}
                  value={blockCount}
                  onChange={(e) => setBlockCount(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
        <button
          className="btn-primary"
          style={{ width: "auto", marginTop: 12, background: "var(--ink)" }}
          onClick={handleAddBlock}
        >
          Bloquear hueco
        </button>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ marginBottom: 12 }}>Próximas citas</h3>
        {loading && <p className={styles.emptyState}>Cargando…</p>}
        {!loading && bookings.length === 0 && <p className={styles.emptyState}>No hay citas próximas.</p>}
        {!loading &&
          bookings.map((b) => {
            const isBlock = b.patient_email === "bloqueo@agenda.interno";
            const total = counts[b.patient_name.trim().toLowerCase()] || 0;
            return (
              <div key={b.id} className={styles.bookingRow}>
                <div>
                  <div className={styles.bookingName}>
                    {b.patient_name}
                    {!isBlock && total > 0 && <span className={styles.bookingCount}> · {total}ª cita</span>}
                  </div>
                  <div className={styles.bookingMeta}>{formatMeta(b)}</div>
                </div>
                <span className={`pill pill-${b.status === "confirmed" ? "ok" : "pending"}`}>
                  {STATUS_LABEL[b.status] || b.status}
                </span>
                {b.status !== "cancelled" && b.status !== "canceled" && (
                  <button className={styles.smallBtn} onClick={() => handleCancel(b.id)}>
                    Cancelar
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}