# Acceso seguro y sencillo (rama de desarrollo)

## Alcance
- Pacientes existentes, activos y vinculados a ficha clínica: enlace de un solo uso por correo.
- Profesionales: mantienen correo y contraseña, sin cambios.
- Enlace: token aleatorio de 256 bits, solo su hash en BD, caducidad de 10 minutos y consumo atómico.
- Respuesta uniforme para cuentas no existentes, para evitar revelar quién es paciente.
- No habilitar en producción sin pruebas integrales del correo, redirección y permisos.

## Requisitos de despliegue
1. Aplicar migración Prisma de la tabla enlaces_acceso en la base correcta.
2. Configurar RESEND_API_KEY, PATIENT_LOGIN_FROM (dominio verificado) y AUTH_URL (origen HTTPS exacto).
3. Comprobar SPF, DKIM y DMARC del remitente y recepción en varios proveedores.
4. Añadir control de tasa por IP en infraestructura (además del enfriamiento por usuario) y métricas sin datos clínicos.
5. Probar: cuenta inexistente, paciente activo/inactivo, profesional, enlace caducado/reutilizado, doble clic concurrente, dispositivo móvil y navegación posterior.
6. Verificar aislamiento de datos entre pacientes y persistencia/auditoría de sesiones.
7. Implementar WebAuthn/passkeys en fase separada con librería mantenida, registro autenticado, desafío de origen/RP ID correcto, recuperación de cuenta y revocación de credenciales. No simular Face ID con una simple opción visual.

## Advertencia
Esta rama NO se ha desplegado y todavía NO contiene passkeys. No sustituir el inicio de sesión real hasta completar los puntos anteriores.

## Hallazgo en el servicio REAL (8 octubre 2026)
El portal que está recibiendo solicitudes opera a través de la función `patient-portal-auth` del proyecto Supabase `portal-pacientes`, y utiliza Brevo, no Resend. Este repositorio independiente (Prisma/NextAuth) **no está identificado como el frontend de producción**. NO fusionar esta rama suponiendo que corrige las solicitudes actuales.

Inspección del flujo real:
- La función solo envía códigos a fichas activas cuyo correo coincide exactamente con una única ficha. Si no hay coincidencia, responde de modo genérico por privacidad, incluso sin realizar envío.
- Se contabilizaron 46 fichas no archivadas, 40 sin correo y 6 con correo. Es necesario verificar correo/identidad antes de invitar, sin autocompletar ni asociar por nombre.
- La función devuelve estado de éxito al solicitar el código aunque no se haya enviado, por lo que el equipo necesita trazabilidad interna separada del mensaje público (no exponer enumeración).
- El envío real depende de Brevo y del remitente `contact@carolinasanchezgirona.com`; comprobar entrega/bloqueo y autenticación del dominio.
- La función hace consumo del código mediante un PATCH no condicionado por `consumed_at is null`: revisar consumo atómico antes de cambiar el flujo.
- No enviar enlaces clínicos ni invitar a pacientes en masa hasta probar destinatarios, propiedad del correo y protección de sesiones.

**Orden de implantación correcto:** identificar el código fuente desplegado en carolinasanchezgirona.com, implementar cliente de enlace compatible con sesiones del portal real, actualizar la función actual con enlace de un solo uso y medidas antiabuso, comprobar Brevo y validación móvil, ejecutar pruebas de aislamiento entre fichas, activar primero con una cuenta controlada y solo entonces migrar. Passkeys en una segunda etapa con recuperación segura.
