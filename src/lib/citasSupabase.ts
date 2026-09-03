import { createClient } from "@supabase/supabase-js";

/**
 * Cliente para el proyecto Supabase del sistema de citas de Dememoria
 * (carolinasanchezgirona.com), NO el de Mineuri.
 *
 * Usa la service_role key: acceso completo, sin RLS. Por eso este
 * archivo SOLO puede importarse desde código de servidor (route
 * handlers, server actions) — nunca desde un componente cliente.
 * Cada uso debe ir siempre precedido de requiereProfesional(sesion).
 *
 * Esta sección es exclusiva de Carolina, no del producto multiusuario
 * de Mineuri — cuando otros profesionales se suscriban, no verán esto.
 */
export const citasSupabase = createClient(
  process.env.CITAS_SUPABASE_URL!,
  process.env.CITAS_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);
