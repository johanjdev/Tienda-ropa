"use client"

import { useEffect } from "react"

type ModalVariant = "info" | "success" | "error"

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  variant?: ModalVariant
  /** Etiqueta del botón principal (si no pasas `footer`) */
  confirmLabel?: string
  /** Si se pasa, sustituye la fila de botones por defecto */
  footer?: React.ReactNode
}

const borderByVariant: Record<ModalVariant, string> = {
  info: "border-white/20",
  success: "border-emerald-500/40",
  error: "border-red-500/40",
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  variant = "info",
  confirmLabel = "Aceptar",
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={`relative z-[101] w-full max-w-md rounded-2xl bg-zinc-950 p-6 shadow-2xl border ${borderByVariant[variant]}`}
      >
        {title && (
          <h2 id="modal-title" className="text-lg font-semibold text-white mb-3">
            {title}
          </h2>
        )}
        <div className="text-white/85 text-sm leading-relaxed mb-6">{children}</div>
        {footer !== undefined ? (
          footer
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#6b2ad4] px-5 py-2 text-sm font-medium text-white hover:bg-[#580096] transition"
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
