/**
 * page.tsx — Página principal (Home)
 * ──────────────────────────────────────────────────────────────
 * Esta es la página de inicio de la tienda ARQUETIPO.
 * Muestra:
 * 1. Una pantalla de carga animada (PageLoader) al entrar por primera vez.
 * 2. Una sección hero con el nombre de la marca.
 * 3. Dos filas de 4 productos destacados (8 en total), con efecto hover de imagen.
 * 4. Un degradado decorativo al final de la página.
 *
 * El contenido principal aparece con un fade-in suave después de que
 * el loader termina su animación de salida.
 */

"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { fetchProductosActivos, type ProductoActivo } from "@/lib/fetch-productos"
import { formatCOP } from "@/lib/format"
import dynamic from "next/dynamic"

/**
 * Se carga el PageLoader de forma dinámica solo en el cliente (ssr: false)
 * para evitar errores de hidratación en Next.js, ya que el loader usa
 * estado del navegador (timers, animaciones).
 */
const PageLoader = dynamic(() => import("@/components/PageLoader"), { ssr: false })

export default function HomePage() {
  /** Lista de productos obtenidos desde Supabase */
  const [productos, setProductos] = useState<ProductoActivo[]>([])

  /** Indica si la solicitud a Supabase aún está en proceso */
  const [loading, setLoading] = useState(true)

  /** Mensaje de error si la carga de productos falla */
  const [error, setError] = useState<string | null>(null)

  /** ID del producto sobre el que está el cursor (para el efecto hover de imagen) */
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const otrosCarruselRef = useRef<HTMLDivElement>(null)

  /** Controla si el loader sigue montado en el DOM */
  const [showLoader, setShowLoader] = useState(() => {
    // Solo mostrar el loader si es la primera vez en esta sesión
    if (typeof window !== "undefined") {
      const loaderShown = sessionStorage.getItem("loader_shown")
      return !loaderShown
    }
    return true
  })

  /** Controla la opacidad del contenido principal (fade-in después del loader) */
  const [contentVisible, setContentVisible] = useState(false)

  /**
   * Al montar la página se obtienen los productos activos desde Supabase.
   * Si hay un error se guarda el mensaje y se deja la lista vacía.
   */
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true)
      const { data, error } = await fetchProductosActivos()
      if (error) {
        setError(error)
        setProductos([])
      } else {
        setProductos(data)
      }
      setLoading(false)
    }

    void fetchProductos()
  }, [])

  // Recargar productos cuando la página vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const fetchProductos = async () => {
          const { data, error } = await fetchProductosActivos()
          if (!error) {
            setProductos(data)
          }
        }
        void fetchProductos()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Si no hay loader, mostrar contenido directamente
  useEffect(() => {
    if (!showLoader) {
      setContentVisible(true)
    }
  }, [showLoader])

  /**
   * handleLoaderDone
   * Callback que recibe el PageLoader cuando termina su animación de salida.
   * 1. Marca en sessionStorage que el loader ya se mostró.
   * 2. Desmonta el loader del DOM.
   * 3. Espera 50 ms y activa el fade-in del contenido principal.
   */
  const handleLoaderDone = () => {
    sessionStorage.setItem("loader_shown", "true")
    setShowLoader(false)
    // Pequeño delay para que el navegador pinte el loader fuera antes de mostrar el contenido
    setTimeout(() => setContentVisible(true), 50)
  }

  // ────────────────────────────────────────────────────────────
  // Configuración de productos destacados
  // ────────────────────────────────────────────────────────────
  /**
   * featuredConfig
   * Define qué productos se muestran en la página principal y qué imagen
   * alternativa aparece cuando el usuario pasa el cursor sobre cada tarjeta.
   *
   * Cómo configurar:
   * - `id`    → id_producto en la base de datos (tabla `productos`)
   * - `hover` → ruta de la imagen alternativa dentro de /public (opcional)
   *
   * Puedes tener hasta 8 entradas; las primeras 4 forman la Fila 1
   * y las siguientes 4 forman la Fila 2.
   *
   * Si un id_producto no se encuentra en los datos de Supabase, esa
   * tarjeta simplemente no se renderiza.
   */
  const featuredConfig = useMemo<{ id: number; hover?: string }[]>(
    () => [
      // ── Fila 1 ─────────────────────────────────────────────
      { id: 6,  hover: '/imagenes/principal/bufandamaterial.png' },
      { id: 7,  hover: '/imagenes/principal/camisavshilos.png' },
      { id: 10, hover: '/imagenes/principal/lanah2.png' },
    ],
    []
  )

  /**
   * featuredProductos
   * Cruza `featuredConfig` con los datos de Supabase para obtener
   * los objetos ProductoActivo completos, en el orden definido en featuredConfig.
   * Si featuredConfig está vacío, toma los primeros 8 productos disponibles.
   */
  const featuredProductos = useMemo(() => {
    if (featuredConfig.length > 0) {
      return featuredConfig
        .map((c) => productos.find((p) => p.id_producto === c.id))
        .filter(Boolean) as ProductoActivo[]
    }
    return productos.slice(0, 8)
  }, [productos, featuredConfig])

  /**
   * hoverUrlFor
   * Devuelve la URL de la imagen alternativa para un producto dado.
   * Prioridad: hover de featuredConfig → imagen_url del producto → imagen por defecto.
   *
   * @param producto - Objeto del producto
   * @param index    - Posición del producto en featuredConfig (para leer su hover)
   */
  const hoverUrlFor = (producto: ProductoActivo, index: number) => {
    const cfg = featuredConfig[index]
    return cfg?.hover || producto.imagen_url || '/imagenes/principal/camisa1Ark.png'
  }

  // Divide los productos en dos filas de 4 para el layout de la página
  const row1 = featuredProductos.slice(0, 4) // primera fila
  const row2 = featuredProductos.slice(4, 8) // segunda fila

  /** Productos que no pertenecen a la selección de más vendidos. */
  const otrosProductos = useMemo(() => {
    const featuredIds = new Set(featuredProductos.map((producto) => producto.id_producto))
    return productos.filter((producto) => !featuredIds.has(producto.id_producto))
  }, [productos, featuredProductos])

  return (
    <>
      {/* Pantalla de carga: se desmonta automáticamente al terminar */}
      {showLoader && <PageLoader onDone={handleLoaderDone} />}

      {/*
        Contenedor principal del contenido.
        Empieza con opacity: 0 y se vuelve visible (opacity: 1) una vez
        el loader termina, gracias a la transición CSS de 0.6 s.
      */}
      <div
        className="overflow-hidden"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* ═══════════════════════════════════════════════════════════
            SECCIÓN 1: IMAGEN DE FONDO (HERO) - ESTÁTICA
            Solo la imagen de fondo, sin contenido superpuesto
            ═══════════════════════════════════════════════════════════ */}
        <section className="hero">
          <img
            src="/imagenes/fondo/arquetipofondo.png"
            alt="ARQUETIPO"
            className="hero-image"
          />
        </section>


        {/* ═══════════════════════════════════════════════════════════
            SECCIÓN 2: PRODUCTOS MÁS VENDIDOS
            ═══════════════════════════════════════════════════════════ */}
        <section className="productos-section w-full bg-black py-20">
          <div className="max-w-[1600px] mx-auto px-4 pb-10 sm:px-6 lg:px-8">

            {/* Título de la sección */}
            <h2 className="text-white text-5xl mb-10 justify-center flex max-sm:text-3xl max-md:text-4xl tracking-widest">
              PRODUCTOS MÁS VENDIDOS
            </h2>

            {/* ── Fila 1 ──
                Mientras `loading` es true muestra 4 esqueletos de carga.
                Cuando los datos llegan, renderiza los primeros 4 productos.
            ── */}
            <div className="product-grid">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[520px] animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70 max-sm:h-[380px]"
                    />
                  ))
                : row1.map((producto, idx) => (
                    <ProductCard
                      key={`r1-${producto.id_producto}-${idx}`}
                      producto={producto}
                      hoverImage={hoverUrlFor(producto, idx)}
                      isHovered={hoveredId === producto.id_producto}
                      onMouseEnter={() => setHoveredId(producto.id_producto)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                  ))}
            </div>

            {/* ── Fila 2 ──
                Solo se muestra si hay productos en row2 y la carga terminó.
                La línea divisoria (section-divider) separa visualmente las dos filas.
            ── */}
            {!loading && row2.length > 0 && (
              <>
                {/* Línea decorativa morada entre las dos filas */}
                <div className="section-divider" />
                <div className="product-grid">
                  {row2.map((producto, idx) => (
                    <ProductCard
                      key={`r2-${producto.id_producto}-${idx}`}
                      producto={producto}
                      hoverImage={hoverUrlFor(producto, idx + 4)} // idx + 4 para leer la config correcta
                      isHovered={hoveredId === producto.id_producto}
                      onMouseEnter={() => setHoveredId(producto.id_producto)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── Placeholders de la Fila 2 mientras carga ──
                Se muestra la segunda grilla con esqueletos para que
                el layout no "salte" cuando lleguen los datos reales.
            ── */}
            {loading && (
              <>
                <div className="section-divider" />
                <div className="product-grid">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[520px] animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70 max-sm:h-[380px]"
                    />
                  ))}
                </div>
              </>
            )}

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECCIÓN 3: MÁS DE LA COLECCIÓN
            Mosaico editorial inspirado en la referencia: tamaños variados
            para dar protagonismo a los productos restantes.
            ═══════════════════════════════════════════════════════════ */}
        <section className="w-full bg-black px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 flex flex-col gap-4 border-t border-white/15 pt-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-300">Sigue explorando</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">MÁS DE LA COLECCIÓN</h2>
              </div>
              <Link href="/user" className="text-sm font-semibold text-white/70 transition hover:text-purple-300">
                Ver catálogo completo →
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-5 overflow-hidden">
                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[420px] min-w-[78%] animate-pulse bg-zinc-900 sm:min-w-[42%] lg:min-w-[28%]" />)}
              </div>
            ) : otrosProductos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/50">
                Pronto encontrarás más piezas de la colección.
              </div>
            ) : (
              <div className="relative">
                <div ref={otrosCarruselRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {otrosProductos.map((producto) => <CarouselProductCard key={producto.id_producto} producto={producto} />)}
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" aria-label="Productos anteriores" onClick={() => otrosCarruselRef.current?.scrollBy({ left: -otrosCarruselRef.current.clientWidth * 0.8, behavior: "smooth" })} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl text-white transition hover:border-purple-400 hover:text-purple-300">←</button>
                  <button type="button" aria-label="Más productos" onClick={() => otrosCarruselRef.current?.scrollBy({ left: otrosCarruselRef.current.clientWidth * 0.8, behavior: "smooth" })} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6b2ad4] text-xl text-white transition hover:bg-[#7c3ddd]">→</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Degradado decorativo al final de la página ──
            Crea un efecto de "resplandor" morado que se funde con el fondo negro.
        ─────────────────────────────────────────────────────────── */}
        <div className="relative h-32 w-full overflow-hidden md:h-48">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35),transparent_70%)] blur-2xl md:blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        </div>
      </div>
    </>
  )
}

