# TextilEnlace

Sitio para conectar a quien necesita impresión textil con talleres chicos y medianos de Monterrey y su área metropolitana. La persona describe el encargo, ve qué proceso suele usarse y envía la misma solicitud a uno o varios talleres. Cada taller cotiza por su cuenta.

El sistema no calcula, compara ni guarda precios.

## Qué incluye

- Recorrido de quien encarga, sin cuenta: prenda, cantidad, diseño, tela, fecha, zona, nota y contacto.
- Orientación en texto, guardada como contenido en la base, no como una tarifa.
- Lista de talleres participantes y envío de la misma solicitud por WhatsApp o para copiar.
- Folio para volver a abrir la conexión. No contiene un monto.
- Cuenta del taller: ficha, procesos, prendas y solicitudes en las que fue elegido.
- Manual de quien encarga y manual del taller, dentro del sitio.
- Separador: serigrafía con capas y receta, vinil textil en DXF, y sublimación en espejo. La serigrafía se usa sola o adjunta a una solicitud. No calcula un precio.

## Requisitos

- [Node.js](https://nodejs.org/) 22 o más reciente, y npm, para correr el sitio fuera de Docker.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) si vas a usar el entorno de desarrollo con contenedores.
- Para publicar: una cuenta de [Vercel](https://vercel.com/) para el sitio y un proyecto de [Supabase](https://supabase.com/) para PostgreSQL.

Docker es solo para desarrollo. En producción el sitio y la base se publican por separado.

## Variables de entorno

Copia el ejemplo y edítalo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de la aplicación. En local puede ser la de Docker. En Supabase usa el pooler, puerto 6543, con `?pgbouncer=true`. |
| `DIRECT_URL` | Conexión directa para migraciones. En local es igual a `DATABASE_URL`. En Supabase usa el puerto 5432. |
| `AUTH_SECRET` | Firma la sesión del taller. Mínimo 16 caracteres. Usa un valor distinto en Vercel. |
| `NEXT_PUBLIC_APP_URL` | URL pública. En local, `http://localhost:3000`. |

No pongas estas variables en el navegador, salvo `NEXT_PUBLIC_APP_URL`. La aplicación habla con Postgres desde el servidor de Next.js. No usa la clave anónima de Supabase.

## Opción A. Todo el desarrollo con Docker

Desde la carpeta del proyecto:

```bash
docker compose up --build
```

Eso levanta PostgreSQL y el sitio en modo desarrollo. La primera vez instala dependencias, aplica migraciones y carga los talleres de prueba. Abre [http://localhost:3000](http://localhost:3000).

Para detenerlo: `Ctrl+C` y luego `docker compose down`. Los datos de Postgres se conservan en un volumen. `docker compose down -v` borra ese volumen.

## Opción B. Solo la base en Docker y el sitio en tu máquina

Útil si quieres el recargado rápido de Next.js fuera del contenedor.

```bash
docker compose up db
```

En otra terminal:

```bash
npm install
copy .env.example .env
npx prisma generate
npm run db:setup
npm run dev
```

`npm run db:setup` aplica las migraciones y carga los datos de prueba. El sitio queda en [http://localhost:3000](http://localhost:3000).

Si el puerto 5432 ya está ocupado, cambia el mapeo `"5432:5432"` en `docker-compose.yml` y el puerto de `DATABASE_URL` y `DIRECT_URL`.

## Opción C. Sitio local y base en Supabase

1. Crea un proyecto en Supabase.
2. En Database settings copia la cadena directa y la del pooler.
3. En `.env`:

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
AUTH_SECRET="una-clave-larga-y-distinta"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Desde tu máquina, con esa `.env`:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

`db:seed` carga talleres de demostración. En una base real puedes no correrlo y registrar los talleres desde el sitio.

## Publicar cada servicio por separado

### Base de datos en Supabase

1. Crea el proyecto de Postgres.
2. En tu máquina, con `DIRECT_URL` apuntando a Supabase, corre `npx prisma migrate deploy`.
3. No hace falta desplegar un contenedor de la base.

La aplicación usa el usuario de Postgres de esa cadena. No actives políticas que le cierren el paso a ese usuario, porque Prisma no entra por la API anónima.

### Sitio en Vercel

1. Importa el repositorio en Vercel. El framework es Next.js.
2. Configura las mismas variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` y `NEXT_PUBLIC_APP_URL` con la URL de Vercel.
3. El comando de build del proyecto ya ejecuta `prisma generate` antes de `next build`.
4. Publica. Vercel no usa el `docker-compose.yml`.

El sitio y la base quedan independientes: puedes cambiar uno sin reconstruir el otro. Corregir un texto de orientación o la ficha de un taller es un dato, no un despliegue.

## Uso

### Quien encarga

1. Abre el inicio y entra a **Describir mi encargo**. No hay registro.
2. Indica prenda, cantidad, tela, diseño, fecha, zona y contacto.
3. Lee la orientación. En esa pantalla no hay precio.
4. Elige uno o varios talleres. Si quieres otro proceso, abre la lista completa.
5. Envía. Obtienes un folio, un enlace de WhatsApp por taller y la opción de copiar el mismo texto.
6. Vuelve a abrir el folio con el enlace. Muestra a quién se conectó y no muestra un monto.

El manual está en `/manual`.

Si el logo ya está, ábrelo en **Separar tintas** (`/separar`) o adjúntalo en el paso del diseño. En serigrafía, uno a seis colores sólidos produce las capas y la receta. Si hay más de seis tintas, se separa en cuatricromía. El ZIP incluye `capas.psd` para abrirlo en Photoshop. Vinil textil entrega un DXF por color, y solo si el diseño es de colores sólidos. Sublimación entrega la imagen en cuatricromía y en espejo. Una foto no produce capas ni corte, y la orientación pasa a DTF o DTG. El folio guarda las capas de serigrafía y sigue sin un monto.

El manual del logo está en `/manual/separador`. Hay dos archivos de prueba en `/ejemplos/logo-tintas.svg` y `/ejemplos/degradado.svg`.

### Taller

1. Entra a **Publicar mi ficha** (`/taller/registro`) o a **Soy taller**.
2. Publica procesos, prendas, zona, contacto y una frase. No hay campo de precio.
3. En **Solicitudes** aparecen solo los encargos en los que el taller fue elegido, con el contacto.
4. Desde ahí se abre el chat o se copia la solicitud. La cotización se acuerda fuera del sitio.

El manual está en `/manual/taller`. La receta de malla, pasadas y nombres de tinta se guarda en **Receta** (`/taller/receta`). El manual de esa receta está en `/manual/separador/taller`.

## Cuentas de demostración

La semilla crea seis talleres ficticios. Cubren serigrafía, DTF, DTG, sublimación y vinil. No son talleres reales: los teléfonos son `81 0000 0001` a `81 0000 0006`.

Contraseña de todas: `TextilEnlace.demo`

| Taller | Correo | Zona |
| --- | --- | --- |
| Taller Norte | norte@demo.textilenlace.mx | Monterrey |
| Impresos Regina | regina@demo.textilenlace.mx | Guadalupe |
| DTF Obispado | obispado@demo.textilenlace.mx | Monterrey |
| Sublima Cumbres | cumbres@demo.textilenlace.mx | Monterrey |
| Vinilos San Nicolás | sannicolas@demo.textilenlace.mx | San Nicolás de los Garza |
| Taller del Parque | apodaca@demo.textilenlace.mx | Apodaca |

Cada `npm run db:seed`, y cada arranque con Docker, vuelve a dejar estas fichas y esta contraseña. No borra las solicitudes ya enviadas.

Los textos de orientación viven en la tabla `OrientationRule`. Cambiar un umbral o una frase es editar ese contenido. El número de “pocas piezas” de la semilla es 12.

## Comandos

```bash
npm run dev          # sitio en desarrollo
npm run db:setup     # migrar y sembrar
npm run db:studio    # visor de Prisma
npm test             # orientación y ausencia de campos de precio
npm run lint
npm run build
```

## Estructura

```text
app/                páginas y acciones de servidor
components/         interfaz
lib/                sesión, orientación, separador, mensajes y consultas
prisma/             esquema, migración y semilla
docker-compose.yml  Postgres y Next.js de desarrollo
```

## Lo que esta versión no hace

No guarda tarifas, márgenes ni totales. No cobra, no factura y no produce la prenda. No pone reseñas ni lugares pagados. No rechaza una combinación de prenda y proceso. El registro es solo para tamaño chico o mediano, en Monterrey y su área.

Las tintas planas no llevan trama. Arriba de seis tintas la cuatricromía sí: trama de semitonos. El separador no hace choke distinto por color, RIP ni tiempos de horno. La película se imprime con el equipo del taller.

