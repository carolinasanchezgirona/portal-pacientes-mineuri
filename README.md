# Área de Pacientes

Esqueleto inicial del área de pacientes vinculada a carolinasanchezgirona.com.
Pensado como subdominio independiente, ej. `area.carolinasanchezgirona.com`.

## Estructura

```
prisma/schema.prisma       Modelo de datos completo (pacientes, citas,
                            consentimientos, tests, técnicas, log de accesos)

src/
  middleware.ts             Protege rutas por rol (profesional / paciente)
  lib/auth.ts                Funciones de control de acceso — usar SIEMPRE
                              antes de leer/escribir datos de un paciente

  app/
    (auth)/login/            Login único, redirige según rol
    (profesional)/           Zona profesional — ve todos los pacientes
      dashboard/
      pacientes/[id]/        Ficha completa de un paciente
      citas/                 Gestión de agenda
      tests/                 Biblioteca y revisión de tests
      consentimientos/       Plantillas y versiones
    (paciente)/mi-area/      Zona paciente — solo ve lo suyo
      citas/
      tests/
      consentimientos/
      seguimiento/
    api/                     Rutas API (ver pacientes/[id]/route.ts como plantilla
                              del patrón de seguridad a replicar en el resto)
```

## Decisiones ya tomadas (no reabrir sin motivo)

- Alta de paciente: solo por invitación de la profesional, no registro libre
- Citas: confirmación automática al reservar; modalidad presencial u online
  según el hueco elegido
- Tests: se distingue `PROPIO_DIGITAL` (autopuntuable, con ítems y baremo
  propios) de `COMERCIAL_EXTERNO` (aplicado fuera de la app con material
  con copyright; solo se registra el resultado final, nunca el contenido
  del test ni sus baremos)
- Consentimientos: firma con evidencia (texto exacto, fecha/hora, IP),
  versionado, y opción de marcar como bloqueante

## Autenticación (next-auth v5)

- Login con email + contraseña (`src/app/(auth)/login/page.tsx`), validado
  contra la tabla `usuarios` de Prisma (`src/lib/next-auth.ts`)
- Las contraseñas se guardan con `bcrypt` (hash), nunca en texto plano
- La sesión (JWT) lleva el rol y, si es paciente, su `pacienteId` — así el
  middleware y `requierePropioPaciente()` pueden filtrar sin consultar la BD
  en cada petición
- `src/middleware.ts` usa el wrapper de next-auth para proteger las zonas
  `(profesional)` y `(paciente)/mi-area` a nivel de edge, antes incluso de
  cargar la página
- Genera `AUTH_SECRET` con: `openssl rand -base64 32`

**Pendiente**: aún no existe ningún usuario en la base de datos. El primer
usuario profesional (tú) debe crearse a mano, por ejemplo con un script
`prisma db seed`, o insertándolo directamente desde Supabase Table Editor
con el hash de contraseña generado con bcrypt.

## Sistema de diseño

Identidad real de Mineuri, no una propuesta genérica:

- **Color de marca**: índigo `#4C5BFF` (de mineuri.com), + teal `#2BC5AE` y
  coral `#F2543D` (del logo) como acentos puntuales — nunca como bloque
  grande y saturado
- **Tipografía** (regla fija: "Merriweather habla, Sora trabaja"):
  - `--font-brand` (Merriweather) → solo H1/H2, titulares que dan
    personalidad a la marca
  - `--font-ui` (Sora) → todo lo demás: H3, botones, formularios,
    instrucciones de actividades, navegación
  - Cargadas vía `next/font` en `layout.tsx` (autohospedadas, sin depender
    de la CDN de Google en cada visita)
- **Accesibilidad, reglas fijas**:
  - Nunca peso de fuente < 500 en texto con función
  - Nunca contenido clínico relevante (nombres, resultados) < 16px
  - Nunca mayúsculas completas en párrafos (solo en etiquetas cortas tipo
    "PRÓXIMAS CITAS")
  - Nunca cursiva para instrucciones importantes
  - Line-height 1.2 en titulares, 1.55 en cuerpo, hasta 1.6-1.7 en
    instrucciones de actividades cognitivas
- Todos los tokens están en `src/app/globals.css` — para cambiar un color
  o fuente dentro de un año, se cambia en un solo sitio, no en 200
  componentes

**Pendiente**: este sistema solo está aplicado en la página de login por
ahora. El resto de páginas (dashboard, ficha de paciente, etc.) siguen
siendo placeholders sin estilo — se irán vistiendo a medida que tengan
contenido real.

## Puesta en marcha con Supabase

1. Crear proyecto en Supabase eligiendo **región Frankfurt (eu-central-1)** —
   no dejar la región por defecto
2. Solicitar el **DPA** desde Project Settings → Legal Documents (o a
   soporte) y guardar también la Transfer Impact Assessment (TIA) en tu
   propio archivo de cumplimiento
3. Copiar `.env.example` a `.env` y rellenar con los datos de
   Project Settings → Database (usar la URL de **connection pooling**,
   puerto 6543, para `DATABASE_URL`, y la directa, puerto 5432, para
   `DIRECT_URL`)
4. `npm install`
5. `npx prisma migrate dev --name init` — crea las tablas reales en Supabase
6. `npx prisma studio` — para inspeccionar los datos visualmente mientras desarrollas

## Pendiente de decidir antes de avanzar

- [x] Proveedor de hosting/BD → Supabase, región Frankfurt (eu-central-1)
- [ ] Proveedor de email transaccional (invitaciones, recordatorios) — Resend
      ya está en `package.json` como propuesta, pendiente de confirmar
- [ ] Herramienta de videollamada para citas online (API externa o enlace manual)
- [ ] Librería de autenticación definitiva (next-auth u otra)

## Seguridad — reglas fijas del proyecto

1. Ninguna query de paciente sin pasar por `requierePropioPaciente()`
2. Ninguna acción sobre zona profesional sin `requiereProfesional()`
3. Todo acceso a ficha/test/consentimiento se registra en `LogAcceso`
4. Los tests comerciales con copyright NUNCA se digitalizan (ni ítems ni
   baremos) dentro de esta app — solo se guarda el resultado
