"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [modoProfesional, setModoProfesional] = useState(false);

  useEffect(() => {
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const token = fragmento.get("acceso");
    if (!token) return;
    window.history.replaceState(null, "", window.location.pathname);
    setCargando(true);
    signIn("patient-link", { token, redirect: false }).then((resultado) => {
      if (resultado?.error) setError("El enlace ha caducado o ya se ha utilizado. Solicita otro.");
      else { router.push("/mi-area"); router.refresh(); }
    }).catch(() => setError("No se ha podido completar el acceso.")).finally(() => setCargando(false));
  }, [router]);

  async function solicitarEnlace(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setEnviado(false);
    try {
      const response = await fetch("/api/auth/enlace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se ha podido enviar el enlace.");
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Se ha producido un error.");
    } finally { setCargando(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const resultado = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setCargando(false);

    if (resultado?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }

    // La redirección exacta según rol la resuelve el callback de next-auth
    // (ver src/lib/next-auth.ts), pero por si acaso forzamos un refresh
    // a la home protegida más genérica.
    router.push("/");
    router.refresh();
  }

  return (
    <div className={styles.wrapper}>
      {/* Panel de marca — oculto en móvil, ver login.module.css */}
      <div className={styles.brandPanel}>
        <Image
          src="/logo-mineuri.png"
          alt="Mineuri"
          width={160}
          height={56}
          className={styles.logo}
          priority
        />
        <h1 className={styles.claim}>
          Portal de seguimiento para tu tratamiento
        </h1>
        <p className={styles.sub}>
          Citas, tests y evolución en un mismo espacio, diseñado desde la
          neuropsicología.
        </p>
        <div className={styles.badges}>
          <span className="badge badge-indigo">Basado en neurociencia</span>
          <span className="badge badge-teal">Seguro</span>
          <span className="badge badge-coral">Personalizado</span>
        </div>
      </div>

      <div className={styles.formWrap}>
        <form className={styles.form} onSubmit={modoProfesional ? handleSubmit : solicitarEnlace}>
          <h2>{modoProfesional ? "Acceso profesional" : "Tu espacio Mineuri"}</h2>
          <p className={styles.formSub}>
            {modoProfesional ? "Accede con tus credenciales profesionales" : "Introduce tu correo y te enviaremos un enlace seguro, sin códigos ni contraseñas"}
          </p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          }
          {enviado && <p role="status">Si tu cuenta de paciente está activa, recibirás un correo con el enlace de acceso. Comprueba también la carpeta de spam.</p>}\n          {error && (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={cargando}
          >
            {cargando ? "Procesando..." : modoProfesional ? "Entrar" : "Enviarme un enlace seguro"}
          </button>
        </form>
      </div>
    </div>
  );
}
