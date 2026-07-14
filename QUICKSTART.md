# Inicio Rapido

## 1. Configura `.env.local`

```env
DATABASE_URL="postgresql://user:password@host:5432/crm_db"
DIRECT_URL="postgresql://user:password@host:5432/crm_db"
NEXTAUTH_SECRET="clave-larga-y-segura"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Si quieres proteger el alta inicial del primer super admin:

```env
INITIAL_SUPER_ADMIN_SETUP_TOKEN="token-inicial"
```

## 2. Ejecuta migraciones

```bash
npx prisma migrate dev
```

## 3. Inicia la app

```bash
npm run dev
```

## 4. Crea el primer usuario

Abre `http://localhost:3000/auth/register`.

Importante:

- esta pantalla solo sirve para crear el primer `SUPER_ADMIN`
- si ya existe un usuario, el registro directo queda bloqueado
- el resto de usuarios se crean desde `Gestion de Usuario`

## 5. Accede al dashboard

- `http://localhost:3000/auth/login`
- `http://localhost:3000/dashboard`

## Funcionalidades disponibles

- contratos con filtros avanzados
- documentos adjuntos
- historial de interacciones
- historial de estados
- consentimientos por email con PDF
- exportacion de contratos para `SUPER_ADMIN`
- gestion de usuarios y reseteo de contrasenas

## Roles reales

- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `USER`

No existe ya el rol `ADMIN`.

## Comandos utiles

```bash
npm run dev
npm run lint
npm run typecheck
npx prisma studio
node scripts/upsert-super-admin.cjs
node scripts/enrich-imported-postal-data.cjs
```
