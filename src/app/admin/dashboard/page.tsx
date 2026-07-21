import { redirect } from "next/navigation"

/** Compatibilidad: la gestión de productos vive en `/admin/productos`. */
export default function AdminDashboardLegacyRedirect() {
  redirect("/admin/productos")
}
