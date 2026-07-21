/** Normaliza valores de .env (Windows CRLF, BOM, espacios). */
function cleanEnv(value: string | undefined): string {
  if (!value) return ""
  return value.replace(/^\uFEFF/, "").trim()
}

/**
 * URL y anon key para Supabase (middleware, cliente, API routes).
 * Si faltan variables, se usan placeholders para no romper el arranque.
 */
export function getSupabasePublicEnv() {
  const urlRaw = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const keyRaw = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const url = urlRaw || "https://placeholder.supabase.co"
  const anonKey =
    keyRaw ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature"

  return {
    url,
    anonKey,
    /** True si hay credenciales reales (no solo placeholders). */
    configured: urlRaw.length > 0 && keyRaw.length > 0,
  }
}
