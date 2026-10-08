import { createHash } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrarAcceso } from "@/lib/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "patient-link",
      name: "Enlace seguro para pacientes",
      credentials: { token: {} },
      async authorize(credentials) {
        const token = credentials?.token;
        if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const now = new Date();
        const user = await prisma.$transaction(async (tx) => {
          const link = await tx.enlaceAcceso.findUnique({
            where: { tokenHash },
            include: { usuario: { include: { paciente: true } } },
          });
          if (!link || link.expiraEn <= now) return null;
          if (!link.usuario.activo || link.usuario.rol !== "PACIENTE" || !link.usuario.paciente) return null;
          const consumed = await tx.enlaceAcceso.deleteMany({
            where: { id: link.id, tokenHash, expiraEn: { gt: now } },
          });
          if (consumed.count !== 1) return null;
          await tx.usuario.update({ where: { id: link.usuarioId }, data: { ultimoAcceso: now } });
          return link.usuario;
        });
        if (!user?.paciente) return null;
        await registrarAcceso({ usuarioId: user.id, accion: "LOGIN_PATIENT_LINK" });
        return { id: user.id, email: user.email, rol: user.rol, pacienteId: user.paciente.id };
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credenciales) {
        const email = credenciales?.email as string | undefined;
        const password = credenciales?.password as string | undefined;
        if (!email || !password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { paciente: true },
        });

        if (!usuario || !usuario.activo) return null;

        const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
        if (!passwordValido) return null;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimoAcceso: new Date() },
        });

        await registrarAcceso({
          usuarioId: usuario.id,
          accion: "LOGIN",
        });

        return {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          pacienteId: usuario.paciente?.id,
        };
      },
    }),
  ],
  callbacks: {
    // Añade rol y pacienteId al token JWT en el momento del login
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol;
        token.pacienteId = (user as any).pacienteId;
      }
      return token;
    },
    // Expone rol y pacienteId en la sesión que llega al cliente/servidor
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).rol = token.rol;
        (session.user as any).pacienteId = token.pacienteId;
      }
      return session;
    },
    // Redirige según rol tras login
    async redirect({ baseUrl }) {
      // La redirección fina por rol se hace en el propio callback de login
      // (ver page.tsx), esto es solo un fallback seguro.
      return baseUrl;
    },
  },
});
