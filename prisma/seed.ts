/**
 * Crea el primer usuario PROFESIONAL (tú) en la base de datos.
 *
 * Uso:
 *   1. Edita EMAIL_PROFESIONAL y PASSWORD_PROFESIONAL más abajo
 *   2. Ejecuta: npx tsx prisma/seed.ts
 *      (o añade "prisma": { "seed": "tsx prisma/seed.ts" } en package.json
 *       y ejecuta: npx prisma db seed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL_PROFESIONAL = "carol@carolinasanchezgirona.com";
const PASSWORD_PROFESIONAL = "CAMBIA-ESTA-CONTRASEÑA";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD_PROFESIONAL, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL_PROFESIONAL },
    update: {},
    create: {
      email: EMAIL_PROFESIONAL,
      passwordHash,
      rol: "PROFESIONAL",
    },
  });

  console.log("Usuario profesional creado/existente:", usuario.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
