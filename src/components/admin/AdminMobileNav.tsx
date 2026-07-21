"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/AuthProvider"

const links = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/carritos", label: "Carritos" },
]

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuth()
  const isEditor = Number(profile?.id_rol) !== 2
  const visibleLinks = isEditor
    ? links.filter((item) => ["/admin/productos", "/admin/pedidos"].includes(item.href))
    : links

  return (
    <div className="md:hidden border-b border-white/10 bg-[#0a0514] px-4 py-3 flex items-center justify-between">
      <Link href="/admin" className="font-bold text-white">
        Admin
      </Link>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white"
        aria-expanded={open}
      >
        Menu
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[52px] z-50 border-b border-white/10 bg-[#0f0820] shadow-xl max-h-[70vh] overflow-y-auto">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm border-b border-white/5 ${
                pathname === l.href ? "text-purple-300 bg-white/5" : "text-zinc-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-zinc-500"
          >
            Tienda
          </Link>
        </div>
      )}
    </div>
  )
}