function CarouselProductCard({ producto }: { producto: ProductoActivo }) {
  return (
    <Link
      href={`/producto/${producto.id_producto}`}
      className="group relative h-[420px] min-w-[78%] snap-start overflow-hidden bg-zinc-900 sm:min-w-[42%] lg:min-w-[28%]"
    >
      <img
        src={producto.imagen_url || "/imagenes/principal/camisa1Ark.png"}
        alt={producto.nombre}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">Arquetipo</p>
            <h3 className="mt-1 text-lg font-bold leading-tight sm:text-xl">{producto.nombre}</h3>
          </div>
          <span className="shrink-0 text-sm font-semibold text-white">{formatCOP(producto.precio)}</span>
        </div>
      </div>
    </Link>
  )
}

// ────────────────────────────────────────────────────────────────
// Componente ProductCard
// ────────────────────────────────────────────────────────────────

/** Props que recibe la tarjeta de producto */
interface ProductCardProps {
  /** Datos completos del producto (nombre, precio, imagen, etc.) */
  producto: ProductoActivo
  /** URL de la imagen que se muestra al pasar el cursor */
  hoverImage: string
  /** Indica si el cursor está actualmente sobre esta tarjeta */
  isHovered: boolean
  /** Callback que se llama cuando el cursor entra a la tarjeta */
  onMouseEnter: () => void
  /** Callback que se llama cuando el cursor sale de la tarjeta */
  onMouseLeave: () => void
}

