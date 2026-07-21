import Link from "next/link";

function Footer() {
  return (
    <footer className="bg-black text-white px-6 md:px-12 py-8">
      
      {/* CONTENEDOR */}
      <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-zinc-950 min-h-[900px] flex flex-col justify-between">

        {/* TOP */}
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1.2fr] gap-12 p-10 md:p-16 relative z-10">

          {/* DESCRIPCIÓN */}
          <div className="max-w-sm">
            <p className="text-lg leading-relaxed text-white/90">
              Arquetipo es una marca independiente de moda enfocada en diseño contemporáneo y estilo urbano.
            </p>
          </div>

          {/* EXPLORAR */}
          <div className="flex flex-col">
            
            {/* LINEA */}
            <div className="w-full border-t border-white/15 mb-4"></div>

            <h4 className="text-sm uppercase tracking-widest text-white/40 mb-4">
              Explorar
            </h4>

            <div className="w-full border-t border-white/15 mb-4"></div>

            {/* LINKS BAJADOS */}
            <ul className="space-y-8 text-white/80 mt-20">
            

              <li>
                <Link
                  href="/"
                  className="hover:text-white transition"
                >
                  Tienda
                </Link>
              </li>

              <li>
                <Link
                  href="/user"
                  className="hover:text-white transition"
                >
                  Novedades
                </Link>
              </li>

              <li>
                <Link
                  href="/user/contacto"
                  className="hover:text-white transition"
                >
                  Contacto
                </Link>
              </li>

            </ul>
          </div>

          {/* REDES */}
          <div className="flex flex-col">

            {/* LINEA */}
            <div className="w-full border-t border-white/15 mb-4"></div>

            <h4 className="text-sm uppercase tracking-widest text-white/40 mb-4">
              Síguenos
            </h4>

            <div className="w-full border-t border-white/15 mb-4"></div>

            {/* LINKS BAJADOS */}
            <ul className="space-y-8 text-white/80 mt-20">

              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  className="hover:text-white transition"
                >
                  Instagram
                </a>
              </li>

              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  className="hover:text-white transition"
                >
                  TikTok
                </a>
              </li>

            </ul>
          </div>

          {/* CTA */}
          <div className="md:pl-10">

            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-[#6b2ad4] font-semibold text-lg hover:text-purple-300 transition"
            >
              Comprar ahora

              <span className="group-hover:translate-x-1 transition">
                →
              </span>
            </Link>

            <p className="text-white/50 mt-2 text-sm">
              Descubre la nueva colección
            </p>

            <div className="mt-10">

              <Link
                href="/user"
                className="group inline-flex items-center gap-2 font-semibold hover:text-white/80 transition"
              >
                Colecciones

                <span className="group-hover:translate-x-1 transition">
                  →
                </span>
              </Link>

              <p className="text-white/50 mt-2 text-sm leading-relaxed">
                Streetwear / Essentials / Ediciones limitadas
              </p>

            </div>
          </div>
        </div>

        {/* TEXTO GIGANTE */}
        <div className="absolute inset-0 flex items-end justify-center overflow-hidden pointer-events-none z-0">

          <h1
            className="
              text-[120px]
              sm:text-[180px]
              md:text-[240px]
              lg:text-[320px]
              xl:text-[380px]
              font-black
              uppercase
              leading-none
              text-white/[0.05]
              select-none
              tracking-tight
            "
          >
            ARQUETIPO
          </h1>
        </div>

        {/* BOTTOM */}
        <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 bg-zinc-950/90 backdrop-blur-md px-10 md:px-16 py-8 text-sm text-white/40">

          <p>© 2026 Arquetipo</p>

          <div className="flex items-center gap-6">

            <Link
              href="/privacidad"
              className="hover:text-white transition"
            >
              Política de privacidad
            </Link>

            <Link
              href="/terminos"
              className="hover:text-white transition"
            >
              Términos y condiciones
            </Link>

          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;