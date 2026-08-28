import { auth } from "@/lib/next-auth";
import { NextResponse } from "next/server";

/**
 * Protege las zonas (profesional) y (paciente) usando la sesión JWT de
 * next-auth (no requiere acceso a la base de datos, por eso funciona en
 * el edge runtime).
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const sesion = request.auth;

  const esZonaProfesional =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/pacientes") ||
    pathname.startsWith("/citas") ||
    pathname.startsWith("/tests") ||
    pathname.startsWith("/consentimientos");

  const esZonaPaciente = pathname.startsWith("/mi-area");

  if ((esZonaProfesional || esZonaPaciente) && !sesion) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const rol = (sesion?.user as any)?.rol;

  if (esZonaProfesional && rol !== "PROFESIONAL") {
    return NextResponse.redirect(new URL("/mi-area", request.url));
  }

  if (esZonaPaciente && rol !== "PACIENTE") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pacientes/:path*",
    "/citas/:path*",
    "/tests/:path*",
    "/consentimientos/:path*",
    "/mi-area/:path*",
  ],
};
