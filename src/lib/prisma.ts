import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma singleton.
 *
 * En Next.js, cada hot-reload en desarrollo (o cada invocación serverless
 * en producción) puede crear una nueva instancia de PrismaClient si no se
 * reutiliza. Con Supabase esto agota rápido el límite de conexiones del
 * pooler. Este patrón evita el problema guardando la instancia en globalThis.
 */

const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