/**
 * ProductCard
 * ──────────────────────────────────────────────────────────────
 * Tarjeta individual de producto. Al hacer hover:
 * - La imagen alternativa se desliza desde la izquierda (translate-x).
 * - Aparece un degradado oscuro desde abajo que hace visible el texto.
 * - La tarjeta se eleva levemente (hover:-translate-y-1).
 *
 * Al hacer clic navega a la página de detalle del producto (/producto/[id]).
 */
function ProductCard({
  producto,
  hoverImage,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: ProductCardProps) {
  // Imagen principal: usa imagen_url de Supabase o una imagen local por defecto
  const baseImage = producto.imagen_url || "/imagenes/principal/camisa1Ark.png"

  return (
    <Link
      href={`/producto/${producto.id_producto}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group block overflow-hidden border border-white/10 bg-zinc-950/70 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-purple-500/40"
    >
      {/* Contenedor de la imagen con altura responsiva definida en globals.css */}
      <div className="product-card-img">

        {/* Imagen base: siempre visible */}
        <img
          src={baseImage}
          alt={producto.nombre}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/*
          Imagen hover: empieza fuera de la pantalla (-translate-x-full)
          y se desliza a la posición original (translate-x-0) cuando isHovered es true.
          La transición dura 700 ms con easing ease-out para un efecto suave.
        */}
        <img
          src={hoverImage}
          alt={`${producto.nombre} hover`}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out ${
            isHovered ? "translate-x-0" : "-translate-x-full"
          }`}
        />

        {/* Degradado oscuro desde abajo: solo visible al hacer hover (opacity-0 → opacity-100) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

        {/* Información del producto: nombre, descripción y precio */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          <h3 className="mt-3 text-xl sm:text-2xl font-black leading-tight">{producto.nombre}</h3>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-white/70 line-clamp-2">
            {producto.descripcion || "Sin descripción disponible."}
          </p>
          <div className="mt-3 sm:mt-5 flex items-center justify-between gap-3">
            {/* Precio formateado en pesos colombianos */}
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/80">
              {formatCOP(producto.precio)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
