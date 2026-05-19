# CRM - Gestión de Contratos

Un sistema de gestión de contratos construido con **Next.js**, **TypeScript**, **Prisma** y **PostgreSQL**.

## 🚀 Características

✅ **Autenticación de usuarios** con roles (Admin, Usuario)  
✅ **Gestión de contratos** - Crear, editar, ver detalles  
✅ **Control de acceso** - Admins ven todos los contratos, usuarios ven solo los suyos  
✅ **Seguimiento de interacciones** - Registra llamadas, emails, visitas  
✅ **Búsqueda y filtros** - Por cliente, número de contrato, estado  
✅ **Información detallada** - Cliente, dirección, comercializadora, etc.  

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT
- **TypeScript**: Para seguridad de tipos

## 📋 Prerequisitos

- Node.js 18+
- npm o yarn
- PostgreSQL 12+ (local o Supabase)

## 🔧 Instalación

1. **Instalar dependencias** (ya hecho)
```bash
npm install
```

2. **Configurar variables de entorno**

Edita `.env.local` con tus credenciales de PostgreSQL:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/crm_db"
NEXTAUTH_SECRET="tu-secret-seguro"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Crear la base de datos y migraciones**
```bash
npx prisma migrate dev --name init
```

4. **Ejecutar servidor de desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📚 Estructura del Proyecto

```
crm/
├── app/
│   ├── api/                    # API Routes
│   ├── auth/                  # Páginas de autenticación
│   ├── dashboard/             # Páginas principales
│   ├── layout.tsx
│   └── page.tsx              # Home
├── lib/
│   ├── auth.ts               # Funciones de autenticación
│   └── db.ts                 # Instancia de Prisma
├── prisma/
│   └── schema.prisma         # Esquema de base de datos
└── package.json
```

## 🚀 Iniciar Desarrollo

```bash
npm run dev
```

Accede a:
- Dashboard: http://localhost:3000 (redirige a login si no estás autenticado)
- Login: http://localhost:3000/auth/login
- Registro: http://localhost:3000/auth/register

## 📝 Próximos Pasos

1. **Configura tu base de datos PostgreSQL**
2. **Ejecuta las migraciones de Prisma**
3. **Registra tu primer usuario**
4. **Crea contratos de prueba**
5. **Prueba la funcionalidad**

¡Listo para usar!

