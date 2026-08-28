"use client";

import { useState } from "react";
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
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2>Iniciar sesión</h2>
          <p className={styles.formSub}>
            Accede a tu área profesional o de paciente
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

          {error && (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={cargando}
          >
            {cargando ? "Entrando..." : "Entrar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
