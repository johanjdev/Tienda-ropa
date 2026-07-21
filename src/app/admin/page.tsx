"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/AuthProvider"

type Stat = { label: string; value: number | string; href: string; icon: string }

const TABLES: { key: string; label: string; href: string; icon: string }[] = [
  { key: "productos", label: "Productos", href: "/admin/productos", icon: "ri-shirt-line" },
  { key: "categorias", label: "Categorías", href: "/admin/categorias", icon: "ri-price-tag-3-line" },
  { key: "usuarios", label: "Usuarios", href: "/admin/usuarios", icon: "ri-user-3-line" },
  { key: "pedidos", label: "Pedidos", href: "/admin/pedidos", icon: "ri-shopping-bag-3-line" },
  { key: "carrito", label: "Carritos", href: "/admin/carritos", icon: "ri-shopping-cart-2-line" },
]

async function countRows(table: string): Promise<number | "—"> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
  if (error) return "—"
  return count ?? 0
}

export default function AdminHomePage() {
  const { profile, user } = useAuth()
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)
  const isEditor = Number(profile?.id_rol) !== 2

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const tables = isEditor
        ? TABLES.filter((t) => ["productos", "pedidos"].includes(t.key))
        : TABLES
      const results = await Promise.all(
        tables.map(async (t) => ({
          label: t.label,
          value: await countRows(t.key),
          href: t.href,
          icon: t.icon,
        }))
      )
      if (!cancelled) {
        setStats(results)
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isEditor])

  const nombre =
    profile?.nombre?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Administrador"

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-purple-300/90">Bienvenido de nuevo</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
            Hola, {nombre}{" "}
          </h1>
          <p className="text-zinc-500 mt-2 max-w-xl text-sm md:text-base">
            {isEditor
              ? "Gestiona productos y cambia estados de pedidos desde tus accesos permitidos."
              : "Resumen de tu tienda. Gestiona productos, categorias y revisa el resto de tablas desde el menu lateral."}
          </p>
        </div>
        <Link
          href="/admin/productos"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 hover:opacity-95 transition"
        >
          <i className="ri-add-line text-lg" aria-hidden />
          Nuevo producto
        </Link>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-4">
          Indicadores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading
            ? (isEditor ? TABLES.filter((t) => ["productos", "pedidos"].includes(t.key)) : TABLES).map((t) => (
                <div
                  key={t.key}
                  className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 h-28 animate-pulse"
                />
              ))
            : stats.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-[#12081f] p-5 shadow-inner hover:border-purple-500/40 hover:shadow-purple-900/20 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 group-hover:text-purple-300/90 transition">
                      {s.label}
                    </span>
                    <span className="rounded-lg bg-white/5 p-2 text-purple-300">
                      <i className={`${s.icon} text-lg`} aria-hidden />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black text-white tabular-nums">{s.value}</p>
                  <p className="mt-2 text-xs text-zinc-500 group-hover:text-zinc-400">Ver sección →</p>
                </Link>
              ))}
        </div>
      </section>

      {!isEditor && <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 md:p-8">
          <h3 className="text-lg font-bold text-white mb-2">Productos</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Alta, edición, imágenes y stock desde un solo lugar.
          </p>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-purple-200"
          >
            Ir a productos <i className="ri-arrow-right-line" />
          </Link>
        </div>
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#6b2ad4]/20 to-transparent p-6 md:p-8">
          <h3 className="text-lg font-bold text-white mb-2">Categorías</h3>
          <p className="text-sm text-zinc-400 mb-6">
            Mantén alineados los nombres con el catálogo público.
          </p>
          <Link
            href="/admin/categorias"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-purple-100"
          >
            Ir a categorías <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </section>}
    </div>
  )
}
