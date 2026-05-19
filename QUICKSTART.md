# 🚀 CRM Gestión de Contratos - Inicio Rápido

Hola 👋, tu CRM está listo. Aquí está todo lo que necesitas hacer para empezar:

## ⚡ En 5 Minutos

### 1. Configurar Base de Datos

**Opción 1: Supabase (Recomendado - Sin instalar nada)**
```
1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Nuevo proyecto → copia la Connection String
4. Pega en .env.local: DATABASE_URL="tu_string"
```

**Opción 2: PostgreSQL Local**
```bash
# Mac/Linux
brew install postgresql
brew services start postgresql
createdb crm_db

# Windows: Descarga desde postgresql.org
# Luego: postgres://postgres:tu_contraseña@localhost:5432/crm_db
```

### 2. Actualizar .env.local

Edita el archivo `.env.local`:

```env
# Reemplaza con tu conexión
DATABASE_URL="postgresql://user:password@host:5432/crm_db"

# Genera una clave segura:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET="tu-clave-aleatoria-aqui"

# Mantén estos iguales en desarrollo
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 3. Crear Base de Datos

```bash
npx prisma migrate dev --name init
```

Esto crea todas las tablas automáticamente. ✨

### 4. Iniciar Servidor

```bash
npm run dev
```

Abre http://localhost:3000

### 5. Crear Primer Usuario

1. Haz clic en "Registrarse"
2. Completa el formulario
3. ¡Listo! Accede a tu CRM

## 🎯 Funcionalidades Principales

✅ **Dashboard** - Listado de contratos con búsqueda y filtros  
✅ **Nuevo Contrato** - Formulario completo con 50+ campos  
✅ **Detalle** - Ver toda la información de un contrato  
✅ **Interacciones** - Registra llamadas, emails, visitas  
✅ **Control de Acceso** - Usuarios ven solo sus contratos, admins ven todos  

## 👥 Usuarios de Ejemplo

**Usuario Normal** (auto-creado al registrarse)
- Email: usuario@example.com
- Ve solo sus contratos

**Usuario Admin** (para hacerlo)
```bash
npx prisma studio
# Ve a tabla users → edita role a ADMIN
```

## 🗂️ Estructura de Archivos

```
crm/
├── app/
│   ├── api/                # Endpoints de API
│   │   ├── auth/          # Login, registro
│   │   └── contracts/     # CRUD de contratos
│   ├── auth/              # Páginas de login/registro
│   ├── dashboard/         # Panel principal y formularios
│   └── page.tsx           # Home
├── lib/
│   ├── db.ts              # Conexión a BD
│   └── auth.ts            # Funciones de auth
├── prisma/
│   └── schema.prisma      # Modelo de datos
├── .env.local             # Variables de entorno
├── package.json           # Dependencias
└── README.md              # Documentación completa
```

## 🔍 Campos del Contrato

El formulario incluye:

**Cliente:**
- Nombre, tipo (doméstico/comercial)
- DNI, teléfono, email, SMS, IBAN

**Contrato:**
- Nº Contrato, tipo suministro (luz/gas)
- Comercializadora, CUPS, tarifa

**Dirección:**
- Dirección completa, código postal
- Municipio, provincia

**Seguimiento:**
- Estado (activo/pendiente/inactivo)
- Observaciones
- Interacciones (llamadas, emails, visitas)

## 📝 API Endpoints

```
POST   /api/auth/login                    # Inicia sesión
POST   /api/auth/register                 # Crea usuario
GET    /api/contracts                     # Listar contratos
POST   /api/contracts                     # Crear contrato
GET    /api/contracts/[id]                # Ver detalles
PUT    /api/contracts/[id]                # Actualizar
DELETE /api/contracts/[id]                # Eliminar
POST   /api/contracts/[id]/interactions   # Agregar interacción
```

## 🆘 Si Algo No Funciona

1. **"Error de conexión a BD"**
   - ✅ ¿PostgreSQL está corriendo?
   - ✅ ¿DATABASE_URL es correcto?

2. **"No puedo registrarme"**
   - ✅ ¿El email ya existe?
   - ✅ Usa otro email de prueba

3. **"No veo contratos"**
   - ✅ Crea un contrato primero
   - ✅ Verifica que estés logueado (F12 → Storage → token)

4. **"Necesito hacer un usuario admin"**
   ```bash
   npx prisma studio
   # Ve a tabla users → edita el que quieras
   ```

## 📚 Documentación Completa

- [SETUP.md](./SETUP.md) - Guía detallada de configuración
- [README.md](./README.md) - Documentación completa
- Prisma Docs: https://www.prisma.io/docs/

## 💡 Tips

- Los tokens expiran en 24 horas
- Las contraseñas se hashean automáticamente
- Usa Prisma Studio (`npx prisma studio`) para ver datos
- El token se guarda en localStorage

## 🚀 Próximos Pasos

1. ✅ Configurar base de datos
2. ✅ Iniciar servidor
3. ✅ Crear usuario
4. ✅ Crear contrato de prueba
5. ✅ Agregar interacción
6. Invitar otros usuarios
7. Configurar backup automático

## 🎉 ¡Todo Listo!

Tu CRM está completo y listo para usar. Si tienes dudas, revisa los archivos de documentación incluidos.

**Comandos rápidos:**
```bash
npm run dev          # Iniciar servidor
npm run build        # Build para producción
npm run lint         # Verificar código
npx prisma migrate dev --name mi-migracion  # Nueva migración
npx prisma studio   # Ver BD visualmente
npx prisma db reset # Resetear BD (⚠️ elimina datos)
```

¡A trabajar! 💪
