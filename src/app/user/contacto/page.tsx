import Link from "next/link"

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white md:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl bg-gradient-to-br from-purple-700 to-[#17082c] p-8 md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-purple-200">Estamos para ayudarte</p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">Hablemos de tu próximo look.</h1>
          <p className="mt-6 max-w-md text-white/75">Escríbenos sobre tu compra, tallas, envíos o cualquier duda. Te responderemos lo más pronto posible.</p>
          <div className="mt-10 space-y-5 text-sm">
            <p><span className="block text-purple-200">Horario de atención</span>Lunes a sábado · 9:00 a. m. – 6:00 p. m.</p>
            <p><span className="block text-purple-200">Seguimiento de pedidos</span>Consulta el estado y la guía desde <Link href="/cuenta" className="font-semibold underline">Mi cuenta</Link>.</p>
          </div>
        </div>
        <form className="rounded-3xl border border-white/10 bg-zinc-950 p-8 md:p-12" action="mailto:contacto@tienda.com" method="post" encType="text/plain">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Contacto</p>
          <h2 className="mt-3 text-3xl font-black">¿Cómo podemos ayudarte?</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-zinc-300">Nombre<input name="nombre" required className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500" /></label>
            <label className="text-sm text-zinc-300">Correo<input name="correo" type="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500" /></label>
          </div>
          <label className="mt-5 block text-sm text-zinc-300">Asunto<input name="asunto" required className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500" /></label>
          <label className="mt-5 block text-sm text-zinc-300">Mensaje<textarea name="mensaje" required rows={5} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500" /></label>
          <button className="mt-7 rounded-full bg-[#6b2ad4] px-7 py-3 text-sm font-semibold hover:bg-[#7d3be5]">Enviar mensaje</button>
        </form>
      </section>
    </main>
  )
}
