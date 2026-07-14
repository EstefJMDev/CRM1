# CRM Gestion de Contratos

Aplicacion interna para gestionar contratos, usuarios, documentos y consentimientos, construida con `Next.js`, `TypeScript`, `Prisma` y `PostgreSQL`.

## Estado actual

El repositorio ya no corresponde al MVP inicial que aparece en algunos textos antiguos. El estado real del proyecto incluye:

- autenticacion propia con JWT en cookie `httpOnly`
- roles `SUPER_ADMIN`, `TENANT_ADMIN` y `USER`
- alta inicial controlada del primer `SUPER_ADMIN`
- gestion completa de contratos con filtros, historial e interacciones
- subida de documentos protegidos mediante rutas autenticadas
- solicitudes de consentimiento por email con aprobacion publica y PDF
- exportacion de contratos a Excel
- autocompletado de municipio y provincia por codigo postal
- panel de ajustes y gestion de usuarios

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `@vercel/blob` para almacenamiento de documentos
- `puppeteer` para renderizar los PDFs de consentimiento desde HTML/CSS
- `geonames-postalcodes` para lookup postal

## Estructura principal

```text
crm-main/
|-- app/
|   |-- api/                     # Auth, contratos, usuarios, consentimientos, documentos
|   |-- auth/                    # Login y bootstrap inicial del primer super admin
|   |-- consent/                 # Vista publica para aceptar consentimientos
|   `-- dashboard/               # Panel principal y vistas de gestion
|-- components/                  # Formularios reutilizables
|-- hooks/                       # Estado cliente y sesion
|-- lib/                         # Auth, session, contratos, consentimientos y utilidades
|-- prisma/                      # Schema y migraciones
|-- scripts/                     # Scripts operativos y mantenimiento
`-- data/ES/                     # Dataset postal usado por el lookup
```

## Variables de entorno

Configura al menos estas variables en `.env.local`:

```env
DATABASE_URL="postgresql://user:password@host:5432/crm_db"
DIRECT_URL="postgresql://user:password@host:5432/crm_db"
NEXTAUTH_SECRET="clave-larga-y-segura"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Opcional: bloquear el alta inicial del primer super admin
INITIAL_SUPER_ADMIN_SETUP_TOKEN="token-inicial"

# Opcional: correo de consentimientos
RESEND_API_KEY="re_xxx"
CONSENT_FROM_EMAIL="noreply@tu-dominio.com"
CONSENT_OWNER_NAME="Nombre o razon social"
CONSENT_OWNER_DOCUMENT_ID="CIF/NIF"
CONSENT_OWNER_ADDRESS="Direccion fiscal"
CONSENT_OWNER_PHONE="Telefono"
CONSENT_OWNER_EMAIL="correo@tu-dominio.com"
CONSENT_SIGNATURE_LOCATION="Murcia"
PUPPETEER_EXECUTABLE_PATH=""

# Opcional: Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"
```

## Puesta en marcha

```bash
npm install
npx prisma migrate dev
npm run dev
```

La aplicacion quedara disponible en `http://localhost:3000`.

## Autenticacion y roles

La sesion se guarda en cookie segura `httpOnly`; no se usa `localStorage` para almacenar el token.

Roles disponibles:

- `SUPER_ADMIN`: administracion global, exportacion, alta y gestion de usuarios, borrado de contratos
- `TENANT_ADMIN`: acceso ampliado de lectura y gestion de contratos
- `USER`: acceso a sus propios contratos y consentimientos

El registro abierto solo sirve para crear el primer `SUPER_ADMIN`. Una vez existe un usuario, las nuevas altas se hacen desde el panel de gestion de usuarios.

## Funcionalidades principales

- listado de contratos con filtros, orden y preferencias persistidas
- alta, edicion y detalle completo de contratos
- historial de estados e interacciones
- subida y descarga protegida de documentos
- envio y seguimiento de consentimientos
- historico de consentimientos aprobados, pendientes e invalidados
- exportacion a Excel para `SUPER_ADMIN`
- gestion de perfil, cambio de contrasena y administracion de usuarios

## Scripts

- `scripts/upsert-super-admin.cjs`
  Crea o actualiza un `SUPER_ADMIN`. Usa variables de entorno en lugar de credenciales hardcodeadas.

- `scripts/enrich-imported-postal-data.cjs`
  Completa `municipality` y `province` en contratos importados a partir del codigo postal.

## Verificacion rapida

```bash
npm run lint
npm run typecheck
```

## Notas

- Parte de la documentacion antigua del proyecto describia el MVP inicial. Este README refleja el estado real actual del repositorio.
- Los documentos subidos se almacenan en Vercel Blob, pero siempre se sirven mediante rutas protegidas del CRM.
