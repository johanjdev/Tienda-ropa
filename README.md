# Arquetipo - Tienda de ropa

Proyecto web en Next.js con Supabase para catalogo, carrito, pedidos, autenticacion y panel administrador.

## Cambios realizados

- Se corrigio el cierre de sesion para que Supabase cierre la sesion global y no vuelva a cargar la cuenta al recargar la pagina.
- Se agrego recuperacion de contrasena desde `/login`, enviando un codigo al correo del usuario.
- Se agrego la pagina `/reset-password` para validar el codigo y guardar la nueva contrasena.
- Se mejoro el responsive de la pagina principal con textos fluidos, altura controlada y vitrina visual mas ligera en dispositivos pequenos.
- Se optimizo la pagina principal quitando altura global innecesaria y reduciendo carga visual en movil.
- Se oculto el footer solo dentro del panel `/admin`; en las demas paginas sigue apareciendo.
- Se limpio el menu de Datos quitando tabla pedidos, detalle pedidos, carrito items e inventario.
- Se agrego creacion de roles desde el panel de Usuarios.
- Se agrego soporte para el rol `editor`, orientado a agregar productos y cambiar estados de productos/pedidos.
- Se limito la navegacion del editor a Productos y Pedidos.
- Se agrego cambio de estado en pedidos: `pendiente`, `enviado` y `entregado`.
- Se agrego resumen de producto mas pedido y menos pedido en la pantalla de Pedidos.
- Se actualizo el uso de cupones para validar disponibilidad y descontar un uso al crear el pedido.
- Se mejoraron los placeholders de cupones para porcentaje y uso maximo.

## Recuperacion de contrasena

Desde `/login`, el usuario puede escribir su correo y usar la opcion "Olvide mi contrasena".

Supabase enviara el correo de recuperacion con un codigo. El usuario lo ingresa junto con su correo en:

```txt
/reset-password
```

En **Supabase Auth → Email Templates → Reset Password**, usa `{{ .Token }}` en el contenido
del correo para que el usuario reciba el código de recuperación, en lugar de depender del enlace.

En Supabase Auth revisa que la URL del sitio y las redirect URLs incluyan el dominio local o de produccion, por ejemplo:

```txt
http://localhost:3000/reset-password
```

## Roles

Roles esperados:

- `usuario`: comprador normal.
- `administrador` o `admin`: acceso completo al panel.
- `editor`: acceso limitado a productos y pedidos.

El rol `editor` se puede crear desde:

```txt
/admin/usuarios
```

Luego se asigna a un usuario desde el selector de rol en el listado de usuarios.

## Cupones

El campo `uso_maximo` funciona como cantidad disponible restante.

Ejemplo:

```txt
uso_maximo = 100
```

Cuando un pedido se completa usando ese cupon, el valor baja a `99`.

## Pedidos

En `/admin/pedidos` ahora se puede cambiar el estado del pedido:

- `pendiente`
- `enviado`
- `entregado`

Tambien se muestra:

- Producto mas pedido.
- Producto menos pedido.

## Desarrollo

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Validar el proyecto:

```bash
npm run lint
npm run build
```

## Variables de entorno

