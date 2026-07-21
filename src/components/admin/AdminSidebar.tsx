"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"

type NavItem = { href: string; label: string; icon: string }

const mainNav: NavItem[] = [
  { href: "/admin", label: "Panel", icon: "ri-dashboard-3-line" },
  { href: "/admin/productos", label: "Productos", icon: "ri-shirt-line" },
  { href: "/admin/categorias", label: "Categorias", icon: "ri-price-tag-3-line" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "ri-user-settings-line" },
  { href: "/admin/cupones", label: "Cupones", icon: "ri-coupon-3-line" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "ri-shopping-bag-3-line" },
  { href: "/admin/carritos", label: "Carritos", icon: "ri-shopping-cart-2-line" },
]

const dataNav: NavItem[] = [
  { href: "/admin/consulta/carrito", label: "Tabla carrito", icon: "ri-shopping-cart-2-line" },
  { href: "/admin/consulta/devoluciones", label: "Devoluciones", icon: "ri-arrow-go-back-line" },
  { href: "/admin/consulta/roles", label: "Roles", icon: "ri-shield-user-line" },
  { href: "/admin/consulta/tipo-documento", label: "Tipo documento", icon: "ri-id-card-line" },
  { href: "/admin/consulta/logs", label: "Logs", icon: "ri-file-list-3-line" },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-[#6b2ad4] to-[#4c1d95] text-white shadow-lg shadow-purple-900/30"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <i className={`${item.icon} text-lg shrink-0`} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export default function AdminSidebar() {
  const { profile } = useAuth()
  const isEditor = Number(profile?.id_rol) !== 2
  const visibleMainNav = isEditor
    ? mainNav.filter((item) => ["/admin/productos", "/admin/pedidos"].includes(item.href))
    : mainNav

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0a0514]/95 backdrop-blur-sm">
      <div className="p-6 border-b border-white/10">
        <Link href="/admin" className="block">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-300/80">Arquetipo</p>
          <p className="text-lg font-bold text-white mt-1">Panel admin</p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="px-4 pt-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Principal
        </p>
        {visibleMainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {!isEditor && (
          <>
            <p className="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Datos
            </p>
            {dataNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition"
        >
          <i className="ri-home-4-line text-lg" aria-hidden />
          Volver a la tienda
        </Link>
      </div>
    </aside>
  )
}
