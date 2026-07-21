import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicEnv } from "./supabase-public-env"

const { url, anonKey } = getSupabasePublicEnv()

/** Cliente en el navegador; sincroniza cookies con el middleware de Next.js. */
export const supabase = createBrowserClient(url, anonKey)

export function createClient() {
  return createBrowserClient(url, anonKey)
}
