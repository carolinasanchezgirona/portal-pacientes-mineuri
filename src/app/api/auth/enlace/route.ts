import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const respuesta = { mensaje: "Si existe una cuenta de paciente activa, recibirás un enlace de acceso." };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Introduce un correo válido." }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.PATIENT_LOGIN_FROM || !process.env.AUTH_URL) {
    console.error("[patient-login] No está configurado el correo de acceso.");
    return NextResponse.json({ error: "El acceso por correo no está disponible actualmente." }, { status: 503 });
  }
  try {
    const user = await prisma.usuario.findUnique({ where: { email }, include: { paciente: true } });
    if (!user?.activo || user.rol !== "PACIENTE" || !user.paciente) return NextResponse.json(respuesta);
    const recent = await prisma.enlaceAcceso.findFirst({
      where: { usuarioId: user.id, creadoEn: { gt: new Date(Date.now() - 60_000) } },
      select: { id: true },
    });
    if (recent) return NextResponse.json(respuesta);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await prisma.enlaceAcceso.create({
      data: { usuarioId: user.id, tokenHash, expiraEn: new Date(Date.now() + 10 * 60_000) },
    });
    const enlace = new URL("/login", process.env.AUTH_URL);
    // Fragmento: evita incluir el token en la petición HTTP inicial y sus registros.
    enlace.hash = "acceso=" + encodeURIComponent(token);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.PATIENT_LOGIN_FROM,
      to: email,
      subject: "Tu acceso seguro a Mineuri",
      html: '<p>Has solicitado entrar en tu espacio de Mineuri.</p><p><a href="' + enlace.toString() + '">Entrar en mi espacio</a></p><p>Enlace válido durante 10 minutos y de un solo uso. Si no lo has solicitado, ignora este mensaje.</p>',
    });
    if (error) {
      await prisma.enlaceAcceso.delete({ where: { id: record.id } });
      console.error("[patient-login] Error del proveedor de correo:", error.name);
      return NextResponse.json({ error: "No ha sido posible enviar el correo. Inténtalo más tarde." }, { status: 503 });
    }
    return NextResponse.json(respuesta);
  } catch (error) {
    console.error("[patient-login] Error al solicitar acceso:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Servicio temporalmente no disponible." }, { status: 503 });
  }
}
