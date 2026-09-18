"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useRef, useState } from "react"

/**
 * HeroGallery
 * ──────────────────────────────────────────────────────────────
 * Scroll horizontal cinematográfico con tarjetas independientes:
 * - Cada imagen está dentro de una tarjeta con border-radius pronunciado y separación (gap).
 * - En Desktop: se desplaza horizontalmente al hacer scroll vertical.
 * - En Mobile: muestra únicamente la imagen principal en un contenedor estilizado.
 */

const slides = [
  {
    id: 1,
    image: "/imagenes/fondo/modelo3.png",
    label: "Arquetipo",
    subtitle: "Colección Principal",
    accent: "#a855f7", // purple-500
    isHero: true,
  },
  {
    id: 2,
    image: "/imagenes/fondo/imagenmodelobufanda.jpg",
    label: "Bufanda Arquetipo",
    subtitle: "Tejido artesanal",
    accent: "#c084fc", // purple-400
  },
  {
    id: 3,
    image: "/imagenes/fondo/modelocamis.jpg",
    label: "Camiseta 00",
    subtitle: "Streetwear Premium",
    accent: "#e879f9", // fuchsia-400
  },
]

export default function HeroGallery() {
  const containerRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [maxScroll, setMaxScroll] = useState(0)

  // Detección de vista móvil
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Cálculo de la distancia exacta para que el scroll vaya de la 1ª a la última tarjeta centrada
  useEffect(() => {
    if (isMobile) return

    const updateDistance = () => {
      if (galleryRef.current) {
        const scrollWidth = galleryRef.current.scrollWidth
        const clientWidth = window.innerWidth
        const totalDist = scrollWidth - clientWidth
        setMaxScroll(Math.max(0, totalDist))
      }
    }

    updateDistance()
    // Pequeño retardo para asegurar que las fuentes/imágenes se calcularon
    const timer = setTimeout(updateDistance, 150)
    window.addEventListener("resize", updateDistance)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updateDistance)
    }
  }, [isMobile])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // Transformación horizontal
  const x = useTransform(scrollYProgress, [0, 1], [0, -maxScroll])

  /* ── VISTA MÓVIL: Imagen de Arquetipo en contenedor estilizado con border-radius ── */
  if (isMobile) {
    return (
      <section className="w-full bg-black px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-2xl shadow-purple-950/20">
          <img
            src="/imagenes/fondo/arquetipofondo.png"
            alt="ARQUETIPO"
            className="w-full h-auto object-cover"
          />
        </div>
      </section>
    )
  }

  /* ── VISTA ESCRITORIO: Scroll horizontal con tarjetas y border-radius ── */
  return (
    <div
      ref={containerRef}
      style={{ height: `${slides.length * 110}vh` }}
      className="relative bg-black"
    >
      {/* Contenedor Sticky a pantalla completa */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center">
        
        {/* Pista de tarjetas con motion */}
        <motion.div
          ref={galleryRef}
          className="flex items-center gap-8 md:gap-12 pl-[10vw] pr-[10vw] will-change-transform"
          style={{ x }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="relative flex-shrink-0 w-[75vw] max-w-[880px] h-[68vh] min-h-[440px] max-h-[640px] rounded-[2.5rem] border border-white/12 bg-zinc-950 shadow-2xl shadow-black/80 overflow-hidden group"
            >
              {/* Imagen con zoom suave en hover */}
              <img
                src={slide.image}
                alt={slide.label}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />

              {/* Degradado para legibilidad */}
              <div
                className={`absolute inset-0 ${
                  slide.isHero
                    ? "bg-gradient-to-t from-black/60 via-transparent to-black/20"
                    : "bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                }`}
              />

              {/* Contenido en la tarjeta */}
              {slide.isHero ? (
                /* Contenido de la primera tarjeta (Hero) */
                <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-white/50">
                      01 / 0{slides.length}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-300 font-semibold mb-1">
                        Nueva Colección
                      </p>
                      <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                        ARQUETIPO
                      </h2>
                    </div>
                  </div>
                </div>
              ) : (
                /* Contenido de las tarjetas de catálogo/lookbook */
                <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12">
                  <div className="flex justify-between items-center">
                    <span
                      className="rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] backdrop-blur-md"
                      style={{
                        backgroundColor: `${slide.accent}20`,
                        color: slide.accent,
                        border: `1px solid ${slide.accent}40`,
                      }}
                    >
                      {slide.subtitle}
                    </span>
                    <span className="font-mono text-xs text-white/50">
                      0{slide.id} / 0{slides.length}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
                      {slide.label}
                    </h2>
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Barra de progreso inferior */}
        <div className="absolute bottom-6 left-[10vw] right-[10vw] h-[2px] rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-purple-600 to-fuchsia-500"
            style={{ scaleX: scrollYProgress }}
          />
        </div>
      </div>
    </div>
  )
}
