"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
    // (ver src/lib/auth.ts -> callbacks.redirect), pero por si acaso
    // forzamos un refresh a la home protegida más genérica.
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Área de pacientes</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