El proyecto usa Supabase. Revisa `.env.local`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ORDER_EMAIL_FROM=
```

`SUPABASE_SERVICE_ROLE_KEY` se usa para crear y editar usuarios desde el panel administrador.

Para enviar la actualización de un pedido al comprador configura también `RESEND_API_KEY` y
`ORDER_EMAIL_FROM` (por ejemplo, `Tienda <pedidos@tudominio.com>`). El remitente debe estar
verificado en Resend. Para proteger la eliminación de productos en pedidos en curso, ejecuta en
el SQL Editor de Supabase el archivo `supabase/migrations/20260720_pedidos_envio_y_proteccion.sql`.

## Verificacion

Se ejecuto:

```bash
npm run lint
npm run build
```

Resultado: sin errores. Quedan avisos menores de Next.js sobre configuracion del workspace, middleware y optimizacion de imagenes existentes.

## Arquitectura de Software

La construcción del proyecto se basa en una arquitectura moderna basada en componentes, utilizando el stack Jamstack y un esquema Serverless / BaaS (Backend-as-a-Service):

- **Frontend (Next.js 16 - App Router):**
  - **Enrutamiento Basado en Archivos (File-based Routing):** Definido dentro del directorio [src/app](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/app). Cada ruta corresponde a una carpeta (por ejemplo, `admin`, `cuenta`, `login`, `reset-password`).
  - **Componentes de React:** Divididos entre Server Components (procesados en servidor por defecto para optimización de carga y SEO) y Client Components (marcados con `"use client"` para interacciones interactivas, eventos y estados).
- **Backend-as-a-Service (Supabase):**
  - Integra la base de datos relacional (PostgreSQL), la autenticación de usuarios (Supabase Auth) y las consultas directas utilizando la librería oficial `@supabase/supabase-js`.
- **Middleware:**
  - [src/middleware.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/middleware.ts) actúa como un interceptor a nivel de servidor que valida la sesión del usuario y restringe el acceso a rutas protegidas (`/admin`, `/cuenta`) según los roles asignados.
- **Persistencia en el Cliente:**
  - Uso de APIs nativas del navegador como `localStorage` y `sessionStorage` para mantener el estado persistente del carrito de compras y la sesión de logs temporales del usuario.

## Patrones de Diseño

El código sigue varios patrones de diseño comunes en el ecosistema React/TypeScript:

1. **Provider Pattern (Patrón de Proveedor / Contexto):**
   - Implementado en [AuthProvider.tsx](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/components/AuthProvider.tsx). Utiliza React Context para propagar el estado de autenticación y el perfil de usuario (`user`, `profile`, `loading`) de forma global a toda la aplicación sin necesidad de pasar props manualmente (prop-drilling).
2. **Custom Hook Pattern (Patrón de Hooks Personalizados):**
   - Abstracciones como `useAuth` (en [AuthProvider.tsx](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/components/AuthProvider.tsx)) y [useCartTotalQuantity.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/hooks/useCartTotalQuantity.ts) permiten extraer y encapsular la lógica del ciclo de vida y la sincronización de estado, haciéndolas fácilmente reutilizables en cualquier componente.
3. **Facade Pattern (Patrón de Fachada):**
   - Los módulos dentro de [src/lib](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/lib) (como [supabase.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/lib/supabase.ts), [cart-storage.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/lib/cart-storage.ts), [format.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/lib/format.ts)) ocultan la complejidad de las APIs nativas y de terceros, exponiendo funciones simples y de alta abstracción para ser consumidas en el resto del proyecto.
4. **Observer / Event Emitter Pattern:**
   - En [cart-storage.ts](file:///c:/Users/Aprendiz/Downloads/tienda-ropa/src/lib/cart-storage.ts), al modificarse el carrito en un componente, se dispara un evento personalizado del DOM (`window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))`). Esto permite que otros componentes u hooks (como `useCartTotalQuantity`) escuchen el cambio y actualicen su estado en tiempo real.
5. **Container-Presenter Pattern / Composición de Componentes:**
   - Separación clara entre componentes de diseño y presentación pura (como `Navbar`, `Footer`, `Modal`) de contenedores estructurales con lógica de negocio y carga de datos (`AdminShell`, `AdminSidebar` y las vistas en `src/app`).

## Convenciones de Nomenclatura (Naming Conventions)

El proyecto mantiene una convención uniforme para nombrar archivos, carpetas, variables, funciones y estructuras de datos:

- **Estructura de Carpetas (Routing):**
  - Todas las carpetas de rutas en `src/app` usan minúsculas completas o guiones medios (`kebab-case`), por ejemplo: `reset-password`, `cuenta`, `pedido`.
- **Archivos de Componentes React:**
  - Nombres en `PascalCase` para componentes y proveedores (por ejemplo, `AuthProvider.tsx`, `CursorFollower.tsx`, `AdminSidebar.tsx`).
- **Archivos de Utilidades y Hooks:**
  - Nombres en `kebab-case` o minúsculas para utilidades en `src/lib` (por ejemplo, `cart-storage.ts`, `admin-auth.ts`).
  - Nombres en `camelCase` comenzando con `use` para los hooks (por ejemplo, `useCartTotalQuantity.ts`).
- **Nombres de Clases, Tipos e Interfaces (TypeScript):**
  - Definidos en `PascalCase`, por ejemplo: `CartItem`, `UsuarioPerfil`, `AuthContextValue`.
- **Funciones y Variables:**
  - Declaradas en `camelCase`, por ejemplo: `formatCOP()`, `loadProfile()`, `signOut()`, `productos`, `hoveredId`.
- **Constantes Globales:**
  - Definidas en mayúsculas sostenidas y guiones bajos (`UPPER_SNAKE_CASE`), por ejemplo: `CART_CHANGED_EVENT`, `GUEST_KEY`.
- **Atributos de Datos / Base de Datos:**
  - Los campos de las tablas e interfaces que corresponden directamente a la base de datos de Supabase usan `snake_case`, por ejemplo: `id_producto`, `imagen_url`, `id_usuario`, `auth_id`, `id_rol`.
