# Guia de Configuracion

## Base de datos

El proyecto usa `PostgreSQL` con `Prisma`.

Opciones recomendadas:

- PostgreSQL local
- Supabase

Ejemplo de conexion:

```env
DATABASE_URL="postgresql://user:password@host:5432/crm_db"
DIRECT_URL="postgresql://user:password@host:5432/crm_db"
```

## Variables de entorno minimas

```env
NEXTAUTH_SECRET="clave-larga-y-segura"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Genera un secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migraciones

```bash
npx prisma migrate dev
```

Esto:

- aplica migraciones
- genera el cliente Prisma
- deja la BD alineada con el schema actual

## Primer acceso

1. Ve a `http://localhost:3000/auth/register`
2. Crea el primer `SUPER_ADMIN`
3. A partir de ese momento el registro directo queda deshabilitado

Si defines `INITIAL_SUPER_ADMIN_SETUP_TOKEN`, el formulario inicial exigira ese token.

## Gestion de usuarios

Una vez dentro:

- `SUPER_ADMIN` puede crear usuarios
- puede asignar `TENANT_ADMIN` o `USER`
- puede desactivar usuarios
- puede resetear contrasenas temporales

## Consentimientos

Para habilitar el envio de emails de consentimiento:

```env
RESEND_API_KEY="re_xxx"
CONSENT_FROM_EMAIL="noreply@tu-dominio.com"
CONSENT_OWNER_NAME="Nombre o razon social"
CONSENT_OWNER_DOCUMENT_ID="CIF/NIF"
CONSENT_OWNER_ADDRESS="Direccion fiscal"
CONSENT_OWNER_PHONE="Telefono"
CONSENT_OWNER_EMAIL="correo@tu-dominio.com"
CONSENT_SIGNATURE_LOCATION="Murcia"
```

## Documentos

Para almacenar documentos en Vercel Blob:

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"
```

Los documentos no se exponen directamente en el listado: se sirven a traves de rutas autenticadas del CRM.

## Verificacion

```bash
npm run lint
npm run typecheck
```

## Solucion de problemas

### No puedo registrarme

- si ya existe un usuario, el registro directo esta bloqueado por diseno
- crea nuevos usuarios desde el panel de gestion
- si es el alta inicial y usas token, revisa `INITIAL_SUPER_ADMIN_SETUP_TOKEN`

### No inicia sesion

- revisa `NEXTAUTH_SECRET`
- comprueba que la BD esta accesible
- verifica que el usuario este activo

### No se envian consentimientos

- revisa `RESEND_API_KEY`
- revisa `CONSENT_FROM_EMAIL`
- comprueba que el contrato tenga `clientEmail`

### No se suben documentos

- revisa `BLOB_READ_WRITE_TOKEN`
- el limite actual por archivo es 10 MB
- algunos tipos potencialmente peligrosos estan bloqueados
