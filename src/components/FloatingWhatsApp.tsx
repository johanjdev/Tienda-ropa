"use client"

import { usePathname } from "next/navigation"

export default function FloatingWhatsApp() {
  const pathname = usePathname()
  
  // Ocultar el botón flotante en la sección de administración
  if (pathname?.startsWith("/admin")) return null

  // Número de WhatsApp (configurable) y mensaje predefinido
  const whatsappNumber = "573001234567" // Reemplazar con el número real del comercio
  const message = encodeURIComponent("¡Hola! Me gustaría recibir información sobre los productos y envíos de Arquetipo.")
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[99] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-[#20ba5a] group"
      aria-label="Contactar por WhatsApp"
    >
      {/* Sombra de pulso animada */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-25 group-hover:hidden" />
      <i className="ri-whatsapp-line text-3xl" />
    </a>
  )
}
