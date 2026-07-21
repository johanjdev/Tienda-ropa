import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="text-white">
      <section className="relative h-[420px] w-full overflow-hidden">
        <div className="absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-sm uppercase tracking-[6px] text-zinc-300">Moda Urbana</p>
          <h1 className="text-5xl font-extrabold md:text-7xl">Sobre Nosotros</h1>
          <div className="mt-5 flex items-center gap-3 text-sm text-zinc-400"><Link href="/" className="transition hover:text-white">Inicio</Link><span>/</span><span>Sobre Nosotros</span></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative h-[550px] overflow-hidden rounded-3xl"><Image src="/imagenes/about/hoddi2.png" alt="Modelo Streetwear" fill className="object-cover transition duration-700 hover:scale-105" /></div>
          <div><p className="mb-4 text-sm uppercase tracking-[5px] text-zinc-400">Nuestra Marca</p><h2 className="text-4xl font-bold leading-tight md:text-6xl">Moda Inspirada<br />En Las Calles</h2><p className="mt-8 leading-8 text-zinc-400">Somos una marca enfocada en la cultura urbana y el streetwear moderno. Creamos prendas auténticas con diseños oversized, minimalistas y una identidad inspirada en la música, el skate y el arte callejero.</p><p className="mt-5 leading-8 text-zinc-400">Nuestro objetivo es ofrecer ropa que combine estilo, comodidad y personalidad para quienes viven la moda urbana todos los días.</p><Link href="/user" className="mt-10 inline-flex rounded-full bg-[#6b2ad4] px-8 py-4 font-semibold text-white transition hover:scale-110">Explorar Colección</Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-24"><div className="grid gap-20 lg:grid-cols-2"><div><h3 className="mb-10 text-4xl font-bold">¿Por Qué Elegirnos?</h3><div className="space-y-8">{[["Calidad Premium", "95%"], ["Diseño Único", "90%"], ["Cultura Urbana", "88%"]].map(([nombre, valor]) => <div key={nombre}><div className="mb-3 flex justify-between text-sm uppercase tracking-wider"><span>{nombre}</span><span>{valor}</span></div><div className="h-[4px] w-full bg-zinc-800"><div className="h-full bg-white" style={{ width: valor }} /></div></div>)}</div></div><div className="grid grid-cols-2 gap-12">{[["10K+", "Clientes Felices"], ["5+", "Nuevos Lanzamientos"], ["5+", "Años de Experiencia"], ["100%", "Estilo Urbano"]].map(([numero, texto]) => <div key={texto}><h4 className="text-6xl font-extrabold">{numero}</h4><p className="mt-3 text-zinc-400">{texto}</p></div>)}</div></div></section>
      <section className="mx-auto max-w-7xl px-6 pb-24"><div className="relative overflow-hidden rounded-3xl"><Image src="/imagenes/about/pant.jpg" alt="Streetwear CTA" width={1600} height={900} className="h-[400px] w-full object-cover" /><div className="absolute inset-0 bg-black/60" /><div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"><h2 className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">Viste Tu Identidad.<br />Domina Las Calles.</h2><Link href="/" className="mt-10 rounded-full bg-[#6b2ad4] px-8 py-4 font-semibold text-white transition hover:scale-110">Comprar Ahora</Link></div></div></section>
    </main>
  );
}
