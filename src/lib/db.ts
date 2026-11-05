import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "./supabase-public-env"

/**
 * Retorna un cliente de base de datos para el backend.
 * Utiliza SUPABASE_SERVICE_ROLE_KEY si está disponible para evitar restricciones de RLS,
 * o el anon key en su defecto.
 *
 * ¡IMPORTANTE! Este cliente se utiliza únicamente como ORM/query builder sobre las
 * tablas de PostgreSQL (Supabase), NUNCA para Supabase Auth.
 */
export function getDbClient() {
  const { url, anonKey } = getSupabasePublicEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const key = serviceKey || anonKey

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
