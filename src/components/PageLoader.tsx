/**
 * PageLoader.tsx
 * ──────────────────────────────────────────────────────────────
 * Componente de pantalla de carga animada inspirado en el estilo
 * de outfit.hellohello.is. Aparece al entrar a la página principal
 * y desaparece con una animación antes de mostrar el contenido.
 *
 * Flujo general:
 * 1. Se muestran columnas de imágenes del catálogo que suben desde abajo.
 * 2. El nombre ARQUETIPO y un contador de porcentaje aparecen al centro.
 * 3. Una barra de progreso morada crece en la parte inferior.
 * 4. Al llegar al 100%, las columnas suben y desaparecen, luego se llama a `onDone`.
 */

"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Imágenes del catálogo que se usan como mosaico de fondo durante la carga.
 * Agrega o quita rutas según las imágenes disponibles en /public/imagenes/principal/.
 */
const TILE_IMAGES = [
  "/imagenes/principal/camisa1Ark.png",
  "/imagenes/principal/Chaqueta-ark-v1.png",
  "/imagenes/principal/Chaqueta-ark-v2.png",
  "/imagenes/principal/bufanda.png",
  "/imagenes/principal/lanah.png",
  "/imagenes/principal/gorra.png",
  "/imagenes/principal/chaqueta.jpg",
  "/imagenes/principal/araña.png",
]

/** Número de columnas de imágenes que se mostrarán en el loader */
const NUM_COLS = 6

/**
 * buildColumns
 * Distribuye las imágenes en N columnas de forma circular (round-robin).
 * Las imágenes se repiten 3 veces para garantizar que cada columna tenga suficiente contenido.
 *
 * @param images - Lista de rutas de imágenes
 * @param cols   - Número de columnas a crear
 * @returns      - Array de arrays, cada uno con las imágenes de esa columna
 */
function buildColumns(images: string[], cols: number): string[][] {
  const result: string[][] = Array.from({ length: cols }, () => [])
  const extended = [...images, ...images, ...images] // se repite para llenar las columnas
  extended.forEach((img, i) => result[i % cols].push(img))
  return result
}

/** Props del componente PageLoader */
interface PageLoaderProps {
  /** Función que se llama cuando el loader termina su animación de salida */
  onDone: () => void
}

/**
 * PageLoader
 * ──────────────────────────────────────────────────────────────
 * Renderiza la pantalla de carga completa. Se monta sobre el contenido
 * principal (position: fixed, z-index: 9999) y se desmonta al finalizar.
 *
 * Estados internos:
 * - `progress`  → porcentaje actual de carga (0–100), simulado con setInterval
 * - `exiting`   → indica que se activó la animación de salida (columnas subiendo)
 * - `doneRef`   → ref para evitar que la lógica de finalización se ejecute más de una vez
 */
export default function PageLoader({ onDone }: PageLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)
  const doneRef = useRef(false) // bandera para ejecutar la lógica de cierre solo una vez

  /**
   * Simula el progreso de carga con un temporizador.
   * - Duración total: 1800 ms para alcanzar el 100%
   * - Intervalo de actualización: ~16 ms (aprox. 60 fps)
   * Al llegar al 100%, espera 300 ms y luego inicia la animación de salida.
   * Después de 900 ms más, llama a `onDone` para desmontar el loader.
   */
  useEffect(() => {
    let current = 0
    const total = 1800  // milisegundos totales para llegar al 100%
    const interval = 16 // intervalo de actualización en ms

    const timer = setInterval(() => {
      current += interval
      const pct = Math.min(Math.round((current / total) * 100), 100)
      setProgress(pct)

      if (pct >= 100 && !doneRef.current) {
        doneRef.current = true
        clearInterval(timer)

        // Pequeña pausa en 100% antes de iniciar la salida
        setTimeout(() => {
          setExiting(true)
          // Una vez termine la animación de salida, notificar al padre
          setTimeout(() => onDone(), 900)
        }, 300)
      }
    }, interval)

    // Limpieza: cancela el intervalo si el componente se desmonta antes de tiempo
    return () => clearInterval(timer)
  }, [onDone])

  // Construye las columnas de imágenes para el mosaico de fondo
  const columns = buildColumns(TILE_IMAGES, NUM_COLS)

  return (
    <div
      className={`loader-overlay ${exiting ? "loader-exit" : ""}`}
      aria-hidden="true" // oculto a lectores de pantalla; es decorativo
    >
      {/* ── Columnas de imágenes: suben desde abajo al entrar y salen hacia arriba al salir ── */}
      <div className="loader-columns">
        {columns.map((imgs, colIdx) => (
          <div
            key={colIdx}
            className={`loader-column ${exiting ? "loader-column-exit" : ""}`}
            style={{
              // Cada columna tiene un pequeño retraso escalonado para el efecto cascada
              animationDelay: exiting ? `${colIdx * 60}ms` : `${colIdx * 80}ms`,
            }}
          >
            {imgs.map((src, imgIdx) => (
              <div key={imgIdx} className="loader-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" draggable={false} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Capa oscura encima de las columnas para que el texto sea legible ── */}
      <div className="loader-overlay-dark" />

      {/* ── Nombre de la marca y contador de porcentaje ── */}
      <div className="loader-content">
        {/* Nombre de la marca: aparece con fade-in hacia arriba */}
        <div className={`loader-brand ${exiting ? "loader-brand-exit" : ""}`}>
          ARQUETIPO
        </div>
        {/* Contador numérico: muestra el porcentaje actual con números de ancho fijo */}
        <div className={`loader-counter ${exiting ? "loader-counter-exit" : ""}`}>
          {/* padStart con espacio de figura (\u2007) para evitar que el número salte de posición */}
          <span className="loader-pct">{String(progress).padStart(3, "\u2007")}</span>
          <span className="loader-pct-symbol">%</span>
        </div>
      </div>

      {/* ── Barra de progreso morada en la parte inferior de la pantalla ── */}
      <div className="loader-bar">
        <div
          className="loader-bar-fill"
          style={{ width: `${progress}%` }} // el ancho crece con el progreso
        />
      </div>
    </div>
  )
}
