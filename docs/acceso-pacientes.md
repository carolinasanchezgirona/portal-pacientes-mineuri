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
